import { describe, it, expect } from 'vitest';
import { migrateConfig } from './migrate';
import { defaultConfig } from './defaults';

describe('migrateConfig', () => {
	it('accepts the default config', () => {
		const result = migrateConfig(defaultConfig);
		expect(result.ok).toBe(true);
	});

	it('rejects an empty object without throwing', () => {
		expect(() => migrateConfig({})).not.toThrow();
		expect(migrateConfig({}).ok).toBe(false);
	});

	it('rejects null without throwing', () => {
		expect(() => migrateConfig(null)).not.toThrow();
		expect(migrateConfig(null).ok).toBe(false);
	});

	it('rejects undefined without throwing', () => {
		expect(() => migrateConfig(undefined)).not.toThrow();
		expect(migrateConfig(undefined).ok).toBe(false);
	});
});
