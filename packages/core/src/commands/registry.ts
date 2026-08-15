import type { Config, SearchEngine } from '../config/schema';
import type { Result } from '../result';
import type { Command, CommandContext } from './types';
import { parseCommandInput } from './parse';

function searchCommandHandler(engine: SearchEngine) {
	return (args: string, ctx: CommandContext): Result<void> => {
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

export const staticCommands = {
	// "static" refers to the fact these commands are set at compile-time, and not generated during
	//  run time, as is the case with buildSearchEngineCommands()
	addShortcut: {
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
	},
	removeShortcut: {
		prefix: '-r',
		description: 'Remove a shortcut: -r name',
		handler: (args, ctx) => {
			const name = args.trim();
			if (!name) {
				return { ok: false, error: 'usage: -r name' };
			}
			return ctx.store.removeShortcut(name);
		}
	},
	gotoShortcut: {
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
	}
} satisfies Record<string, Command>;

export function buildCommands(config: Config): Command[] {
	// This is called on every dispatchCommand, so do be careful if you find yourself changing this
	// into something that would introduce real latency.
	return [...buildSearchEngineCommands(config.searchEngines), ...Object.values(staticCommands)];
}

export function dispatchCommand(input: string, config: Config, ctx: CommandContext): Result<void> {
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
