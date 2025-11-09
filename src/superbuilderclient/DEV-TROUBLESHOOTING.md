# Dev Troubleshooting Log

This document records the investigation, root causes, and fixes applied to resolve a white, unresponsive dev window when running the Tauri + Vite app in development mode.

## Symptoms

- Tauri dev window opens blank/white and appears unresponsive.
- No backend/service logs appear in the UI.
- Opening `http://localhost:1420` in a normal browser also shows a blank page.
- DevTools console errors observed:
  - `Uncaught SyntaxError: Invalid or unexpected token` at CSS module URLs, e.g.:
    - `/src/components/tooltip/HighLowTooltipDescription.css`
    - `/src/components/tooltip/LightTooltip.css`
    - `/src/components/generalUseModal/SimpleAlert.css`
  - In a regular browser (not Tauri):
    - `Uncaught TypeError: Cannot read properties of undefined (reading 'metadata') at getCurrentWindow(...)` (from Tauri APIs being unavailable in a browser context)

## Root Causes

1) Empty or effectively-empty CSS files in Vite dev

- Certain CSS files were empty or contained only a single newline. In Vite dev, importing such files can produce a broken JavaScript module for CSS injection, leading to a syntax error before the React app renders, causing a white screen.
- Files affected in this repo:
  - `src/components/tooltip/HighLowTooltipDescription.css` (effectively empty)
  - `src/components/tooltip/LightTooltip.css` (empty)
  - `src/components/modelLink/ModelLink.css` (empty)
  - `src/components/generalUseModal/SimpleAlert.css` (very small; still triggered a parse error in this environment)

2) Testing dev UI in a normal browser

- Code paths like `getCurrentWindow()` (Tauri WebView API) are used at module load in the UI (e.g., `src/components/topbar/Topbar.jsx:31`). These APIs do not exist in a regular browser, so visiting `http://localhost:1420` directly will crash with TypeErrors even if Vite is fine. This is expected and separate from the CSS issue.

## Fixes Applied

To unblock development while keeping behavior unchanged, we applied the following minimal, non-visual tweaks:

1) Ensure empty CSS files are non-empty by adding harmless placeholders

- `src/components/tooltip/HighLowTooltipDescription.css:1` — added `:root {}` with a comment.
- `src/components/tooltip/LightTooltip.css:1` — added `:root {}` with a comment.
- `src/components/modelLink/ModelLink.css:1` — added `:root {}` with a comment.

2) Remove a fragile CSS import and inline the tiny style

- `src/components/generalUseModal/SimpleAlert.jsx:2` — removed `import "./SimpleAlert.css"`.
- `src/components/generalUseModal/SimpleAlert.jsx:30` — inlined `{ display: 'flex', alignSelf: 'center' }` via MUI `sx` prop on `DialogActions`.

These changes prevent Vite from generating invalid CSS injector modules and avoid the dev-time syntax error, restoring the UI in dev.

## Validation

- `npm run tauri dev` launches the Tauri window and the UI renders normally.
- DevTools console no longer reports CSS syntax errors.
- Visiting `http://localhost:1420` in a normal browser still shows Tauri API errors (expected); use the Tauri window for runtime testing.

## Additional Notes & Guidance

- Avoid empty CSS modules. If a CSS file is intentionally empty, add a comment or a neutral placeholder (e.g., `:root {}`) to keep Vite’s dev CSS injector happy.
- If a stylesheet is unused, remove the import instead of shipping an empty file.
- When debugging dev-time white screens, check DevTools Console first; CSS parse errors often present as JS syntax errors at CSS module URLs in Vite dev.
- Only validate Tauri-only APIs (e.g., `@tauri-apps/api/window`) inside the Tauri WebView, not in a regular browser tab.
- If a similar white-screen happens without CSS errors, also verify:
  - Vite dev server is reachable on port 1420 (strict port).
  - WebView2 cache issues (rare); restarting or clearing user data can help.
  - Firewall/AV not blocking localhost or WebSocket HMR (1421 when used).

