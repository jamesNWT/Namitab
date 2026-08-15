# Namitab PROGRAMMER.md

sort of like a CLAUDE.md, but written exclusively by a programmer.

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