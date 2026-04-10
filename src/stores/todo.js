import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

const STORAGE_KEY = "project2-todo-items";
const DETAIL_VISIBLE_KEY = "project2-todo-desc-visible";
const SORT_BY_KEY = "project2-todo-sort-by";
const SORT_ORDER_KEY = "project2-todo-sort-order";
const FILTER_STATUS_KEY = "project2-todo-filter-status";
const FILTER_PRIORITY_KEY = "project2-todo-filter-priority";
const PRIORITIES = ["high", "medium", "low"];

function inferCreatedFromId(id) {
  const prefix = String(id || "").split("-")[0];
  const value = Number(prefix);
  return Number.isFinite(value) && value > 946684800000 ? value : null;
}

function normalizeTask(raw) {
  if (!raw || typeof raw.id !== "string" || typeof raw.done !== "boolean") {
    return null;
  }
  const legacy = typeof raw.text === "string" ? raw.text : "";
  const titleRaw = typeof raw.title === "string" ? raw.title : legacy;
  const title = titleRaw.trim();
  if (!title) return null;

  let createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : inferCreatedFromId(raw.id);
  if (createdAt == null) createdAt = Date.now();

  let completedAt =
    typeof raw.completedAt === "number" && Number.isFinite(raw.completedAt)
      ? raw.completedAt
      : null;
  if (!raw.done) completedAt = null;

  return {
    id: raw.id,
    title,
    description: typeof raw.description === "string" ? raw.description : "",
    done: raw.done,
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : "medium",
    createdAt,
    completedAt,
  };
}

function hydrateTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTask).filter(Boolean);
  } catch {
    return [];
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useTodoStore = defineStore("todo", () => {
  const tasks = ref(hydrateTasks());
  const showDetails = useStorage(DETAIL_VISIBLE_KEY, false, localStorage, {
    serializer: {
      read: (v) => v === "1",
      write: (v) => (v ? "1" : "0"),
    },
  });
  const editingId = ref(null);
  const sortBy = useStorage(SORT_BY_KEY, "createdAt", localStorage);
  const sortOrder = useStorage(SORT_ORDER_KEY, "desc", localStorage);
  const filterStatus = useStorage(FILTER_STATUS_KEY, "all", localStorage);
  const filterPriority = useStorage(FILTER_PRIORITY_KEY, "all", localStorage);

  const sortedTasks = computed(() => {
    const status = filterStatus.value;
    const pri = filterPriority.value;

    const filtered = tasks.value.filter((t) => {
      if (status === "pending" && t.done) return false;
      if (status === "done" && !t.done) return false;
      if (pri !== "all" && pri !== "" && t.priority !== pri) return false;
      return true;
    });

    const list = [...filtered];
    const by = sortBy.value === "default" || sortBy.value === "" ? "createdAt" : sortBy.value;
    const desc = sortOrder.value === "desc";

    const cmpCreated = (a, b) =>
      desc ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;

    const cmpCompleted = (a, b) => {
      const ac = a.completedAt;
      const bc = b.completedAt;
      const aHas = ac != null && Number.isFinite(ac);
      const bHas = bc != null && Number.isFinite(bc);
      if (!aHas && !bHas) return cmpCreated(a, b);
      if (!aHas) return 1;
      if (!bHas) return -1;
      return desc ? bc - ac : ac - bc;
    };

    if (by === "createdAt") {
      return list.sort(cmpCreated);
    }
    if (by === "completedAt") {
      return list.sort(cmpCompleted);
    }
    return list;
  });

  watch(
    tasks,
    (value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    },
    { deep: true }
  );

  const pendingCount = computed(() => tasks.value.filter((t) => !t.done).length);
  const doneCount = computed(() => tasks.value.length - pendingCount.value);
  const hasTasks = computed(() => tasks.value.length > 0);

  function addTask(payload) {
    const title = payload.title.trim();
    if (!title) return false;
    tasks.value.unshift({
      id: uid(),
      title,
      description: payload.description.trim(),
      done: false,
      priority: PRIORITIES.includes(payload.priority) ? payload.priority : "medium",
      createdAt: Date.now(),
      completedAt: null,
    });
    return true;
  }

  function updateTask(id, patch) {
    const task = tasks.value.find((item) => item.id === id);
    if (!task) return false;
    if (typeof patch.title === "string") {
      const title = patch.title.trim();
      if (!title) return false;
      task.title = title;
    }
    if (typeof patch.description === "string") {
      task.description = patch.description.trim();
    }
    if (typeof patch.priority === "string" && PRIORITIES.includes(patch.priority)) {
      task.priority = patch.priority;
    }
    return true;
  }

  function toggleDone(id, done) {
    const task = tasks.value.find((item) => item.id === id);
    if (!task) return;
    task.done = done;
    task.completedAt = done ? Date.now() : null;
  }

  function removeTask(id) {
    const index = tasks.value.findIndex((item) => item.id === id);
    if (index < 0) return;
    tasks.value.splice(index, 1);
    if (editingId.value === id) editingId.value = null;
  }

  function clearDone() {
    tasks.value = tasks.value.filter((item) => !item.done);
    if (editingId.value && !tasks.value.some((item) => item.id === editingId.value)) {
      editingId.value = null;
    }
  }

  function clearAll() {
    tasks.value = [];
    editingId.value = null;
  }

  return {
    PRIORITIES,
    tasks,
    sortedTasks,
    showDetails,
    editingId,
    sortBy,
    sortOrder,
    filterStatus,
    filterPriority,
    hasTasks,
    pendingCount,
    doneCount,
    addTask,
    updateTask,
    toggleDone,
    removeTask,
    clearDone,
    clearAll,
  };
});
