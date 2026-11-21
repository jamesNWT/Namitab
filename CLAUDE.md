# Namitab

Maintained by Claude and the Programmer — kept up to date as the repo changes. For the human-maintained project history and rationale, see `PROGRAMMER.md`. For the original scaffolding plan for the monorepo restructure, see `development-notes/copy-claude-plan.md`.

## Agents' role

- The programmer must understand the code completely. 
- LLMs can implement, but only when specifically asked to. 
- The first and most important use for agents in this repo is to accelerate the programmer's own ability to understand and implement the code, and help the programmer discover the way forward when stuck.

## Conventions

- Never throw across a module boundary — return `Result<T>` instead. Applies to config validation, store-like methods, and command handlers alike.
- Interfaces are defined at the point of consumption, not the point of implementation (e.g. `ConfigStoreLike` lives in `commands/types.ts`, not next to a `ConfigStore` class) — avoids a forward dependency on code that doesn't exist yet, and keeps tests able to fake the minimum shape actually used.
- Tests are co-located (`foo.ts` + `foo.test.ts`), run via each workspace's own vitest config.
