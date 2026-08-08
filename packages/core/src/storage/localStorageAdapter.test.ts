import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './localStorageAdapter';

class FakeStorage implements Storage {
	private data = new Map<string, string>();

	get length(): number {
		return this.data.size;
	}

	key(index: number): string | null {
		return Array.from(this.data.keys())[index] ?? null;
	}

	getItem(key: string): string | null {
		return this.data.has(key) ? this.data.get(key)! : null;
	}

	setItem(key: string, value: string): void {
		this.data.set(key, value);
	}

	removeItem(key: string): void {
		this.data.delete(key);
	}

	clear(): void {
		this.data.clear();
	}
}

describe('LocalStorageAdapter', () => {
	let storage: FakeStorage;
	let adapter: LocalStorageAdapter;

	beforeEach(() => {
		storage = new FakeStorage();
		adapter = new LocalStorageAdapter(storage);
	});

	it('round-trips values through set and getAll', async () => {
		await adapter.set({ 'shortcut:1': { name: 'foo' } });
		expect(await adapter.getAll()).toEqual({ 'shortcut:1': { name: 'foo' } });
	});

	it('omits removed keys from getAll', async () => {
		await adapter.set({ a: 1, b: 2 });
		await adapter.remove(['a']);
		expect(await adapter.getAll()).toEqual({ b: 2 });
	});

	it('namespaces the raw storage key under namitab:', async () => {
		await adapter.set({ 'shortcut:1': 'value' });
		expect(storage.getItem('namitab:shortcut:1')).toBe('"value"');
		expect(storage.getItem('shortcut:1')).toBeNull();
	});

	it('fires onChange synchronously on same-tab set', async () => {
		let received: [Record<string, unknown>, string[]] | undefined;
		adapter.onChange((changed, removed) => {
			received = [changed, removed];
		});
		await adapter.set({ a: 1 });
		expect(received).toEqual([{ a: 1 }, []]);
	});

	it('fires onChange synchronously on same-tab remove', async () => {
		await adapter.set({ a: 1 });
		let received: [Record<string, unknown>, string[]] | undefined;
		adapter.onChange((changed, removed) => {
			received = [changed, removed];
		});
		await adapter.remove(['a']);
		expect(received).toEqual([{}, ['a']]);
	});

	it('stops firing callbacks after unsubscribe', async () => {
		let calls = 0;
		const unsubscribe = adapter.onChange(() => {
			calls++;
		});
		await adapter.set({ a: 1 });
		unsubscribe();
		await adapter.set({ a: 2 });
		expect(calls).toBe(1);
	});

	it('ignores pre-existing non-namespaced localStorage entries', async () => {
		storage.setItem('some-other-app-key', 'value');
		await adapter.set({ a: 1 });
		expect(await adapter.getAll()).toEqual({ a: 1 });
	});
});
