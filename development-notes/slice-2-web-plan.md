# Namitab Rewrite — Slice 2: First `apps/web` Page + `ConfigStore`

## Context

Slice 1 (`copy-claude-plan.md`) stood up the monorepo and `packages/core` (config, storage, commands), and stopped short of wiring `apps/web` to it. This slice replaces the stock SvelteKit scaffold with a working new-tab page — config loaded from `localStorage` (or defaults), shortcuts rendered by category, a command line dispatching through `dispatchCommand`, with `-a`/`-r` persisting and syncing across tabs. It also resolves the open `ConfigStore` design question by building it against the first real component that consumes it.

Out of scope (later slices): theming/color schemes, visual chrome (win95, scanlines, side image), clock/quote, `apps/extension`, `browser.storage.sync` adapter, settings UI.

## Decisions (confirmed with user)

1. **Command handlers become async.** `ConfigStoreLike.addShortcut`/`removeShortcut`, `Command.handler`, and `dispatchCommand` return `Promise<Result<…>>`. `findShortcutByName` stays sync. Rationale: `StorageAdapter` writes are async and can fail (`localStorage.setItem` throws `QuotaExceededError`); a sync `Result` would have to report `ok` before the write landed — exactly the silent-failure class the rewrite set out to fix.
2. **`ConfigStore` is split.** Pure, framework-agnostic logic (serialization, diffing, mutations) lives in `packages/core`; a thin Svelte 5 runes wrapper lives in `apps/web/src/lib/configStore.svelte.ts`, takes a `StorageAdapter` via constructor, holds `$state`, and satisfies `ConfigStoreLike`. If the extension ends up Svelte-based too, the wrapper moves to a shared package later.

## 1. Core: config ⇄ storage entries (`packages/core/src/config/serialize.ts`)

Storage key layout, chosen for `browser.storage.sync` quotas (8 KB per item, 512 items, 120 writes/min) — hence one key per shortcut:

| Key             | Value                                |
| --------------- | ------------------------------------ |
| `meta`          | `{ version, defaultSearchEngineId }` |
| `searchEngines` | `SearchEngine[]`                     |
| `theme`         | `Theme`                              |
| `background`    | `Background`                         |
| `shortcut:<id>` | `Shortcut`                           |

- `toStorageEntries(config): Record<string, unknown>`
- `fromStorageEntries(entries): unknown` — reassembles the nested shape, does **not** validate (that's `migrateConfig`'s job). Ignores unknown keys.
- `diffStorageEntries(prev, next): { set: Record<string, unknown>; remove: string[] }` — writes only what changed (matters for the sync write quota).
- Shortcut ordering: storage key order isn't guaranteed, so sort by category then name on reassembly. A manual-order field can come later.

## 2. Core: mutations (`packages/core/src/config/mutations.ts`)

- `addShortcut(config, { name, url, category }, id): Result<Config>` — `id` injected by the caller (`crypto.randomUUID()`), keeping the function pure and tests deterministic.
- `removeShortcut(config, name): Result<Config>` — error if the name isn't found.
- Both run the next config through `migrateConfig`, so the schema's existing name-uniqueness refine produces the duplicate-name error — no reimplementation.
- Wrap `LocalStorageAdapter.set`/`remove` bodies in try/catch so a quota error surfaces as a rejected promise rather than a synchronous throw; the store converts it to a `Result`.

## 3. Core: async handlers (`packages/core/src/commands/`)

Per decision 1: update `types.ts` (`ConfigStoreLike`, `Command`), `registry.ts` (handlers + `dispatchCommand`), and `registry.test.ts`.

## 4. Web: `ConfigStore` (`apps/web/src/lib/configStore.svelte.ts`)

- State: `config = $state<Config>(defaultConfig)`, `status: 'loading' | 'ready'`, `loadError?: string`.
- `load()`: `adapter.getAll()` → `fromStorageEntries` → `migrateConfig`.
  - Empty storage → defaults, **not written** until the first mutation.
  - Invalid stored data → defaults in memory, set `loadError`, **never overwrite storage** (a bug must not wipe user data).
- Mutations: run the core mutation → `diffStorageEntries(prev, next)` → persist → only then assign `config`. Persistence failure → `{ ok: false }`, `config` unchanged.
- Cross-tab: subscribe to `adapter.onChange` → reload. Same-tab writes also fire it; harmless since reload is idempotent. Expose an unsubscribe/`destroy()` for cleanup.

## 5. Web: routes and components

- `svelte.config.js`: swap `adapter-auto` → `adapter-static` (with fallback). Add `@namitab/core` as a dependency of `apps/web`.
- `src/routes/+layout.ts`: `export const ssr = false; export const prerender = true;` — the page depends on `localStorage`.
- `src/routes/+page.svelte`: the **only** place that constructs `new LocalStorageAdapter()` and the `ConfigStore`; provides the store to children via context. This is the seam that lets the extension reuse components with a different adapter.
- `CommandLine.svelte`: autofocused input; on Enter, `await dispatchCommand(...)` with `navigate: (url) => window.location.assign(url)`. Clear on success, show inline error on failure.
- `ShortcutList.svelte`: shortcuts grouped by category as plain `<a href>`; empty state hints at `-a`.
- Styling stays deliberately bare.

## 6. Testing

- Core:
  - `serialize.test.ts` — round trip (`defaultConfig` + shortcuts → entries → config), diff cases (add / remove / change).
  - `mutations.test.ts` — add ok, add duplicate name, remove ok, remove missing.
  - `localStorageAdapter.test.ts` — a `FakeStorage` whose `setItem` throws → `set` rejects.
  - `registry.test.ts` — updated for async handlers.
- Web (`configStore.svelte.test.ts`, runs in the existing jsdom "client" vitest project, in-memory fake adapter):
  - empty storage → defaults, nothing written
  - corrupt storage → `loadError`, storage untouched
  - add shortcut → only `shortcut:<id>` written
  - cross-tab change → `config` updates
  - failed persist → `config` unchanged, `{ ok: false }`
- Web component test: `CommandLine` dispatches on submit and renders the error on failure.
- Delete scaffold tests `src/demo.spec.ts` and `src/routes/page.svelte.test.ts`.

## Ordered steps (one commit each)

1. Core: `serialize.ts` + tests
2. Core: `mutations.ts` + tests; try/catch in `LocalStorageAdapter`
3. Core: async command handlers
4. Web: depend on `@namitab/core`, `adapter-static`, `+layout.ts`
5. Web: `ConfigStore` + tests
6. Web: components, page, component tests; remove scaffold tests
7. Docs: update `CLAUDE.md` (resolve open design question, record key layout); `PROGRAMMER.md` "Current goal" is the programmer's to update

## Verification

- Root: `npm run lint`, `npm test`, `npm run check` all pass.
- `npm run dev -w @namitab/web`:
  - `-a` a shortcut, reload — it persists
  - open a second tab — it appears there too
  - `-s` navigates, `-r` removes, plain text searches the default engine
  - hand-corrupt a `namitab:` key in DevTools — page loads defaults with an error, no crash, key left intact
- `npm run build -w @namitab/web` produces static output.
