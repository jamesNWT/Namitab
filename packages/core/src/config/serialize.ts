/*
browser.storage.sync has a per-item size limit and a write rate limit, so we can't store the entire
Config blob all at once.

Furthermore, when using browser.storage.sync, syncing the whole blob at once means that concurrent
edits on two devices would only keep the last one. 

To handle this, we serialize the Config object into a Record with one key per section and one key
per shortcut and store the key value pairs individually.
*/

import type { Config } from './schema';

const SHORTCUT_PREFIX = 'shortcut:';

export function toStorageEntries(config: Config): Record<string, unknown> {
	const entries: Record<string, unknown> = {
		meta: { version: config.version, defaultSearchEngineId: config.defaultSearchEngineId },
		searchEngines: config.searchEngines,
		theme: config.theme,
		background: config.background
	};

	config.shortcuts.forEach((sc) => {
		entries[`${SHORTCUT_PREFIX}${sc.id}`] = sc;
	});

	return entries;
}

// Don't validate/throw an error while reconstructing the Config object, validation of the object is handled in migrateConfig.
export function fromStorageEntries(entries: Record<string, unknown>): unknown {
	const meta = isRecord(entries.meta) ? entries.meta : {};

	const shortcuts = Object.entries(entries)
		.filter(([key]) => key.startsWith(SHORTCUT_PREFIX))
		.map(([, value]) => value)
		.sort(compareShortcuts);

	return {
		version: meta.version,
		defaultSearchEngineId: meta.defaultSearchEngineId,
		searchEngines: entries.searchEngines,
		theme: entries.theme,
		background: entries.background,
		shortcuts
	};
}

export function diffStorageEntries(
	prev: Record<string, unknown>,
	next: Record<string, unknown>
): { set: Record<string, unknown>; remove: string[] } {
	const set: Record<string, unknown> = {};
	const remove: string[] = [];

	Object.keys(next).forEach((k) => {
		if (!Object.hasOwn(prev, k) || JSON.stringify(prev[k]) !== JSON.stringify(next[k])) {
			set[k] = next[k];
		}
	});

	Object.keys(prev).forEach((k) => {
		if (!Object.hasOwn(next, k)) {
			remove.push(k);
		}
	});

	return { set, remove };
}

// For imposing an order on the shortcuts, since no key order is guaranteed out of storage.
function compareShortcuts(a: unknown, b: unknown): number {
	const byOrder = numberField(a, 'order') - numberField(b, 'order');
	if (byOrder !== 0) return byOrder;
	const idA = stringField(a, 'id');
	const idB = stringField(b, 'id');
	return idA < idB ? -1 : idA > idB ? 1 : 0;
}

// The below functions are for handling unknown without throwing.

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberField(value: unknown, field: string): number {
	if (!isRecord(value)) return 0;
	const fieldValue = value[field];
	return typeof fieldValue === 'number' ? fieldValue : 0;
}

function stringField(value: unknown, field: string): string {
	if (!isRecord(value)) return '';
	const fieldValue = value[field];
	return typeof fieldValue === 'string' ? fieldValue : '';
}
