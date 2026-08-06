# Namitab Rewrite — Slice 1: Monorepo Skeleton + `packages/core`

## Context

Namitab is being rewritten from a legacy static-JS/Firebase site into an open-source, dual-distribution product (self-hosted web app + browser extension), per the target architecture already decided in `CLAUDE.md`. None of the rewrite is implemented yet: the repo currently has the legacy static site checked out at root (`index.html`, `scripts/`, `style/`, `content/`) alongside an untouched `namitab-frontend/` SvelteKit scaffold from `npx sv create`, no root `package.json`, and no workspace tooling.

CLAUDE.md's stated build order is: **core package (schema, storage adapter, command registry) → self-hosted web app → self-host docs → extension → optional hosted sync layer**. This plan covers only the first step — standing up the npm-workspaces monorepo skeleton and building out `packages/core` — because everything downstream (the web app's UI, the extension) depends on this shared logic existing first, and it's independently testable without any UI. It stops short of wiring `apps/web`'s UI to `packages/core`; that's the next slice.

Research grounding this plan (already done, not re-derived here):
- The SvelteKit scaffold (`namitab-frontend/`) is 100% stock output — safe to move wholesale.
- The legacy app's exact command-parsing, shortcut-storage, and theming behavior was read from `scripts/*.js` and `style/main.css` (via git) — this plan's defaults and bug fixes are traced to specific legacy behavior, not guessed.
- The abandoned `origin/darkmode` branch (plus a corrective follow-up commit `226bae9` on `legacy` that fixed a readability bug in it) provides confirmed, reusable dark-theme CSS variable values.

## Decisions (confirmed with user)

1. **Remove legacy static files from `rewrite`** (`git rm -r index.html scripts style content`) as the first commit of this slice. They remain fully recoverable from the `legacy`/`origin/legacy` branch and from `rewrite`'s own prior history — nothing is lost, this just keeps the working tree unambiguous once `apps/` and `packages/` exist.
2. **Build the color scheme presets registry now** (`packages/core/src/config/colorSchemes.ts`), seeded with the confirmed `vaporwave` (current `main.css`) and `dark` (corrected `origin/darkmode` + `226bae9`) values. `light` scheme values are left as an open flag — no source of truth exists yet.
3. **Default Google search uses `google.com`**, not the legacy's locale-specific `google.ca`.

## Scope

In scope: npm-workspaces restructure, `packages/core/{config,storage,commands}` with unit tests.
Out of scope (later slices): `apps/web` UI/theming, `apps/extension`, `browser.storage.sync` adapter, hosted sync layer, `ConfigStore` (commands depend only on a `ConfigStoreLike` interface they define themselves, so this slice has no forward dependency on it).

## 1. Monorepo restructure

- `git rm -r index.html scripts style content` — first commit, isolated.
- `git mv namitab-frontend apps/web` — second commit, isolated. Rename `"name"` in `apps/web/package.json` from `namitab-frontend` to `@namitab/web`.
- Verify immediately: `cd apps/web && npm install && npm run dev` still boots the stock SvelteKit welcome page from the new path, before any further changes.

## 2. Root workspace scaffold

Create root `package.json` (npm workspaces: `["packages/*", "apps/*"]`, `engines.node: ">=20"`, scripts that fan out via `--workspaces --if-present`, and root `.npmrc` with `engine-strict=true`). Hoist shared, generic devDependencies to root (`eslint`, `prettier` + `prettier-plugin-svelte`, `typescript`, `typescript-eslint`, `vitest`, `eslint-config-prettier`, `globals`, `@eslint/js`, `@eslint/compat`); keep Svelte/Kit-specific deps (`@sveltejs/kit`, `svelte`, `vite`, `svelte-check`, `@sveltejs/vite-plugin-svelte`, `jsdom`, `@testing-library/*`) in `apps/web/package.json`. Add a root `.gitignore` (repo currently has none) covering `node_modules`, `.svelte-kit`, `build`, `dist`.

Consolidate tooling config to root, no per-package duplication:
- **Prettier**: move `.prettierrc`/`.prettierignore` from `apps/web` to root.
- **ESLint**: move `eslint.config.js` to root (flat config), with the existing Svelte-file-scoped block (already self-scoped via `files: ['**/*.svelte', ...]`) importing `apps/web/svelte.config.js` by relative path for parser options.
- **TypeScript**: add root `tsconfig.base.json` with shared strict options; `packages/core/tsconfig.json` extends it. Leave `apps/web/tsconfig.json` as-is (extends SvelteKit's generated `.svelte-kit/tsconfig.json` — don't fight the framework there).
- **Vitest**: `apps/web` keeps its existing multi-project vite/vitest config unchanged. `packages/core` gets its own standalone `vitest.config.ts` (plain Node/jsdom, no Vite-Svelte plugin needed) since it's framework-agnostic.

Verify: delete stray `node_modules`, run `npm install` from repo root → single hoisted install; `npm run dev -w @namitab/web` still boots; `npm run lint` from root passes.

Defer (explicitly, do not do in this slice): swapping `apps/web/svelte.config.js`'s `adapter-auto` → `adapter-static`. That belongs to the `apps/web` UI slice once real routes/prerendering decisions exist — doing it now against the stock scaffold page would be a no-op.

## 3. `packages/core` package skeleton

`packages/core/package.json` (name `@namitab/core`, `zod` as a real dependency, `exports` pointing at `src/index.ts` directly — no build/bundle step yet, Vite/TS resolve sibling workspace TS source fine for a dev-only slice), `tsconfig.json`, `vitest.config.ts` (`environment: 'jsdom'` — needed for the storage adapter's `window`/`localStorage`), empty `src/index.ts`.

```
packages/core/src/
  config/    schema.ts, defaults.ts, colorSchemes.ts, migrate.ts, index.ts (+ *.test.ts)
  storage/   types.ts, localStorageAdapter.ts, index.ts (+ *.test.ts)
  commands/  types.ts, parse.ts, registry.ts, index.ts (+ *.test.ts)
  index.ts   package root re-export
```

## 4. `packages/core/config`

**Schema** (`schema.ts`, zod): `searchEngineSchema` (`{id, name, urlTemplate: z.string().url(), prefix?}` — `urlTemplate` is a base URL string that handlers append `encodeURIComponent(query)` to, matching legacy's concatenation behavior rather than introducing a `%s`-template micro-language), `shortcutSchema` (`{id, name, url, category}`), `colorOverridesSchema` (partial patch: `border`, `commandlineBg`, `topbarBg`, `text`, `mainBg`, `sideImage` — mirrors today's CSS custom properties, minus the dead `--color-bg`), `themeSchema` (`colorSchemeId: enum('vaporwave'|'light'|'dark')`, `colorOverrides`, `chromeStyleId: enum('win95')`, `effects: {scanlines, glow}`), `backgroundSchema` (discriminated union on `type: 'preset'|'url'`, `url` variant validated as a real URL), and `configSchemaV1` (versioned, `.refine`d for: `defaultSearchEngineId` must reference an existing engine id, engine ids unique, shortcut names unique).

**Defaults** (`defaults.ts`): legacy-matching `defaultConfig` — search engines `[google (no prefix, google.com), duckduckgo (-d), youtube (-y), wikipedia (-w)]` (no `-l` liquipedia — dropped per CLAUDE.md, simply absent, no shim needed), `shortcuts: []`, theme `{colorSchemeId: 'vaporwave', colorOverrides: {}, chromeStyleId: 'win95', effects: {scanlines: true, glow: true}}` (matches legacy's always-on scanlines/glow), background `{type: 'preset', value: 'arizona'}`.

**Color scheme presets** (`colorSchemes.ts`): `colorSchemePresets: Record<ColorSchemeId, ColorOverrides>` — `vaporwave` seeded from current `style/main.css` (`border:'#f1adc3'`, `commandlineBg:'#fdebf1'`, `topbarBg:'#ad78ba'`, `text:'rgb(0,0,0)'`, `mainBg:'#fcdfe8'`, `sideImage:'wavepink.png'`), `dark` seeded from the corrected values (`border:'#41596c'`, `commandlineBg:'#9ca49e'`, `topbarBg:'#e08e63'`, `text:'rgba(248,231,231,0.973)'` — the `226bae9`-corrected value, not the raw `origin/darkmode` black — `mainBg:'#1d242a'`, `sideImage:'skyline.gif'`), `light` left as a flagged TODO placeholder (no source of truth in the codebase today).

**Migration stub** (`migrate.ts`): `migrateConfig(raw: unknown): StoreResult<Config>` — identity pass-through + `configSchemaV1.safeParse` today, with a comment marking where a v1→v2 transform would slot in. Defines `StoreResult<T> = {ok:true, value:T} | {ok:false, error:string}` here, re-exported from the package root so `storage` and `commands` share the same type.

## 5. `packages/core/storage`

**Interface** (`types.ts`) — exactly per CLAUDE.md, verbatim:
```ts
interface StorageAdapter {
  getAll(): Promise<Record<string, unknown>>;
  set(entries: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  onChange(cb: (changed: Record<string, unknown>, removed: string[]) => void): () => void;
}
```

**`LocalStorageAdapter`** (`localStorageAdapter.ts`): namespaces all physical keys under a `namitab:` prefix (stripped on read/emit, so caller-facing keys like `shortcut:<id>` stay adapter-agnostic); constructor accepts an injectable `Storage` (default `window.localStorage`) for testability. **Same-tab `onChange` gap fix**: the native `storage` event never fires in the writing tab, so `set()`/`remove()` synthesize their own notification via an internal `emit()` in addition to relaying genuine cross-tab `storage` events — subscribers get one unified callback regardless of same-tab vs cross-tab origin. Guard the `window.addEventListener('storage', ...)` call with `typeof window !== 'undefined'` so importing the module in a non-browser context (future CLI/build script) doesn't throw at import time.

Not built in this slice (interface must not foreclose it): the extension's `browser.storage.sync` adapter.

## 6. `packages/core/commands`

**Parser** (`parse.ts`): `parseCommandInput(input): {prefix: string|null, args: string}` — splits on the **first whitespace**, not a hardcoded 2-character slice. This is a direct fix for the legacy bug in `scripts/command.js` (`input.substr(0,2)` + `input.substr(3)` breaks on prefixes of any other length or double spaces).

**Registry & dispatch** (`registry.ts`, `types.ts`): `Command = {prefix?, description, handler}`. Search-engine commands are generated from `config.searchEngines` (data-driven, not a hardcoded switch) — handler does `ctx.navigate(engine.urlTemplate + encodeURIComponent(args))`. Shortcut commands `-a`/`-r`/`-s` are implemented against a `ConfigStoreLike` interface (defined locally in `commands/types.ts` — `addShortcut`, `removeShortcut`, `findShortcutByName` — so `commands` has no hard dependency on the not-yet-built `ConfigStore`; a real `ConfigStore`, built in a later slice, will simply satisfy this shape). This fixes two concrete legacy bugs: `-r`/`-s` no longer scan `.link-div` DOM elements by `textContent`, they query the store directly; and the legacy `-s` "shortcut not found" alert is currently dead code (accessing `.firstElementChild` on `undefined` throws before the alert line runs) — the new `-s` handler returns a clean `{ok:false, error:...}` `StoreResult` instead. All handlers return `StoreResult`, never throw and never silently fail (fixes legacy `-a`'s unhandled/uncaught write-rejection case too). `-l` liquipedia has no command entry — dropped entirely.

## 7. Testing

Co-located `*.test.ts` files (matches existing scaffold convention), run via `packages/core`'s own `vitest.config.ts` (jsdom environment). Representative cases:
- **schema**: valid config accepted; duplicate shortcut names rejected; duplicate engine ids rejected; `defaultSearchEngineId` referencing a missing engine rejected; invalid `background.url` rejected.
- **migrate**: `migrateConfig(defaultConfig)` → `ok:true`; `migrateConfig({})`/`null`/`undefined` → `ok:false` without throwing.
- **localStorageAdapter**: set/getAll round-trip; remove omits the key; keys are namespaced (`namitab:` prefix on the raw storage key); `onChange` fires synchronously on same-tab `set`/`remove` (the synthesized-notification fix); unsubscribe stops further callbacks; `getAll()` ignores pre-existing non-namespaced localStorage entries.
- **parse**: `-d hello world` → `{prefix:'-d', args:'hello world'}`; `-w` alone → `{prefix:'-w', args:''}`; bare query with no `-` prefix → `{prefix:null, args:...}`; multi-word `-a` args preserved (unlike legacy's fixed `substr(3)`).
- **registry**: `-d cats` navigates to the DuckDuckGo URL; a bare query navigates via the default engine (`google.com`); `-a` with missing args returns `ok:false` without calling the store; `-a name url category` calls `addShortcut` with parsed positional args; `-s` on a known name navigates to its URL; `-s` on an unknown name returns a clean `ok:false` (not a throw — the fixed-bug regression test); unknown prefix returns `ok:false`.

Add `"test": "vitest run"` to `packages/core/package.json` so root `npm test` (`--workspaces --if-present`) fans out to both `packages/core` and `apps/web`.

## Ordered steps

1. `git rm -r index.html scripts style content` (isolated commit).
2. `git mv namitab-frontend apps/web`, rename package to `@namitab/web` → verify stock dev server boots from new path.
3. Root workspace scaffold (`package.json`, `.npmrc`, `.gitignore`, hoisted devDeps) → verify single root install, dev server still boots.
4. Consolidate eslint/prettier/tsconfig-base to root → verify `npm run lint` passes.
5. `packages/core` skeleton (`package.json`, `tsconfig.json`, `vitest.config.ts`, empty `src/index.ts`) → verify `npm run test -w @namitab/core` runs (0 tests).
6. Config schema + defaults + color scheme presets + migration stub + tests → verify tests pass.
7. Storage adapter (interface + `LocalStorageAdapter`) + tests → verify tests pass, including same-tab `onChange`.
8. Command parser + registry + built-in commands + tests → verify full `packages/core` suite passes.
9. Root verification pass: `npm run lint`, `npm run test` (fans out to both workspaces), `npm run check` (svelte-check for `apps/web`), confirm `apps/web` dev server still boots (not yet importing `@namitab/core` — that's the next slice).

## Verification

- `npm install` from repo root succeeds with a single hoisted `node_modules`.
- `npm run dev -w @namitab/web` boots the stock SvelteKit page (unchanged behavior, new location).
- `npm run test` from root passes, covering all `packages/core` unit tests listed above (config validation, storage round-trip/same-tab-notify, command parsing/dispatch including the fixed legacy bugs).
- `npm run lint` from root passes across both `apps/web` and `packages/core`.
- `git log` shows clean, isolated commits per step (legacy removal, scaffold move, workspace scaffold, tooling consolidation, then `packages/core` build-out) so any step can be bisected/reverted independently.
