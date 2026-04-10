# frontend-todo

基于 `Vue 3 + Pinia + Vue Router 4 + Vite + VueUse + Axios + Less + Vant 4` 的移动端待办应用。

## 技术栈

- Vue 3（`<script setup>`）
- Pinia（状态管理）
- Vue Router 4（路由）
- Vite（构建与开发服务器）
- VueUse（本地存储等组合式工具）
- Axios（HTTP 客户端，已在 `src/services/http.js` 预置）
- Less（样式）
- Vant 4（移动端 UI 组件）

## 开发命令

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## 数据兼容与不丢失说明

本次重构保留并兼容旧版本地数据，不会因为升级技术栈导致用户待办记录丢失：

- 继续使用旧版 localStorage Key：`project2-todo-items`
- 继续使用详情开关 Key：`project2-todo-desc-visible`
- 兼容旧字段：
  - 若旧数据是 `text` 字段，会迁移为 `title`
  - 若无 `createdAt`，会尝试从旧 `id` 前缀推断时间（旧版 `Date.now()-xxx` 格式）
  - 若任务未完成，`completedAt` 统一归零为 `null`

## 功能

- 待办标题（必填）与描述（选填）
- 优先级（高/中/低）
- 创建时间、完成时间
- 详情显示总控（描述+时间）
- 编辑、删除、清空已完成、清空全部

## 项目结构

```text
src/
  main.js
  App.vue
  router/
    index.js
  stores/
    todo.js
  services/
    http.js
  styles/
    app.less
  views/
    TodoView.vue
```