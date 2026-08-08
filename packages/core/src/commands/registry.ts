import type { Config, SearchEngine } from '../config/schema';
import type { StoreResult } from '../config/migrate';
import type { Command, CommandContext } from './types';
import { parseCommandInput } from './parse';

function searchCommandHandler(engine: SearchEngine) {
	return (args: string, ctx: CommandContext): StoreResult<void> => {
		ctx.navigate(engine.urlTemplate + encodeURIComponent(args));
		return { ok: true, value: undefined };
	};
}

export function buildSearchEngineCommands(searchEngines: Config['searchEngines']): Command[] {
	return searchEngines
		.filter((engine) => Boolean(engine.prefix))
		.map((engine) => ({
			prefix: engine.prefix,
			description: `Search ${engine.name}`,
			handler: searchCommandHandler(engine)
		}));
}

export const addShortcutCommand: Command = {
	prefix: '-a',
	description: 'Add a shortcut: -a name url category',
	handler: (args, ctx) => {
		const [name, url, category] = args.trim().split(/\s+/).filter(Boolean);
		if (!name || !url || !category) {
			return { ok: false, error: 'usage: -a name url category' };
		}
		const result = ctx.store.addShortcut(name, url, category);
		return result.ok ? { ok: true, value: undefined } : result;
	}
};

export const removeShortcutCommand: Command = {
	prefix: '-r',
	description: 'Remove a shortcut: -r name',
	handler: (args, ctx) => {
		const name = args.trim();
		if (!name) {
			return { ok: false, error: 'usage: -r name' };
		}
		return ctx.store.removeShortcut(name);
	}
};

export const gotoShortcutCommand: Command = {
	prefix: '-s',
	description: 'Go to a shortcut: -s name',
	handler: (args, ctx) => {
		const name = args.trim();
		const shortcut = ctx.store.findShortcutByName(name);
		if (!shortcut) {
			return { ok: false, error: `shortcut not found: ${name}` };
		}
		ctx.navigate(shortcut.url);
		return { ok: true, value: undefined };
	}
};

export function buildCommands(config: Config): Command[] {
	return [
		...buildSearchEngineCommands(config.searchEngines),
		addShortcutCommand,
		removeShortcutCommand,
		gotoShortcutCommand
	];
}

export function dispatchCommand(
	input: string,
	config: Config,
	ctx: CommandContext
): StoreResult<void> {
	const { prefix, args } = parseCommandInput(input);

	if (prefix === null) {
		const defaultEngine = config.searchEngines.find(
			(engine) => engine.id === config.defaultSearchEngineId
		);
		if (!defaultEngine) {
			return { ok: false, error: 'no default search engine configured' };
		}
		return searchCommandHandler(defaultEngine)(args, ctx);
	}

	const command = buildCommands(config).find((c) => c.prefix === prefix);
	if (!command) {
		return { ok: false, error: `unknown command: ${prefix}` };
	}
	return command.handler(args, ctx);
}
