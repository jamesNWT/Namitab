import { describe, it, expect } from 'vitest';
import { configSchemaV1 } from './schema';
import { defaultConfig } from './defaults';

describe('configSchemaV1', () => {
	it('accepts a valid config', () => {
		const result = configSchemaV1.safeParse(defaultConfig);
		expect(result.success).toBe(true);
	});

	it('rejects duplicate shortcut names', () => {
		const result = configSchemaV1.safeParse({
			...defaultConfig,
			shortcuts: [
				{ id: '1', name: 'dup', url: 'https://a.example', category: 'x' },
				{ id: '2', name: 'dup', url: 'https://b.example', category: 'x' }
			]
		});
		expect(result.success).toBe(false);
	});

	it('rejects duplicate search engine ids', () => {
		const result = configSchemaV1.safeParse({
			...defaultConfig,
			searchEngines: [...defaultConfig.searchEngines, defaultConfig.searchEngines[0]]
		});
		expect(result.success).toBe(false);
	});

	it('rejects a defaultSearchEngineId that references a missing engine', () => {
		const result = configSchemaV1.safeParse({
			...defaultConfig,
			defaultSearchEngineId: 'does-not-exist'
		});
		expect(result.success).toBe(false);
	});

	it('rejects an invalid background url', () => {
		const result = configSchemaV1.safeParse({
			...defaultConfig,
			background: { type: 'url', value: 'not-a-url' }
		});
		expect(result.success).toBe(false);
	});
});
