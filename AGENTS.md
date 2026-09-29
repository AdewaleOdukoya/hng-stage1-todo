# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) working in this repo.
Humans: see [README.md](README.md).

## Project overview

**Today** is a single-page todo list. It is static HTML, CSS, and vanilla JavaScript,
with no framework, no build step, and no dependencies. Todos persist in the browser's `localStorage`.
It is deployed to Vercel as a static site.

## Structure

```
.
├── index.html     # Markup: masthead, composer form, filters, list, <template> for one todo row
├── styles.css     # All styling. Design tokens live on :root; dark mode overrides them
├── app.js         # All behavior (ES module): state → save() → render()
├── vercel.json    # Static hosting config (clean URLs, security + cache headers)
├── AGENTS.md      # This file
├── CLAUDE.md      # Points Claude Code at this file
└── README.md      # Human-facing readme
```

## Architecture (app.js)

One-way data flow. Keep it that way.

1. **State** is the `todos` array: `{ id, title, done, priority, createdAt }` (`priority` is `low | normal | high`), plus the `filter` string (`all | active | completed`).
2. **Mutations** (`addTodo`, `toggleTodo`, `renameTodo`, `removeTodo`, `clearCompleted`) change state, then call `commit()`.
3. **`commit()`** = `save()` (localStorage, key `today.todos.v2`) + `render()`.
4. **`render()`** rebuilds the list from state using the `#todo-template` element. Never patch individual rows by hand.
5. **Events** are delegated on `#list` (change / click / dblclick). Don't attach listeners per row.

If you change the shape of a todo, bump the storage key (e.g. `v2` → `v3`) and migrate in `load()`. `load()` already migrates `v1` data, which had no priority.

The rest of the UI (stats, filter badges, the sliding filter pill, greeting and lede, relative times) is derived inside `render()`. Confetti (`celebrate()`) fires when the last open task is completed.

## Commands

No install needed.

| Task    | Command                                               |
|---------|-------------------------------------------------------|
| Run     | `python3 -m http.server 5173` → http://localhost:5173 |
| Deploy  | `npx vercel --prod`                                   |

`app.js` is an ES module, so open the app through a server, not `file://`.

## Conventions

- **No dependencies or build tooling.** Don't add npm packages, bundlers, or frameworks unless asked.
- **Colors and radii come from CSS variables** in `:root`. Add a new token rather than hard-coding a hex. Every token needs a dark-mode value.
- **Accessibility is required.** Controls are real `<button>`/`<input>` elements, icon buttons have `aria-label`, focus stays visible, and motion respects `prefers-reduced-motion`.
- **Mobile first.** It must work at 320px wide with no horizontal scroll. Hover-only affordances need a `(hover: none)` fallback.
- **Security.** Render user text with `textContent`, never `innerHTML`.
- Style: 2-space indent, double quotes, semicolons, small named functions grouped under `// ---- section ----` comments.

## Verifying a change

There is no automated test suite. Before you say you're done, serve the app and check that:

1. A task can be added with a priority (Enter or the + button), and empty input shakes the composer instead of adding a task.
2. Toggling marks it done (strikethrough) and updates the progress ring, stats, and filter badges. Completing the last task fires confetti.
3. Double-click edits a title: Enter saves, Esc cancels, and clearing the text deletes the task.
4. The delete button and "Clear done" work.
5. The All / Active / Done filters show the right items and the right empty-state message.
6. After a reload, the todos are still there.
7. It looks right in both light and dark mode, and at phone width.
8. The browser console shows no errors.

## Git and deploy

- Keep commits small, with an imperative subject line (e.g. `Add due dates to todos`).
- Don't commit `.vercel/`, `node_modules/`, or secrets (see `.gitignore`).
- Pushes to `main` on GitHub deploy to production when the Vercel Git integration is connected.
