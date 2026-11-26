import { describe, expect, it } from 'vitest';
import { fromStorageEntries, toStorageEntries, diffStorageEntries } from './serialize';
import type { Config } from './schema';
import { defaultConfig } from './defaults';

const config: Config = {
	...defaultConfig,
	shortcuts: [{ id: 'abc', name: 'gh', url: 'https://github.com', category: 'dev', order: 0 }]
};

const exampleEntriesA = {
	meta: { version: 1, defaultSearchEngineId: 'google' },
	searchEngines: defaultConfig.searchEngines,
	theme: defaultConfig.theme,
	background: defaultConfig.background,
	'shortcut:abc': { id: 'abc', name: 'gh', url: 'https://github.com', category: 'dev', order: 0 }
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

describe('fromStorageEntries', () => {
	it('passes malformed entries through without throwing', () => {
		const entries = {
			meta: null,
			searchEngines: 'junk',
			'shortcut:a': 5,
			'shortcut:b': null,
			'shortcut:c': { id: 'c', order: 'not a number' },
			unrelated: { anything: true }
		};

		expect(fromStorageEntries(entries)).toEqual({
			version: undefined,
			defaultSearchEngineId: undefined,
			searchEngines: 'junk',
			theme: undefined,
			background: undefined,
			shortcuts: expect.arrayContaining([5, null, { id: 'c', order: 'not a number' }])
		});
	});

	it('returns an empty shortcut list for empty storage', () => {
		expect(fromStorageEntries({})).toMatchObject({ shortcuts: [] });
	});
});

describe('diffStorageEntries', () => {
	it('returns empty set and remove when nothing changes', () => {
		const res = diffStorageEntries(exampleEntriesA, exampleEntriesA);
		expect(res).toEqual({ set: {}, remove: [] });
	});
});
