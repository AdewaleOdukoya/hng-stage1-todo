// Today — a quiet todo list. State lives in localStorage; the DOM is re-rendered from state.

const STORAGE_KEY = "today.todos.v2";
const LEGACY_KEY = "today.todos.v1";
const RING_LENGTH = 213.63; // 2π × r(34), matches stroke-dasharray in styles.css
const PRIORITIES = ["low", "normal", "high"];
const PRIORITY_LABEL = { low: "Low", normal: "Normal", high: "High" };
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const $ = (sel) => document.querySelector(sel);
const els = {
  date: $("#date"),
  greeting: $("#greeting"),
  lede: $("#lede"),
  form: $("#composer"),
  input: $("#new-todo"),
  list: $("#list"),
  empty: $("#empty"),
  emptyTitle: $("#empty-title"),
  emptySub: $("#empty-sub"),
  clear: $("#clear-completed"),
  filterNav: $("#filters"),
  filters: document.querySelectorAll("[data-filter]"),
  badges: document.querySelectorAll("[data-count]"),
  pill: $("#pill"),
  bar: $("#progress-bar"),
  pct: $("#progress-label"),
  statTotal: $("#stat-total"),
  statActive: $("#stat-active"),
  statHigh: $("#stat-high"),
  confetti: $("#confetti"),
  template: $("#todo-template"),
};

let todos = load();
let filter = "all";

// ---- persistence ----

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // v1 → v2: todos gained a priority.
    return parsed.map((t) => ({ ...t, priority: PRIORITIES.includes(t.priority) ? t.priority : "normal" }));
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage unavailable (private mode, quota) — the app still works for this session.
  }
}

// ---- state changes ----

function commit() {
  save();
  render();
}

function addTodo(title, priority) {
  todos.unshift({ id: crypto.randomUUID(), title, done: false, priority, createdAt: Date.now() });
  commit();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  commit();
  if (todo.done && todos.every((t) => t.done)) celebrate();
}

function renameTodo(id, title) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  if (title) todo.title = title;
  else todos = todos.filter((t) => t.id !== id); // emptied → delete
  commit();
}

function removeTodo(id, node) {
  const finish = () => {
    todos = todos.filter((t) => t.id !== id);
    commit();
  };
  if (node && !reducedMotion.matches) {
    node.classList.add("leaving");
    node.addEventListener("animationend", finish, { once: true });
  } else {
    finish();
  }
}

function clearCompleted() {
  todos = todos.filter((t) => !t.done);
  commit();
}

// ---- rendering ----

function visibleTodos() {
  if (filter === "active") return todos.filter((t) => !t.done);
  if (filter === "completed") return todos.filter((t) => t.done);
  return todos;
}

function render() {
  const items = visibleTodos();
  const doneCount = todos.filter((t) => t.done).length;
  const left = todos.length - doneCount;
  const highLeft = todos.filter((t) => !t.done && t.priority === "high").length;

  els.list.replaceChildren(...items.map(renderItem));

  renderEmpty(items.length);

  const counts = { all: todos.length, active: left, completed: doneCount };
  els.badges.forEach((b) => (b.textContent = counts[b.dataset.count]));
  els.statTotal.textContent = todos.length;
  els.statActive.textContent = left;
  els.statHigh.textContent = highLeft;
  els.clear.disabled = doneCount === 0;

  const ratio = todos.length ? doneCount / todos.length : 0;
  els.bar.style.strokeDashoffset = String(RING_LENGTH * (1 - ratio));
  els.pct.textContent = `${Math.round(ratio * 100)}%`;
  els.lede.textContent = lede(left, todos.length);

  els.filters.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === filter)));
  movePill();
}

function renderItem(todo) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.dataset.id = todo.id;
  node.dataset.priority = todo.priority;
  node.classList.toggle("done", todo.done);
  const box = node.querySelector("input");
  box.checked = todo.done;
  box.setAttribute("aria-label", `Mark "${todo.title}" as ${todo.done ? "not done" : "done"}`);
  node.querySelector(".title").textContent = todo.title;
  node.querySelector(".tag").textContent = PRIORITY_LABEL[todo.priority];
  node.querySelector(".when").textContent = timeAgo(todo.createdAt);
  return node;
}

function renderEmpty(visibleCount) {
  els.empty.hidden = visibleCount > 0;
  if (visibleCount > 0) return;
  if (todos.length && filter === "active") {
    els.emptyTitle.textContent = "All done. Beautiful.";
    els.emptySub.textContent = "Nothing left on your plate. Enjoy it.";
  } else if (todos.length && filter === "completed") {
    els.emptyTitle.textContent = "Nothing finished yet.";
    els.emptySub.textContent = "Tick something off. It feels good.";
  } else {
    els.emptyTitle.textContent = "A clear page.";
    els.emptySub.replaceChildren("Add your first task above. Press ", kbd("/"), " to jump there.");
  }
}

function movePill() {
  const active = els.filterNav.querySelector('[aria-pressed="true"]');
  if (!active) return;
  els.pill.style.width = `${active.offsetWidth}px`;
  els.pill.style.transform = `translateX(${active.offsetLeft}px)`;
}

function kbd(text) {
  const k = document.createElement("kbd");
  k.textContent = text;
  return k;
}

// ---- copy ----

function greeting(hour) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function lede(left, total) {
  if (!total) return "What would make today feel good?";
  if (!left) return "Everything's done. Take a breath.";
  if (left === 1) return "Just one thing left. You've got this.";
  return `${left} things to do. One at a time.`;
}

function timeAgo(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---- delight ----

function celebrate() {
  if (reducedMotion.matches) return;
  const styles = getComputedStyle(document.documentElement);
  const colors = ["--accent", "--accent-2", "--low", "--normal", "--orb-a"].map((v) => styles.getPropertyValue(v).trim());
  const pieces = Array.from({ length: 70 }, () => {
    const i = document.createElement("i");
    i.style.left = `${Math.random() * 100}vw`;
    i.style.background = colors[Math.floor(Math.random() * colors.length)];
    i.style.setProperty("--dx", `${(Math.random() - 0.5) * 240}px`);
    i.style.setProperty("--r", `${360 + Math.random() * 720}deg`);
    i.style.setProperty("--t", `${1.4 + Math.random() * 1.2}s`);
    i.style.animationDelay = `${Math.random() * 0.3}s`;
    return i;
  });
  els.confetti.replaceChildren(...pieces);
  setTimeout(() => els.confetti.replaceChildren(), 3000);
}

function shake(node) {
  node.classList.remove("shake");
  void node.offsetWidth; // restart the animation
  node.classList.add("shake");
}

// ---- inline editing ----

function startEditing(titleEl) {
  const id = titleEl.closest(".item").dataset.id;
  const original = titleEl.textContent;
  titleEl.contentEditable = "true";
  titleEl.focus();
  getSelection().selectAllChildren(titleEl);

  const finish = (keep) => {
    titleEl.removeEventListener("keydown", onKey);
    titleEl.removeEventListener("blur", onBlur);
    titleEl.contentEditable = "false";
    if (keep) renameTodo(id, titleEl.textContent.trim().slice(0, 200));
    else titleEl.textContent = original;
  };
  const onKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); finish(false); }
  };
  const onBlur = () => finish(true);

  titleEl.addEventListener("keydown", onKey);
  titleEl.addEventListener("blur", onBlur);
}

// ---- events ----

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = els.input.value.trim();
  if (!title) {
    shake(els.form);
    els.input.focus();
    return;
  }
  addTodo(title, els.form.elements.priority.value);
  els.input.value = "";
  els.input.focus();
});

els.list.addEventListener("change", (e) => {
  if (e.target.matches('input[type="checkbox"]')) toggleTodo(e.target.closest(".item").dataset.id);
});

els.list.addEventListener("click", (e) => {
  const del = e.target.closest(".delete");
  if (del) {
    const item = del.closest(".item");
    removeTodo(item.dataset.id, item);
  }
});

els.list.addEventListener("dblclick", (e) => {
  const title = e.target.closest(".title");
  if (title && title.contentEditable !== "true") startEditing(title);
});

els.filters.forEach((btn) =>
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    render();
  })
);

els.clear.addEventListener("click", clearCompleted);

document.addEventListener("keydown", (e) => {
  const typing = e.target.closest("input, [contenteditable='true']");
  if (e.key === "/" && !typing) {
    e.preventDefault();
    els.input.focus();
  }
});

// Keep tabs in sync.
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    todos = load();
    render();
  }
});

window.addEventListener("resize", movePill);
document.fonts?.ready.then(movePill);

// Refresh "5m ago" labels.
setInterval(() => {
  if (!els.list.querySelector("[contenteditable='true']")) render();
}, 60_000);

const now = new Date();
els.greeting.textContent = greeting(now.getHours());
els.date.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

render();
