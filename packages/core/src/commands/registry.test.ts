import { describe, it, expect, vi } from 'vitest';
import { dispatchCommand } from './registry';
import { defaultConfig } from '../config/defaults';
import type { ConfigStoreLike, CommandContext } from './types';
import type { Shortcut } from '../config/schema';

function createContext(overrides: Partial<ConfigStoreLike> = {}): {
	ctx: CommandContext;
	navigate: ReturnType<typeof vi.fn>;
} {
	const navigate = vi.fn();
	const store: ConfigStoreLike = {
		addShortcut: vi.fn(),
		removeShortcut: vi.fn(),
		findShortcutByName: vi.fn(() => undefined),
		...overrides
	};
	return { ctx: { navigate, store }, navigate };
}

describe('dispatchCommand', () => {
	it('navigates to the DuckDuckGo URL for -d', () => {
		const { ctx, navigate } = createContext();
		const result = dispatchCommand('-d cats', defaultConfig, ctx);
		expect(result.ok).toBe(true);
		expect(navigate).toHaveBeenCalledWith('https://duckduckgo.com/?q=cats');
	});

	it('navigates via the default search engine for a bare query', () => {
		const { ctx, navigate } = createContext();
		const result = dispatchCommand('cats', defaultConfig, ctx);
		expect(result.ok).toBe(true);
		expect(navigate).toHaveBeenCalledWith('https://www.google.com/search?q=cats');
	});

	it('returns ok:false for -a with missing args without calling the store', () => {
		const { ctx } = createContext();
		const result = dispatchCommand('-a', defaultConfig, ctx);
		expect(result.ok).toBe(false);
		expect(ctx.store.addShortcut).not.toHaveBeenCalled();
	});

	it('calls addShortcut with parsed positional args for -a', () => {
		const addShortcut = vi.fn(() => ({ ok: true as const, value: {} as Shortcut }));
		const { ctx } = createContext({ addShortcut });
		dispatchCommand('-a foo https://example.com misc', defaultConfig, ctx);
		expect(addShortcut).toHaveBeenCalledWith('foo', 'https://example.com', 'misc');
	});

	it('navigates to a known shortcut for -s', () => {
		const shortcut: Shortcut = { id: '1', name: 'foo', url: 'https://foo.example', category: 'x' };
		const { ctx, navigate } = createContext({ findShortcutByName: vi.fn(() => shortcut) });
		const result = dispatchCommand('-s foo', defaultConfig, ctx);
		expect(result.ok).toBe(true);
		expect(navigate).toHaveBeenCalledWith('https://foo.example');
	});

	it('returns a clean ok:false for -s on an unknown shortcut, without throwing', () => {
		const { ctx } = createContext();
		expect(() => dispatchCommand('-s missing', defaultConfig, ctx)).not.toThrow();
		expect(dispatchCommand('-s missing', defaultConfig, ctx).ok).toBe(false);
	});

	it('returns ok:false for an unknown prefix', () => {
		const { ctx } = createContext();
		const result = dispatchCommand('-z whatever', defaultConfig, ctx);
		expect(result.ok).toBe(false);
	});
});
