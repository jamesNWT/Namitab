/*
browser.storage.sync has a per-item size limit and a write rate limit, so we can't serialize the 
entire Config blob all at once.

Furthermore, granular writes to the config could cause sync conflicts if the whole config was
stored as one blob. So we'll serialize the blob into a record of keys and values for 
reading/writing from storage.
*/

import type { Config } from './schema';

export function toStorageEntries(config: Config): Record<string, unknown> {
	const entries: Record<string, unknown> = {
		meta: { version: config.version, defaultSearchEngineId: config.defaultSearchEngineId },
		searchEngines: config.searchEngines,
		theme: config.theme,
		background: config.background
	};

	config.shortcuts.forEach((sc) => {
		entries[`shortcut:${sc.id}`] = sc;
	});

	return entries;
}
