(function () {
  const STORAGE_KEY = "project2-todo-items";

  const PRIORITIES = /** @type {const} */ (["high", "medium", "low"]);
  /** @typedef {{ id: string, text: string, done: boolean, priority: 'high'|'medium'|'low' }} Task */

  const addForm = document.getElementById("addForm");
  const taskInput = document.getElementById("taskInput");
  const taskList = document.getElementById("taskList");
  const pendingCountEl = document.getElementById("pendingCount");
  const doneCountEl = document.getElementById("doneCount");
  const emptyState = document.getElementById("emptyState");
  const clearDoneBtn = document.getElementById("clearDoneBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  /** @type {Task[]} */
  let tasks = [];
  /** @type {string | null} */
  let editingTaskId = null;
  let editingValue = "";

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      tasks = parsed
        .filter(
          (t) =>
            t &&
            typeof t.id === "string" &&
            typeof t.text === "string" &&
            typeof t.done === "boolean"
        )
        .map((t) => ({
          id: t.id,
          text: t.text,
          done: t.done,
          priority: PRIORITIES.includes(t.priority) ? t.priority : "medium",
        }));
    } catch {
      tasks = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function cancelEdit() {
    editingTaskId = null;
    editingValue = "";
  }

  function commitEdit() {
    if (!editingTaskId) return;
    const task = tasks.find((t) => t.id === editingTaskId);
    if (!task) {
      cancelEdit();
      return;
    }
    const v = editingValue.trim();
    if (!v) {
      window.alert("任务内容不能为空，请填写文字或点「取消」退出编辑。");
      return;
    }
    task.text = v;
    cancelEdit();
    save();
    render();
  }

  function updateStats() {
    const done = tasks.filter((t) => t.done).length;
    const pending = tasks.length - done;
    pendingCountEl.textContent = String(pending);
    doneCountEl.textContent = String(done);
    const hasTasks = tasks.length > 0;
    emptyState.classList.toggle("hidden", hasTasks);
    taskList.classList.toggle("hidden", !hasTasks);
    clearDoneBtn.disabled = done === 0;
    clearAllBtn.disabled = !hasTasks;
  }

  function render() {
    taskList.innerHTML = "";
    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className =
        "task-item priority-" +
        task.priority +
        (task.done ? " completed" : "");
      li.dataset.id = task.id;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = task.done;
      cb.setAttribute("aria-label", task.done ? "标记为未完成" : "标记为已完成");
      cb.addEventListener("change", () => {
        task.done = cb.checked;
        li.classList.toggle("completed", task.done);
        cb.setAttribute(
          "aria-label",
          task.done ? "标记为未完成" : "标记为已完成"
        );
        li.className =
          "task-item priority-" +
          task.priority +
          (task.done ? " completed" : "");
        save();
        updateStats();
      });

      const pri = document.createElement("select");
      pri.className = "priority-select-row";
      pri.setAttribute("aria-label", "任务优先级");
      PRIORITIES.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p === "high" ? "高" : p === "medium" ? "中" : "低";
        pri.appendChild(opt);
      });
      pri.value = task.priority;
      pri.addEventListener("change", () => {
        const v = pri.value;
        if (!PRIORITIES.includes(v)) return;
        task.priority = v;
        li.className =
          "task-item priority-" +
          task.priority +
          (task.done ? " completed" : "");
        save();
      });

      const body = document.createElement("div");
      body.className = "task-body";

      const isEditing = editingTaskId === task.id;

      if (isEditing) {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "task-edit-input";
        inp.maxLength = 200;
        inp.value = editingValue;
        inp.setAttribute("aria-label", "编辑任务内容");
        inp.addEventListener("input", () => {
          editingValue = inp.value;
        });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
            render();
          }
        });

        const editActions = document.createElement("div");
        editActions.className = "task-edit-actions";
        const btnSave = document.createElement("button");
        btnSave.type = "button";
        btnSave.className = "btn-edit-save";
        btnSave.textContent = "保存";
        btnSave.addEventListener("click", () => commitEdit());
        const btnCancel = document.createElement("button");
        btnCancel.type = "button";
        btnCancel.className = "btn-edit-cancel";
        btnCancel.textContent = "取消";
        btnCancel.addEventListener("click", () => {
          cancelEdit();
          render();
        });
        editActions.append(btnSave, btnCancel);
        body.append(inp, editActions);

        queueMicrotask(() => {
          inp.focus();
          inp.select();
        });
      } else {
        const span = document.createElement("span");
        span.className = "task-text";
        span.textContent = task.text;

        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn-edit";
        btnEdit.textContent = "编辑";
        btnEdit.setAttribute(
          "aria-label",
          `编辑：${task.text.slice(0, 40)}`
        );
        btnEdit.addEventListener("click", () => {
          editingTaskId = task.id;
          editingValue = task.text;
          render();
        });

        body.append(span, btnEdit);
      }

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-delete";
      del.textContent = "删除";
      del.setAttribute("aria-label", `删除：${task.text.slice(0, 40)}`);
      del.addEventListener("click", () => {
        if (editingTaskId === task.id) cancelEdit();
        tasks = tasks.filter((t) => t.id !== task.id);
        save();
        render();
      });

      li.append(cb, pri, body, del);
      taskList.appendChild(li);
    });
    updateStats();
  }

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const checked = addForm.querySelector(
      'input[name="addPriority"]:checked'
    );
    const priority = checked && checked.value;
    const p = PRIORITIES.includes(priority) ? priority : "medium";
    tasks.push({ id: uid(), text, done: false, priority: p });
    taskInput.value = "";
    const mediumRadio = addForm.querySelector(
      'input[name="addPriority"][value="medium"]'
    );
    if (mediumRadio) mediumRadio.checked = true;
    cancelEdit();
    save();
    render();
    taskInput.focus();
  });

  clearDoneBtn.addEventListener("click", () => {
    tasks = tasks.filter((t) => !t.done);
    cancelEdit();
    save();
    render();
  });

  clearAllBtn.addEventListener("click", () => {
    if (tasks.length === 0) return;
    const ok = window.confirm(
      "确定要清空所有任务吗？包括未完成与已完成，清空后无法恢复。"
    );
    if (!ok) return;
    tasks = [];
    cancelEdit();
    save();
    render();
  });

  load();
  render();
})();
