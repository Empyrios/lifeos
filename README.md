# LifeOS v1.0 · Personal Command Centre

A responsive, dark-only, local-first Progressive Web App (PWA) for your tasks, projects, goals, weekly planning, focus sessions and reflections. Standalone from the other Empyrios apps. No login, backend, tracking, API key or subscriptions required.

**Product boundary:** LifeOS is a personal planning dashboard, not a replacement for Dayforge's gamified habits, DuoQuest's shared memories, StudyForge's specialist revision or WealthTrack's finance ledger. Its links to those apps do not access, merge or synchronise their data.

## What's implemented

| Workspace | Functional features |
|---|---|
| Today | Real task counts and priorities, due-today and overdue indicators, current-week completed tasks, next activities, active goals, quick notes, focus timer |
| Tasks | Add/edit/complete/delete; urgency levels P1–P3, descriptions, due dates, time estimates and project assignment; search and filters; local persistence |
| Projects | Create/edit/delete; active/paused/completed; linked tasks and completion percentages; safe unlinking of tasks and goals on deletion |
| Goals | Quantitative targets, progress, unit, deadlines, project links, record total progress |
| Planner | Mon–Sun weekly view, time blocks, optional task links, overlap warnings, daily scheduled duration, week navigation |
| Review | Real task-completion counts, day-by-day chart, scheduled versus actual clarification, private weekly reflections |
| Data & Apps | Full validated JSON backup and restore, CSV task export with formula-injection defence, destructive reset with confirmation, focus timer preference, relevant app shortcuts |

### UX

- Distinct mobile and desktop navigation, including access to Projects and Review on mobile through **More**.
- Keyboard shortcuts: `n` to capture a new task, `/` for task search and `Escape` to close a form.
- No fake progress data. An empty installation begins entirely blank.
- Single dark mode, consistent minimal design, responsive from 390px to 1440px.
- SVG and PNG PWA icons; service-worker caching after an actual network load.

## Getting started

From the repository root, run:

```bash
python3 -m http.server 8000 --directory site
```

Then visit `http://localhost:8000/` in a browser. Requires no npm install or frontend build.

Check the application:

```bash
npm run verify
# optional, requires Python Playwright + Chromium:
python3 tests/browser-check.py
```

`npm run verify` executes JavaScript syntax checks and **41 deterministic unit tests** (run as part of preparation). The optional browser test validates mobile and desktop creation, editing, navigation, forms, downloads and horizontal overflow using an in-memory module loader because this development environment blocks network navigation to localhost. The browser test **does not establish real-deployment network behaviour or offline service-worker functionality**. Test those explicitly after publishing.

## Publish

Keep this app in its own public `Empyrios/lifeos` repository. Commit all files in this archive to the repository root. Under **Settings → Pages**, choose **GitHub Actions**. The included `.github/workflows/deploy.yml` runs checks and publishes `site/`.

Only after a successful Pages deployment should AppHub mark LifeOS built and link `https://empyrios.github.io/lifeos/`.

## Data and security

- All user-created content is saved in the current browser's `localStorage` under key `empyrios-lifeos-v1`. It is **not encrypted, backed up automatically, or shared between browsers/devices**.
- JSON restores are validated against a versioned schema and maximum collection sizes, length caps, dates, resource references and duplicate IDs. The 8 MB import limit protects against extremely large backups, though `localStorage` quotas may be lower.
- Unrecognised saved schema is left untouched and blocked from accidental overwrite. The app offers a raw export and explicit reset.
- Input interpolated into HTML is escaped. Project colour is a validated six-digit hex code. CSV spreadsheet cells beginning with potentially executable characters are prefixed before quoting.
- External shortcut links use `noopener noreferrer`. No remote API calls or analytics are made.
- An additional local user, browser profile or device will not share this data. Export/import is the intended migration path.

## Known boundaries

- No multi-device sync, recurring task engine, calendar account integration, push notifications or external task imports.
- The focus timer requires an open browser tab and does not guarantee an alert after closing the app.
- Scheduled time represents intentions, not proven time spent. Weekly review metrics use recorded completion timestamps and planned durations.
- Planner overlap warnings compare events within the same calendar day and do not act as an automatic rescheduler.
- All data is local; back up the JSON before clearing browser storage or changing devices.
- Full QA on physical Android and GitHub Pages network/offline behaviour remains to be completed after deployment.

## Architecture

- `site/index.html`, `site/styles.css`: app shell and responsive design.
- `site/app.mjs`: user interface, local state, CRUD flows, keyboard shortcuts and validated imports/exports.
- `site/core.mjs`: pure domain logic and schema checks.
- `site/sw.js`, `site/manifest.webmanifest`, `site/icons/`: PWA shell and icons.
- `tests/core.test.mjs`: 41 unit tests.
- `tests/browser-check.py`: mobile and desktop browser smoke flows.
- `.github/workflows/deploy.yml`: GitHub Pages deployment workflow.

## Suggested v1.1 improvements

1. Actual Android install, storage and offline-first tests, plus focus trapping in forms.
2. Cross-midnight time blocks and optional repeating commitments.
3. Task recurrence, bulk editing, tags and richer saved views.
4. Explicit account-connected calendar / Todoist / GitHub integrations, with user authorization and reliable sync semantics.
5. Structured progress links from other Empyrios apps without claiming access to their browser-local data.
6. Automatic encrypted backups only after a carefully designed credential and recovery strategy.

No development decisions here grant permission to ingest personal or sensitive data from other applications, or to modify those applications.
