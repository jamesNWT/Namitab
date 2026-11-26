import { describe, expect, it } from 'vitest';
import { fromStorageEntries, toStorageEntries, diffStorageEntries } from './serialize';
import type { Config } from './schema';
import { defaultConfig } from './defaults';
import { record } from 'zod/v4';

const exampleShortcutABC =  { id: 'abc', name: 'gh', url: 'https://github.com', category: 'dev', order: 0 };

const config: Config = {
	...defaultConfig,
	shortcuts: [exampleShortcutABC]
};

const exampleEntries = {
	meta: { version: 1, defaultSearchEngineId: 'google' },
	searchEngines: defaultConfig.searchEngines,
	theme: defaultConfig.theme,
	background: defaultConfig.background,
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
	const exampleWithShortCut = { 
			...exampleEntries, 
			'shortcut:abc': exampleShortcutABC
		}
	
	it('returns empty set and remove when nothing changes', () => {
		const res = diffStorageEntries(exampleEntries, exampleEntries);
		expect(res).toEqual({ set: {}, remove: [] });
	});
	
	it('returns an entry in set for a shortcut that is in next but not prev', () => {
		const res = diffStorageEntries(exampleWithShortCut, exampleEntries);
		expect(res.set).toEqual({'shortcut:abc': exampleShortcutABC});
		expect(res.remove).toEqual([]);
	});

	it('returns the key in remove for a shortcut that is in prev but not in next', () => {
		const res = diffStorageEntries(exampleEntries, exampleWithShortCut);
		expect(res.set).toEqual({});
		expect(res.remove).toEqual(['shortcut:abc'])
	})
});
