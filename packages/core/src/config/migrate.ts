import { configSchemaV1, type Config } from './schema';

export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function migrateConfig(raw: unknown): StoreResult<Config> {
	// Only one schema version exists today; a v1 -> v2 transform would run
	// here, keyed off `raw.version`, before validating against the latest
	// schema.
	const result = configSchemaV1.safeParse(raw);
	if (!result.success) {
		return { ok: false, error: result.error.message };
	}
	return { ok: true, value: result.data };
}
