(function () {
  const STORAGE_KEY = "project2-todo-items";
  const DESC_VISIBLE_KEY = "project2-todo-desc-visible";

  const PRIORITIES = /** @type {const} */ (["high", "medium", "low"]);
  /** @typedef {{ id: string, title: string, description: string, done: boolean, priority: 'high'|'medium'|'low', createdAt: number, completedAt: number | null }} Task */

  const addForm = document.getElementById("addForm");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescInput = document.getElementById("taskDescInput");
  const taskList = document.getElementById("taskList");
  const pendingCountEl = document.getElementById("pendingCount");
  const doneCountEl = document.getElementById("doneCount");
  const emptyState = document.getElementById("emptyState");
  const clearDoneBtn = document.getElementById("clearDoneBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const taskListToolbar = document.getElementById("taskListToolbar");
  const toggleDescBtn = document.getElementById("toggleDescBtn");

  /** @type {Task[]} */
  let tasks = [];
  let showTaskDetails = localStorage.getItem(DESC_VISIBLE_KEY) === "1";
  /** @type {string | null} */
  let editingTaskId = null;
  let editingTitle = "";
  let editingDescription = "";

  /** @param {number} ms */
  function formatTaskTime(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    return new Date(ms).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /** @param {string} id */
  function inferCreatedFromId(id) {
    const prefix = String(id).split("-")[0];
    const n = Number(prefix);
    if (Number.isFinite(n) && n > 946684800000) return n;
    return null;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      tasks = parsed
        .filter((t) => {
          if (!t || typeof t.id !== "string" || typeof t.done !== "boolean")
            return false;
          const legacy =
            typeof t.text === "string" ? t.text : "";
          const title =
            typeof t.title === "string" ? t.title : legacy;
          return title.trim().length > 0;
        })
        .map((t) => {
          const legacy =
            typeof t.text === "string" ? t.text : "";
          const titleRaw =
            typeof t.title === "string" ? t.title : legacy;
          const done = t.done;
          let createdAt =
            typeof t.createdAt === "number" && Number.isFinite(t.createdAt)
              ? t.createdAt
              : inferCreatedFromId(t.id);
          if (createdAt == null) createdAt = Date.now();

          let completedAt =
            typeof t.completedAt === "number" && Number.isFinite(t.completedAt)
              ? t.completedAt
              : null;
          if (!done) completedAt = null;

          return {
            id: t.id,
            title: titleRaw.trim(),
            description:
              typeof t.description === "string" ? t.description : "",
            done,
            priority: PRIORITIES.includes(t.priority) ? t.priority : "medium",
            createdAt,
            completedAt,
          };
        });
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
    editingTitle = "";
    editingDescription = "";
  }

  function taskPreviewLabel(task) {
    const t = task.title.slice(0, 40);
    return t.length < task.title.length ? `${t}…` : t;
  }

  function commitEdit() {
    if (!editingTaskId) return;
    const task = tasks.find((t) => t.id === editingTaskId);
    if (!task) {
      cancelEdit();
      return;
    }
    const title = editingTitle.trim();
    if (!title) {
      window.alert("待办标题不能为空，请填写标题或点「取消」退出编辑。");
      return;
    }
    task.title = title;
    task.description = editingDescription.trim();
    cancelEdit();
    save();
    render();
  }

  function applyDetailVisibility() {
    taskList.classList.toggle("task-list--desc-visible", showTaskDetails);
    if (toggleDescBtn) {
      toggleDescBtn.setAttribute(
        "aria-pressed",
        showTaskDetails ? "true" : "false"
      );
      toggleDescBtn.textContent = showTaskDetails ? "隐藏详情" : "显示详情";
    }
  }

  function updateStats() {
    const done = tasks.filter((t) => t.done).length;
    const pending = tasks.length - done;
    pendingCountEl.textContent = String(pending);
    doneCountEl.textContent = String(done);
    const hasTasks = tasks.length > 0;
    emptyState.classList.toggle("hidden", hasTasks);
    taskList.classList.toggle("hidden", !hasTasks);
    if (taskListToolbar) {
      taskListToolbar.classList.toggle("hidden", !hasTasks);
    }
    clearDoneBtn.disabled = done === 0;
    clearAllBtn.disabled = !hasTasks;
    applyDetailVisibility();
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

      const rowTitle = document.createElement("div");
      rowTitle.className = "task-item-row-title";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = task.done;
      cb.setAttribute("aria-label", task.done ? "标记为未完成" : "标记为已完成");
      cb.addEventListener("change", () => {
        task.done = cb.checked;
        if (task.done) {
          task.completedAt = Date.now();
        } else {
          task.completedAt = null;
        }
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
        render();
      });

      const pri = document.createElement("select");
      pri.className = "priority-select-row priority-select-row--compact";
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

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-delete";
      del.textContent = "删除";
      del.setAttribute("aria-label", `删除：${taskPreviewLabel(task)}`);
      del.addEventListener("click", () => {
        if (editingTaskId === task.id) cancelEdit();
        tasks = tasks.filter((t) => t.id !== task.id);
        save();
        render();
      });

      const rowToolbar = document.createElement("div");
      rowToolbar.className = "task-item-row-toolbar";

      const titleBlock = document.createElement("div");
      titleBlock.className = "task-item-title-block";

      const isEditing = editingTaskId === task.id;

      if (isEditing) {
        const inpTitle = document.createElement("input");
        inpTitle.type = "text";
        inpTitle.className = "task-edit-input";
        inpTitle.maxLength = 200;
        inpTitle.value = editingTitle;
        inpTitle.placeholder = "待办标题";
        inpTitle.setAttribute("aria-label", "编辑待办标题");
        inpTitle.addEventListener("input", () => {
          editingTitle = inpTitle.value;
        });
        inpTitle.addEventListener("keydown", (e) => {
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

        titleBlock.append(inpTitle);
        rowTitle.append(cb, titleBlock);

        const editBody = document.createElement("div");
        editBody.className = "task-item-edit-body";

        const lblDesc = document.createElement("span");
        lblDesc.className = "task-edit-label";
        lblDesc.innerHTML = "待办描述 <span class=\"optional-hint\">（选填）</span>";

        const inpDesc = document.createElement("textarea");
        inpDesc.className = "task-edit-textarea";
        inpDesc.maxLength = 500;
        inpDesc.rows = 3;
        inpDesc.value = editingDescription;
        inpDesc.setAttribute("aria-label", "编辑待办描述（选填）");
        inpDesc.addEventListener("input", () => {
          editingDescription = inpDesc.value;
        });
        inpDesc.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
            render();
          }
        });

        editBody.append(lblDesc, inpDesc, pri);

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

        rowToolbar.append(btnSave, btnCancel, del);

        li.append(rowTitle, editBody, rowToolbar);

        queueMicrotask(() => {
          inpTitle.focus();
          inpTitle.select();
        });
      } else {
        const titleEl = document.createElement("div");
        titleEl.className = "task-title";
        titleEl.textContent = task.title;

        titleBlock.append(titleEl);

        const descTrim = task.description.trim();
        if (descTrim) {
          const descEl = document.createElement("p");
          descEl.className = "task-desc task-collapsible-detail";
          descEl.textContent = descTrim;
          titleBlock.append(descEl);
        }

        const meta = document.createElement("div");
        meta.className = "task-meta task-collapsible-detail";

        const rowCreated = document.createElement("div");
        rowCreated.className = "task-meta-row";
        const lblCreated = document.createElement("span");
        lblCreated.className = "task-meta-label";
        lblCreated.textContent = "创建时间";
        const valCreated = document.createElement("span");
        valCreated.className = "task-meta-value";
        valCreated.textContent = formatTaskTime(task.createdAt);
        rowCreated.append(lblCreated, valCreated);
        meta.append(rowCreated);

        const rowDone = document.createElement("div");
        rowDone.className = "task-meta-row";
        const lblDone = document.createElement("span");
        lblDone.className = "task-meta-label";
        lblDone.textContent = "完成时间";
        const valDone = document.createElement("span");
        valDone.className = "task-meta-value";
        valDone.textContent = task.done
          ? task.completedAt != null
            ? formatTaskTime(task.completedAt)
            : "—"
          : "未完成";
        rowDone.append(lblDone, valDone);
        meta.append(rowDone);

        titleBlock.append(meta);

        rowTitle.append(cb, titleBlock);

        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn-edit";
        btnEdit.textContent = "编辑";
        btnEdit.setAttribute("aria-label", `编辑：${taskPreviewLabel(task)}`);
        btnEdit.addEventListener("click", () => {
          editingTaskId = task.id;
          editingTitle = task.title;
          editingDescription = task.description;
          render();
        });

        rowToolbar.append(pri, btnEdit, del);
        li.append(rowTitle, rowToolbar);
      }
      taskList.appendChild(li);
    });
    updateStats();
  }

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return;
    const description = taskDescInput.value.trim();
    const checked = addForm.querySelector(
      'input[name="addPriority"]:checked'
    );
    const priority = checked && checked.value;
    const p = PRIORITIES.includes(priority) ? priority : "medium";
    const now = Date.now();
    tasks.push({
      id: uid(),
      title,
      description,
      done: false,
      priority: p,
      createdAt: now,
      completedAt: null,
    });
    taskTitleInput.value = "";
    taskDescInput.value = "";
    const mediumRadio = addForm.querySelector(
      'input[name="addPriority"][value="medium"]'
    );
    if (mediumRadio) mediumRadio.checked = true;
    cancelEdit();
    save();
    render();
    taskTitleInput.focus();
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

  if (toggleDescBtn) {
    toggleDescBtn.addEventListener("click", () => {
      showTaskDetails = !showTaskDetails;
      localStorage.setItem(DESC_VISIBLE_KEY, showTaskDetails ? "1" : "0");
      applyDetailVisibility();
    });
  }

  load();
  render();
})();
