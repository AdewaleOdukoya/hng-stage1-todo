# Today

A simple, quiet todo list. It's built with plain HTML, CSS and JavaScript: no framework, no build step.

**Live:** https://hng-stage1-todo.vercel.app

## Features

- Add, complete, edit (double-click) and delete tasks
- Low / Normal / High priorities, stats and a greeting that changes with the time of day
- Filter by All / Active / Done (with counts), and clear finished tasks
- A small confetti burst when everything is done
- A progress ring and relative "added 5m ago" times
- Saves to `localStorage` and stays in sync across tabs
- Light and dark mode, keyboard friendly (`/` to focus the input), respects reduced motion

## Run locally

```bash
python3 -m http.server 5173
# open http://localhost:5173
```

## Deploy

```bash
npx vercel --prod
```

## For AI agents

See [AGENTS.md](AGENTS.md).
