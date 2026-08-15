import type { StorageAdapter } from './types';

const NAMESPACE = 'namitab:';

type ChangeListener = (changed: Record<string, unknown>, removed: string[]) => void;

export class LocalStorageAdapter implements StorageAdapter {
	private storage: Storage;
	private listeners = new Set<ChangeListener>();

	constructor(storage: Storage = globalThis.localStorage) {
		this.storage = storage;

		// The native `storage` event never fires in the tab that made the
		// write, only in other tabs — guarded so importing this module in a
		// non-browser context (future CLI/build script) doesn't throw.
		if (typeof window !== 'undefined') {
			window.addEventListener('storage', this.handleStorageEvent);
		}
	}

	async getAll(): Promise<Record<string, unknown>> {
		const result: Record<string, unknown> = {};
		for (let i = 0; i < this.storage.length; i++) {
			const rawKey = this.storage.key(i);
			if (rawKey === null || !rawKey.startsWith(NAMESPACE)) continue;
			const rawValue = this.storage.getItem(rawKey);
			if (rawValue === null) continue;
			const parsed = this.parseValue(rawValue);
			if (!parsed.parsed) continue;
			result[rawKey.slice(NAMESPACE.length)] = parsed.value;
		}
		return result;
	}

	async set(entries: Record<string, unknown>): Promise<void> {
		for (const [key, value] of Object.entries(entries)) {
			this.storage.setItem(NAMESPACE + key, JSON.stringify(value));
		}
		this.emit(entries, []);
	}

	async remove(keys: string[]): Promise<void> {
		for (const key of keys) {
			this.storage.removeItem(NAMESPACE + key);
		}
		this.emit({}, keys);
	}

	onChange(cb: ChangeListener): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	private handleStorageEvent = (event: StorageEvent): void => {
		if (event.storageArea !== this.storage) return;
		if (event.key === null || !event.key.startsWith(NAMESPACE)) return;

		const key = event.key.slice(NAMESPACE.length);
		if (event.newValue === null) {
			this.emit({}, [key]);
			return;
		}
		const parsed = this.parseValue(event.newValue);
		if (!parsed.parsed) return;
		this.emit({ [key]: parsed.value }, []);
	};

	private emit(changed: Record<string, unknown>, removed: string[]): void {
		for (const listener of this.listeners) {
			listener(changed, removed);
		}
	}

	// A hand-edited or corrupted entry shouldn't take down the rest of a
	// getAll()/onChange notification — treat it the same as a key that
	// doesn't exist, rather than letting JSON.parse throw out of here.
	private parseValue(raw: string): { parsed: true; value: unknown } | { parsed: false } {
		try {
			return { parsed: true, value: JSON.parse(raw) };
		} catch {
			return { parsed: false };
		}
	}
}
