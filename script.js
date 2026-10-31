const STORAGE_KEY = "taskflow-tasks-v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const filterButtons = document.querySelector(".filters");
const clearCompletedButton = document.getElementById("clearCompleted");
const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const editInput = document.getElementById("editInput");

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

// READ: Restore the saved task state from localStorage.
function loadTasks() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Could not read saved tasks:", error);
    return [];
  }
}

// Persist every state change so tasks survive page reloads.
function saveTasks() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createId() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// CREATE
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: createId(),
    title,
    completed: false,
    createdAt: new Date().toISOString()
  });

  saveTasks();
  renderTasks();
  taskForm.reset();
  taskInput.focus();
});

function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter(task => !task.completed);
  if (currentFilter === "completed") return tasks.filter(task => task.completed);
  return tasks;
}

// READ + dynamic DOM rendering
function renderTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.innerHTML = "";

  visibleTasks.forEach(task => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;
    item.dataset.id = task.id;

    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.className = "task-check";
    checkButton.dataset.action = "toggle";
    checkButton.setAttribute("aria-label", task.completed ? "Mark task active" : "Mark task completed");
    checkButton.textContent = task.completed ? "✓" : "";

    const title = document.createElement("span");
    title.className = "task-text";
    title.textContent = task.title;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.dataset.action = "edit";
    editButton.setAttribute("aria-label", "Edit task");
    editButton.title = "Edit";
    editButton.textContent = "✎";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete";
    deleteButton.dataset.action = "delete";
    deleteButton.setAttribute("aria-label", "Delete task");
    deleteButton.title = "Delete";
    deleteButton.textContent = "×";

    actions.append(editButton, deleteButton);
    item.append(checkButton, title, actions);
    taskList.appendChild(item);
  });

  const completed = tasks.filter(task => task.completed).length;
  const active = tasks.length - completed;
  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("activeCount").textContent = active;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("allFilterCount").textContent = tasks.length;
  document.getElementById("remainingLabel").textContent = `${active} ${active === 1 ? "task" : "tasks"} left`;

  emptyState.hidden = visibleTasks.length > 0;
  if (tasks.length === 0) {
    document.getElementById("emptyTitle").textContent = "Nothing on your list yet";
    document.getElementById("emptyMessage").textContent = "Add your first task above and make a start.";
  } else {
    document.getElementById("emptyTitle").textContent = `No ${currentFilter} tasks`;
    document.getElementById("emptyMessage").textContent = "Try another filter or add a new task.";
  }

  filterButtons.querySelectorAll(".filter").forEach(button => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

// Event delegation: one listener handles actions for all dynamically-created tasks.
taskList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;

  const taskElement = actionButton.closest(".task-item");
  const taskId = taskElement?.dataset.id;
  const action = actionButton.dataset.action;
  if (!taskId) return;

  if (action === "toggle") {
    const task = tasks.find(item => item.id === taskId);
    if (task) task.completed = !task.completed;
    saveTasks();
    renderTasks();
  } else if (action === "edit") {
    openEditDialog(taskId);
  } else if (action === "delete") {
    tasks = tasks.filter(item => item.id !== taskId);
    saveTasks();
    renderTasks();
  }
});

// UPDATE: Filter buttons change the visible task list.
filterButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  renderTasks();
});

// DELETE: Remove all completed tasks.
clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
});

function openEditDialog(taskId) {
  const task = tasks.find(item => item.id === taskId);
  if (!task) return;
  editingTaskId = taskId;
  editInput.value = task.title;
  editDialog.showModal();
  editInput.focus();
  editInput.select();
}

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const updatedTitle = editInput.value.trim();
  if (!updatedTitle || !editingTaskId) return;

  const task = tasks.find(item => item.id === editingTaskId);
  if (task) task.title = updatedTitle;

  saveTasks();
  renderTasks();
  editDialog.close();
  editingTaskId = null;
});

document.getElementById("cancelEdit").addEventListener("click", () => {
  editDialog.close();
  editingTaskId = null;
});

editDialog.addEventListener("close", () => {
  editingTaskId = null;
});

document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("en", {
  weekday: "short", month: "short", day: "numeric"
}).format(new Date());

// Initial READ from localStorage and first render.
renderTasks();