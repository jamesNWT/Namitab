import { describe, expect, it } from 'vitest';
import { toStorageEntries } from './serialize';
import type { Config } from './schema';
import { defaultConfig } from './defaults';

const config: Config = {
	...defaultConfig,
	shortcuts: [{ id: 'abc', name: 'gh', url: 'https://github.com', category: 'dev' }]
};

describe('toStorageEntries', () => {
	it('returns an indexable record from the default config', () => {
		const result = toStorageEntries(config);
		expect(result.meta).toEqual({ version: 1, defaultSearchEngineId: 'google' });
		expect(result.searchEngines).toEqual(defaultConfig.searchEngines);
		expect(result.theme).toEqual(defaultConfig.theme);
		expect(result.background).toEqual(defaultConfig.background);
		expect(result['shortcut:abc']).toEqual(config.shortcuts[0]);
	});
});
