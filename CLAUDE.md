# Namitab

Maintained by Claude — kept up to date as the repo changes. For the human-maintained project history and rationale, see `PROGRAMMER.md`. For the original scaffolding plan for the monorepo restructure, see `development-notes/copy-claude-plan.md`.

## Commands

npm workspaces (`packages/*`, `apps/*`) — run from the repo root, not inside a package.

- `npm install` — single hoisted install for all workspaces
- `npm run dev -w @namitab/web` — SvelteKit dev server
- `npm test` / `npm run lint` / `npm run check` — fan out to every workspace's own script (`--workspaces --if-present`). `check` is `tsc --noEmit` for `packages/core`, svelte-check for `apps/web`
- `npm run format` — `prettier --write .` across the whole repo
- Target one workspace directly: `npm run <script> -w @namitab/core` or `-w @namitab/web`

## Structure

Root `package.json`/`.npmrc`/`.gitignore`/`tsconfig.base.json`/`eslint.config.js`/`.prettierrc` are shared across every workspace; each workspace's own `package.json` only lists its framework-specific dependencies (e.g. `svelte`/`@sveltejs/*` stay in `apps/web`; `eslint`/`prettier`/`typescript`/`vitest` are hoisted to root).

- **`packages/core`** (`@namitab/core`) — framework-agnostic business logic. No build step: `package.json` `exports` points straight at `src/index.ts`, resolved by consumers' own Vite/Vitest.
  - `config/` — zod schema (`schema.ts`), defaults (`defaults.ts`), color scheme presets (`colorSchemes.ts`, `light` still unfilled — no source of truth), `migrateConfig`/`validateConfig` (`migrate.ts`)
  - `storage/` — `StorageAdapter` interface + `LocalStorageAdapter` (namespaced under `namitab:`, same-tab `onChange` synthesized since the native `storage` event only fires cross-tab, malformed entries skipped rather than thrown). The extension's `browser.storage.sync` adapter belongs here too, not yet built.
  - `commands/` — text command parsing (`parse.ts`, splits on first whitespace) + dispatch (`registry.ts`: `-d`/`-y`/`-w` search engines generated from config, `-a`/`-r`/`-s` shortcut commands grouped under `staticCommands`). Written against a locally-defined `ConfigStoreLike` interface (`types.ts`), not a concrete store.
  - `result.ts` — `Result<T>` (`{ok:true,value}|{ok:false,error}`), the project-wide convention for fallible operations. Used across `config`/`storage`-adjacent code/`commands`.
- **`apps/web`** (`@namitab/web`) — SvelteKit, still the stock `npx sv create` scaffold. Nothing imports `@namitab/core` yet. Still on `adapter-auto` — switching to `adapter-static` is deliberately deferred until real routes/prerendering decisions exist.
- **`apps/extension`** — not started.

## Open design question

`ConfigStore` (wraps a `StorageAdapter`, holds reactive state, satisfies `ConfigStoreLike`) doesn't exist yet, and deliberately so: its home — plain TS inside `packages/core` vs. Svelte-native (runes) inside `apps/web` — depends on what a real Svelte component actually needs, which isn't known without one. Current plan: build it alongside the first real `apps/web` UI work rather than as its own preceding slice. It also needs to reassemble `StorageAdapter.getAll()`'s flat, per-key map (e.g. `shortcut:<id>`) into the nested shape `migrateConfig` expects, and do the reverse on writes — this doesn't exist anywhere yet either.

## Conventions

- Never throw across a module boundary — return `Result<T>` instead. Applies to config validation, store-like methods, and command handlers alike.
- Interfaces are defined at the point of consumption, not the point of implementation (e.g. `ConfigStoreLike` lives in `commands/types.ts`, not next to a `ConfigStore` class) — avoids a forward dependency on code that doesn't exist yet, and keeps tests able to fake the minimum shape actually used.
- Tests are co-located (`foo.ts` + `foo.test.ts`), run via each workspace's own vitest config.
