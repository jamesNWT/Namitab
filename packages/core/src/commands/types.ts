import type { StoreResult } from '../config/migrate';
import type { Shortcut } from '../config/schema';

/**
 * Shape the built-in shortcut commands need from a config store. Defined
 * here rather than imported so `commands` has no forward dependency on the
 * not-yet-built ConfigStore — a real ConfigStore will simply satisfy this
 * shape.
 */
export interface ConfigStoreLike {
	addShortcut(name: string, url: string, category: string): StoreResult<Shortcut>;
	removeShortcut(name: string): StoreResult<void>;
	findShortcutByName(name: string): Shortcut | undefined;
}

export interface CommandContext {
	navigate(url: string): void;
	store: ConfigStoreLike;
}

export interface Command {
	prefix?: string;
	description: string;
	handler: (args: string, ctx: CommandContext) => StoreResult<void>;
}
