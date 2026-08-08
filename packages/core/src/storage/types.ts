export interface StorageAdapter {
	getAll(): Promise<Record<string, unknown>>;
	set(entries: Record<string, unknown>): Promise<void>;
	remove(keys: string[]): Promise<void>;
	onChange(cb: (changed: Record<string, unknown>, removed: string[]) => void): () => void;
}
