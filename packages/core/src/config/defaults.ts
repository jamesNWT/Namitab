import type { Config } from './schema';

export const defaultConfig: Config = {
	version: 1,
	searchEngines: [
		{ id: 'google', name: 'Google', urlTemplate: 'https://www.google.com/search?q=' },
		{
			id: 'duckduckgo',
			name: 'DuckDuckGo',
			urlTemplate: 'https://duckduckgo.com/?q=',
			prefix: '-d'
		},
		{
			id: 'youtube',
			name: 'YouTube',
			urlTemplate: 'https://www.youtube.com/results?search_query=',
			prefix: '-y'
		},
		{
			id: 'wikipedia',
			name: 'Wikipedia',
			urlTemplate: 'https://en.wikipedia.org/wiki/Special:Search/',
			prefix: '-w'
		}
	],
	defaultSearchEngineId: 'google',
	shortcuts: [],
	theme: {
		colorSchemeId: 'vaporwave',
		colorOverrides: {},
		chromeStyleId: 'win95',
		effects: { scanlines: true, glow: true }
	},
	background: { type: 'preset', value: 'arizona' }
};
