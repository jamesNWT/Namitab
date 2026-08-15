import { configSchemaV1, type Config } from './schema';
import type { Result } from '../result';

function validateConfig(raw: unknown): Result<Config> {
	const result = configSchemaV1.safeParse(raw);
	if (!result.success) {
		return { ok: false, error: result.error.message };
	}
	return { ok: true, value: result.data };
}

export function migrateConfig(raw: unknown): Result<Config> {
	// Only one schema version exists today, so there's nothing to transform
	// yet — this just validates against the current schema. Once a v2
	// schema exists, a version-keyed transform would run here, ahead of
	// validateConfig, based on raw's declared `version`.
	return validateConfig(raw);
}
