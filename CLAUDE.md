# Namitab code-brain to be maintained by programmer:

## What we're building and why

Namitab is new-tab/startpage project available for self-hosting or as a browser extension. It aims to provide users with a beautiful, distractionless, functional page to start browsing sessions with that contains only the shortcuts they desire. It is available for self-hosting for the fastest possible performance and total ownership of your data. It is available as a chrome extension for ease of use.

## Structure / Architecture

The namitab project is a monorepo managing a svelte webpage, a browser extension module, and a shared core of functionality. I should describe the architecture of the config schema and storage here once I fully understand it.

## What we have done so far and why:

### Legacy startpage

Years ago I built this startpage in vanilla js, using firebase for persistance. It was a bit rough around the edges but it basically worked perfectly for years of daily use by me. it is still visible on the legacy branch on git.

### Rewrite step 1: Re-architecting and restructuring the codebase.

I've always wanted to make this startpage easily available to my friends. To this end it had to be more configurable, customizable, robust, and easily available. To achieve this I wanted to make it available as a browser extension. For those more technically inclined I also wanted to make it work as a self-hosted page. Finally I wanted to use Svelte in a project and this seemed like a reasonable fit. Thus the decision to rewrite the project was taken. We also did not want to pay to host a backend for this project should we actually gain more users than a trial liscence of a hosting platform would allow. To this end we decided to use `browser.storage.sync` (via `webextension-polyfill` for cross-browser support) for the extension and the self-hosted app uses `localStorage`. This allows users to save and persist a limited amount of configuration data with no need for any account on their part or hosted backend on our part. The first step of the rewrite would be to structure a monorepo in a way to manage a svelte page, a browser extension, and the shared functionality between them. This resulted in a structure like:

**Monorepo shape** (npm workspaces):

```
packages/core/     shared, framework-agnostic-where-possible logic
  storage/           StorageAdapter interface + web/extension implementations
  commands/           command registry + built-in commands
  config/              zod schema, defaults, migrations
apps/web/           SvelteKit, adapter-static — self-host target
apps/extension/      browser extension, Chrome/Firefox/Edge — evaluate WXT (wxt.dev) for cross-browser MV3 builds with Svelte support
```

Of special note with the restructure is the use of 'npm workspaces', which is a way to harmonize working with three different packages (core, web, extension), in a monorepo. It should be fairly frictionless, but you may need to remember that we are working with npm workspaces instead of one npm package, at times.

Claude's full plan for this step (slice), and rationale for the new structure, is expounded in `./development-notes/copy-claude-plan.md`

**Rewrite step 1's implementation details:**

As part of the first step of the rewrite, we've gone ahead and implemented three modules, packed into namitab/core: `commands`, `config`, and `storage`

- **command:** The logic for parsing and executing commands from the start page. Has three interfaces in `types.ts`:

  _(1) ConfigStoreLike_ defines the shape of the ConfigStore, necessary for the commands to interact with shortcuts, search engines, and anything else they'll need to operate on, which are accessed by the ConfigStore, which itself will have an expanded implementation later.

  _(2) CommandContext_ defines the shape of the contextual data the command will need to access.

  _(3) Command_ defines the data shape associated with the command itself.

  `parse.ts` contains functions for parsing text into commands, and is fairly straightforward. `registry.ts` implements a command pattern that encapsulates the dispatchable action of a command, and a registry to encapsulate all of the commands as a whole.

- **config:** Uses `zod` as a core dependency to define and validate a schema with which we will store the users' configuration data. This will allow us to perform CRUD operations on configuration data with confidence in `browser.sync.storage` and `localStorage`.
  - `schema.ts` This defines the shape and types for shortcuts, search engines, and theming. In other words: it's the schema!
  - `defaults.ts`: contains an object defining the default values for a configuration schema. This is a good place to look to see what a concrete example of a schema would look like.
  - `colorSchemes.ts`: Defines defaults for a couple of color schemes, which are referenced in `defaults.ts`. Again, a good place to look to see a concrete example of a "deeper" part of the schema.
  - `migrate.ts`: has a function that calls zod's validation code to ensure some input is a valid config and prepares it for handoff. Also sets up a migration function; if the schema changes in the future, the code needs to know how to handle that change and not break, and this will be handled here.

- **storage:** Provides an interface (`StorageAdapter`) and at this point one of at least two concrete implementations (`LocalStorageAdapter`). LocalStorageAdapter handles actual read and write operations to `localStorage`. In the future, we'll also have something like `BrowserSyncStorageAdapter` that handles actual read and write to `browser.sync.storage`. These classes will be injected via the interface into a future ConfigStore class, which will take the hand-off from the adapter, perform some operations on it in order to validate it, and then have it stored in-memory as state.

We also implemented a Result<T> type at the top level of the nanitab/core module to enable controlled error handling.

## Current goal:

Begin work on the svelte app. Also, understand to what extent the extension will be dependent on the svelte app. 
---

# Claude-generated claude.md

(may be partially or completely out of date)

A personal start-page / new-tab project (vaporwave + Windows 95-inspired aesthetic, "nami" = Japanese for wave) that is being rewritten from the ground up into an open-source, dual-distribution product: a self-hostable web app and a cross-browser extension. See **Planned Rewrite** below for the target architecture — none of it is implemented yet.

## Current State (legacy)

The live site is a static vanilla-JS app, no build step, deployed via GitHub Pages directly from `legacy`.

- `index.html` — page shell, loads Firebase SDK v8 (compat) via `<script>` tags with a hardcoded client config, then the scripts below.
- `scripts/app.js` — renders shortcuts read from the Firestore `shortcuts` collection into `#links`, grouped by a free-typed `category` field (display order = first-seen order in the query snapshot).
- `scripts/command.js` — parses the command-line input (`#command-line`) via a 2-character-prefix switch statement (`input.substr(0, 2)`) and dispatches to search engines or shortcut add/remove/goto. Shortcut lookups scan the rendered DOM (`.link-div` elements) rather than any data model.
- `scripts/auth.js` — Firebase Auth email/password sign-in; a single hardcoded user (the repo owner) is the only account that can write shortcuts.
- `scripts/clock.js`, `scripts/quote.js` — top-bar clock and quote display.
- `style/main.css` — already uses CSS custom properties for colors/background images (`--color-border`, `--color-bg`, `--background-picture`, `--side-picture`, etc.) and a custom `ms98` font (`content/ms98.ttf`). Useful precedent for the planned theming system.
- `content/` — images and font used by the current theme.

Command syntax today (documented in `README.md`):

```
-d [words]   duckduckgo search
-y [words]   youtube search
-l [words]   google search scoped to liquipedia.net
-w [words]   wikipedia search
-a [name] [url] [category]   add shortcut (auth-gated)
-r [name]    remove shortcut (auth-gated)
-s [name]    go to shortcut
(no prefix)  google search
```

`namitab-frontend/` is a SvelteKit 2 / Svelte 5 project scaffold generated by `npx sv create` — it is currently **untouched** (default `+page.svelte`, no real code) and not wired to the live site. It's the starting point for the rewrite, not a working feature.

There is no root `package.json`, no CI/CD (`.github/` is empty), and no `LICENSE` file yet — worth addressing before/at open-source release.

### Branches

- `legacy` / `origin/legacy` — current legacy production code (what GitHub Pages serves).
- `main` — where this rewrite is happening.
- `origin/darkmode` (unmerged) — contains real work on a dark color scheme plus further win95-style chrome refinements. Reuse these values when building the planned `dark` color-scheme preset rather than redoing them from scratch.

## Planned Rewrite (design decided, not yet implemented)

Goals: a ground-up rewrite that's both a learning project and a real open-source product, distributed two ways — a self-hosted static web app (fastest load, full data ownership) and a browser extension (Chrome/Firefox/Edge, overrides new-tab) for non-technical users — free to run forever.

**No hosted backend for the MVP.** This is the central architectural decision: the extension uses `browser.storage.sync` (via `webextension-polyfill` for cross-browser support) and the self-hosted app uses `localStorage` — same interface, two adapters, zero infrastructure cost, no accounts to build. A hosted sync/accounts layer is a possible future v2 add-on only if there's real demand, not a dependency of the core product.

**Monorepo shape** (npm workspaces):

```
packages/core/     shared, framework-agnostic-where-possible logic
  storage/           StorageAdapter interface + web/extension implementations
  commands/           command registry + built-in commands
  config/              zod schema, defaults, migrations
apps/web/           SvelteKit, adapter-static — self-host target
apps/extension/      browser extension, Chrome/Firefox/Edge — evaluate WXT (wxt.dev) for cross-browser MV3 builds with Svelte support
```

**Config schema** (versioned, zod-validated):

- `searchEngines[]` (`{ id, name, urlTemplate, prefix? }`) + `defaultSearchEngineId` — search engines are data, not code. Default set after the rewrite: Google (default, no prefix), `-d` DuckDuckGo, `-y` YouTube, `-w` Wikipedia. (`-l` liquipedia is dropped — no longer used.)
- `shortcuts[]` (`{ id, name, url, category }`) — category stays a free-typed string with first-seen display order, matching current behavior.
- `theme` — three independent axes, not one bundled preset:
  - `colorSchemeId` + `colorOverrides` (partial CSS-var patch) — e.g. `vaporwave` (today's default colors), `light`, `dark` (reuse `origin/darkmode` values)
  - `chromeStyleId` — window/border/title-bar look and font, e.g. `win95` (today's chrome/font style), independent of color
  - `effects: { scanlines, glow }` — independent boolean toggles, not tied to a specific palette or chrome style
- `background` — `{ type: 'preset' | 'url', value }`. Curated bundled presets, or a user-pasted image URL (validated by attempting to load it before saving). Deliberately **no arbitrary image uploads** in either target, for consistency between self-host and extension.

**Command registry**: one array of `{ prefix?, description, handler }`. Search engines and actions (`-a`/`-r`/`-s`) resolve through the same path — a search engine is just a command whose handler navigates to its `urlTemplate`. Parsing splits on first whitespace rather than assuming a fixed 2-character prefix (fixes a real bug in the current `command.js`).

**Shared CRUD via one store**: a single `ConfigStore` (wraps the storage adapter, holds reactive state) is the _only_ thing that mutates config. Both command handlers and the planned GUI settings panel call the same store methods (`addShortcut`, `setTheme`, etc.) — logic and validation exist once. Methods return `StoreResult` (`{ ok: true, value } | { ok: false, error }`) instead of throwing, so failures (duplicate shortcut name, full sync storage, bad image URL) are always surfaced to the user — in a terminal-style echo line under the command input for the CLI path, and inline for the GUI — instead of failing silently like the current app does.

**Storage adapter is a flat key-value interface**, not a single JSON blob:

```ts
interface StorageAdapter {
	getAll(): Promise<Record<string, unknown>>;
	set(entries: Record<string, unknown>): Promise<void>;
	remove(keys: string[]): Promise<void>;
	onChange(cb: (changed: Record<string, unknown>, removed: string[]) => void): () => void;
}
```

Each shortcut is stored under its own key (`shortcut:<id>`) rather than one array in one key — `chrome.storage.sync` caps individual items at ~8KB even though the total budget is ~100KB, and per-key writes avoid re-serializing the whole config on every change.

**Build order**: core package (schema, storage adapter, command registry) → self-hosted web app (validates the UI/architecture, replaces the GitHub Pages deploy) → self-host docs (now just clone → edit config → deploy static files, no Firebase project to provision) → extension (storage adapter's extension implementation, new-tab override, WXT evaluation, store listings) → optional hosted sync layer, only if warranted later.

## Commands

No root-level command runner yet. Inside `namitab-frontend/` (npm):

```
npm run dev      # vite dev server
npm run build     # vite build
npm run check     # svelte-kit sync + svelte-check
npm run lint      # prettier --check + eslint
npm run test      # vitest run
```

These will likely move/expand once the monorepo restructure (`packages/core`, `apps/web`, `apps/extension`) happens.
