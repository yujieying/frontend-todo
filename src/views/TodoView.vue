<script setup>
import { computed, reactive, ref } from "vue";
import { useDateFormat, useMediaQuery } from "@vueuse/core";
import { showConfirmDialog, showToast } from "vant";
import { storeToRefs } from "pinia";
import { useTodoStore } from "../stores/todo";
import http from "../services/http";

void http;

const todoStore = useTodoStore();
const {
  sortedTasks,
  showDetails,
  editingId,
  hasTasks,
  pendingCount,
  doneCount,
  sortBy,
  sortOrder,
  filterStatus,
  filterPriority,
} = storeToRefs(todoStore);

const filterStatusOptions = [
  { value: "all", label: "全部" },
  { value: "pending", label: "未完成" },
  { value: "done", label: "已完成" },
];

const filterPriorityOptions = [
  { value: "all", label: "不限" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const sortByOptions = [
  { value: "createdAt", label: "创建时间" },
  { value: "completedAt", label: "完成时间" },
];

const sortOrderOptions = [
  { value: "desc", label: "新 → 旧" },
  { value: "asc", label: "旧 → 新" },
];

function toDropdownOptions(rows) {
  return rows.map((o) => ({ text: o.label, value: o.value }));
}

const filterStatusDropdownOptions = toDropdownOptions(filterStatusOptions);
const filterPriorityDropdownOptions = toDropdownOptions(filterPriorityOptions);
const sortByDropdownOptions = toDropdownOptions(sortByOptions);
const sortOrderDropdownOptions = toDropdownOptions(sortOrderOptions);

const listControlsWide = useMediaQuery("(min-width: 400px)");
const showListControlsSheet = ref(false);

const addForm = reactive({
  title: "",
  description: "",
  priority: "medium",
});

const editForm = reactive({
  title: "",
  description: "",
});

const canClearDone = computed(() => doneCount.value > 0);

const priorityOptions = [
  { label: "高", value: "high" },
  { label: "中", value: "medium" },
  { label: "低", value: "low" },
];

function formatTaskTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return useDateFormat(ms, "YYYY/MM/DD HH:mm").value;
}

function onAddTask() {
  const ok = todoStore.addTask(addForm);
  if (!ok) {
    showToast("待办标题不能为空");
    return;
  }
  addForm.title = "";
  addForm.description = "";
  addForm.priority = "medium";
}

function startEdit(task) {
  editingId.value = task.id;
  editForm.title = task.title;
  editForm.description = task.description;
}

function cancelEdit() {
  editingId.value = null;
  editForm.title = "";
  editForm.description = "";
}

function saveEdit(task) {
  const ok = todoStore.updateTask(task.id, {
    title: editForm.title,
    description: editForm.description,
  });
  if (!ok) {
    showToast("待办标题不能为空");
    return;
  }
  cancelEdit();
}

function clearDoneTasks() {
  todoStore.clearDone();
}

async function clearAllTasks() {
  if (!hasTasks.value) return;
  try {
    await showConfirmDialog({
      title: "确认清空",
      message: "确定要清空所有任务吗？操作后无法恢复。",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    });
    todoStore.clearAll();
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="todo-page">
    <div class="todo-card todo-app">
      <header class="todo-header">
        <h1 class="todo-header__title">
          <span class="todo-header__icon" aria-hidden="true">🐻</span>
          我的待办清单
        </h1>
        <p class="todo-header__sub">记录今天要做的事</p>
      </header>

      <van-form class="add-form" @submit="onAddTask">
        <div class="field-stack">
          <label class="field-label" for="add-title">待办标题</label>
          <van-field
            id="add-title"
            v-model="addForm.title"
            class="field-control"
            placeholder="简短标题，例如：写周报"
            maxlength="200"
            :border="false"
          />
          <label class="field-label field-label--optional" for="add-desc">
            待办描述<span class="optional-hint">（选填）</span>
          </label>
          <van-field
            id="add-desc"
            v-model="addForm.description"
            class="field-control field-control--textarea"
            rows="2"
            autosize
            type="textarea"
            maxlength="500"
            placeholder="补充细节、截止时间、注意事项等"
            :border="false"
          />
        </div>

        <div class="add-form-extra">
          <span id="addPriorityLegend" class="priority-label">优先级</span>
          <div
            class="add-priority-buttons"
            role="radiogroup"
            aria-labelledby="addPriorityLegend"
          >
            <label
              v-for="item in priorityOptions"
              :key="item.value"
              :class="[
                'priority-btn',
                `priority-btn--${item.value}`,
                { 'priority-btn--checked': addForm.priority === item.value },
              ]"
            >
              <input
                v-model="addForm.priority"
                type="radio"
                class="priority-btn__input"
                name="addPriority"
                :value="item.value"
              />
              <span class="priority-btn-text">{{ item.label }}</span>
            </label>
          </div>
        </div>

        <van-button
          block
          round
          type="primary"
          native-type="submit"
          class="btn-add-task"
        >
          ➕ 添加任务
        </van-button>
      </van-form>

      <div class="stats-wrap">
        <div class="stats" role="status" aria-live="polite">
          <div class="stat stat-pending">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">未完成</span>
          </div>
          <div class="stat stat-done">
            <span class="stat-value">{{ doneCount }}</span>
            <span class="stat-label">已完成</span>
          </div>
        </div>
        <div class="bulk-actions">
          <van-button
            block
            round
            plain
            hairline
            type="primary"
            class="bulk-btn bulk-btn--done"
            :disabled="!canClearDone"
            @click="clearDoneTasks"
          >
            清空已完成
          </van-button>
          <van-button
            block
            round
            plain
            hairline
            type="danger"
            class="bulk-btn bulk-btn--all"
            :disabled="!hasTasks"
            @click="clearAllTasks"
          >
            全部清空
          </van-button>
        </div>
      </div>

      <div class="toolbar">
        <van-space>
          <span class="details-label">显示详情</span>
          <van-switch v-model="showDetails" size="22" />
        </van-space>
      </div>

      <template v-if="hasTasks">
        <van-dropdown-menu
          v-if="listControlsWide"
          class="todo-dropdown-menu"
          :z-index="2000"
        >
          <van-dropdown-item
            v-model="filterStatus"
            :options="filterStatusDropdownOptions"
          />
          <van-dropdown-item
            v-model="filterPriority"
            :options="filterPriorityDropdownOptions"
          />
          <van-dropdown-item
            v-model="sortBy"
            :options="sortByDropdownOptions"
          />
          <van-dropdown-item
            v-model="sortOrder"
            :options="sortOrderDropdownOptions"
          />
        </van-dropdown-menu>
        <div v-else class="todo-list-controls-compact">
          <van-button
            type="primary"
            plain
            hairline
            block
            round
            class="todo-list-controls-compact__btn"
            @click="showListControlsSheet = true"
          >
            筛选 / 排序
          </van-button>
          <van-popup
            :show="showListControlsSheet"
            position="bottom"
            round
            teleport="body"
            class="todo-list-controls-popup"
            @update:show="showListControlsSheet = $event"
          >
            <div class="list-controls-sheet">
              <div class="list-controls-sheet__head">筛选与排序</div>
              <div class="sheet-block">
                <div class="sheet-block__label">完成情况</div>
                <van-radio-group
                  v-model="filterStatus"
                  direction="horizontal"
                  class="sheet-radio-row"
                >
                  <van-radio
                    v-for="opt in filterStatusOptions"
                    :key="opt.value"
                    :name="opt.value"
                  >
                    {{ opt.label }}
                  </van-radio>
                </van-radio-group>
              </div>
              <div class="sheet-block">
                <div class="sheet-block__label">优先级</div>
                <van-radio-group
                  v-model="filterPriority"
                  direction="horizontal"
                  class="sheet-radio-row"
                >
                  <van-radio
                    v-for="opt in filterPriorityOptions"
                    :key="opt.value"
                    :name="opt.value"
                  >
                    {{ opt.label }}
                  </van-radio>
                </van-radio-group>
              </div>
              <div class="sheet-block">
                <div class="sheet-block__label">排序依据</div>
                <van-radio-group v-model="sortBy" class="sheet-radio-col">
                  <van-radio
                    v-for="opt in sortByOptions"
                    :key="opt.value"
                    :name="opt.value"
                  >
                    {{ opt.label }}
                  </van-radio>
                </van-radio-group>
              </div>
              <div class="sheet-block">
                <div class="sheet-block__label">顺序</div>
                <van-radio-group
                  v-model="sortOrder"
                  direction="horizontal"
                  class="sheet-radio-row"
                >
                  <van-radio
                    v-for="opt in sortOrderOptions"
                    :key="opt.value"
                    :name="opt.value"
                  >
                    {{ opt.label }}
                  </van-radio>
                </van-radio-group>
              </div>
              <van-button
                type="primary"
                block
                round
                class="list-controls-sheet__done"
                @click="showListControlsSheet = false"
              >
                完成
              </van-button>
            </div>
          </van-popup>
        </div>
      </template>

      <div v-if="!hasTasks" class="empty-wrap">
        <van-empty description="这里空空如也，先添加一个任务吧" />
      </div>

      <div v-else-if="sortedTasks.length === 0" class="empty-wrap">
        <van-empty description="当前筛选下没有任务，可调整筛选条件" />
      </div>

      <ul v-else class="task-list" aria-label="任务列表">
        <li
          v-for="task in sortedTasks"
          :key="task.id"
          class="task-item"
          :class="[`priority-${task.priority}`, { completed: task.done }]"
        >
          <div class="task-row-title">
            <van-checkbox
              :model-value="task.done"
              checked-color="#2563eb"
              icon-size="18"
              @update:model-value="(value) => todoStore.toggleDone(task.id, value)"
            />
            <div class="task-main">
              <template v-if="editingId === task.id">
                <van-field
                  v-model="editForm.title"
                  class="field-control field-control--tight"
                  placeholder="待办标题"
                  maxlength="200"
                  :border="false"
                />
              </template>
              <template v-else>
                <div class="task-title">{{ task.title }}</div>
                <p v-if="showDetails && task.description" class="task-desc">
                  {{ task.description }}
                </p>
                <div v-if="showDetails" class="task-meta">
                  <div class="task-meta-row">
                    <span class="task-meta-label">创建时间</span>
                    <span class="task-meta-value">{{
                      formatTaskTime(task.createdAt)
                    }}</span>
                  </div>
                  <div class="task-meta-row">
                    <span class="task-meta-label">完成时间</span>
                    <span class="task-meta-value">{{
                      task.done
                        ? task.completedAt
                          ? formatTaskTime(task.completedAt)
                          : "—"
                        : "未完成"
                    }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-if="editingId === task.id" class="task-edit-body">
            <span class="task-edit-label">
              待办描述<span class="optional-hint">（选填）</span>
            </span>
            <van-field
              v-model="editForm.description"
              class="field-control field-control--textarea"
              rows="3"
              autosize
              type="textarea"
              maxlength="500"
              placeholder="补充说明"
              :border="false"
            />
            <div class="edit-priority-group">
              <span
                class="task-edit-label"
                :id="'edit-priority-legend-' + task.id"
              >
                优先级
              </span>
              <div
                class="add-priority-buttons"
                role="radiogroup"
                :aria-labelledby="'edit-priority-legend-' + task.id"
              >
                <label
                  v-for="item in priorityOptions"
                  :key="item.value"
                  :class="[
                    'priority-btn',
                    `priority-btn--${item.value}`,
                    {
                      'priority-btn--checked': task.priority === item.value,
                    },
                  ]"
                >
                  <input
                    type="radio"
                    class="priority-btn__input"
                    :name="'editPriority-' + task.id"
                    :value="item.value"
                    :checked="task.priority === item.value"
                    @change="
                      todoStore.updateTask(task.id, {
                        priority: $event.target.value,
                      })
                    "
                  />
                  <span class="priority-btn-text">{{ item.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="task-toolbar">
            <template v-if="editingId === task.id">
              <van-button
                type="primary"
                size="small"
                round
                class="task-footer-btn task-footer-btn--save"
                @click="saveEdit(task)"
              >
                保存
              </van-button>
              <van-button
                size="small"
                round
                plain
                hairline
                type="primary"
                class="task-footer-btn task-footer-btn--cancel"
                @click="cancelEdit"
              >
                取消
              </van-button>
            </template>
            <template v-else>
              <select
                class="priority-select"
                :value="task.priority"
                aria-label="任务优先级"
                @change="
                  todoStore.updateTask(task.id, {
                    priority: $event.target.value,
                  })
                "
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <van-button
                size="small"
                round
                plain
                hairline
                type="primary"
                class="task-footer-btn task-footer-btn--edit"
                @click="startEdit(task)"
              >
                编辑
              </van-button>
              <van-button
                size="small"
                round
                plain
                hairline
                class="task-footer-btn task-footer-btn--delete"
                @click="todoStore.removeTask(task.id)"
              >
                删除
              </van-button>
            </template>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
