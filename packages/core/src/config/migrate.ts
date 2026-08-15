import { configSchemaV1, type Config } from './schema';
import type { Result } from '../result';

export function migrateConfig(raw: unknown): Result<Config> {
	// Only one schema version exists today; a v1 -> v2 transform would run
	// here, keyed off `raw.version`, before validating against the latest
	// schema.
	const result = configSchemaV1.safeParse(raw);
	if (!result.success) {
		return { ok: false, error: result.error.message };
	}
	return { ok: true, value: result.data };
}
