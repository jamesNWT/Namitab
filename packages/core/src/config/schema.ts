import { z } from 'zod';

export const searchEngineSchema = z.object({
	id: z.string(),
	name: z.string(),
	// Base URL that command handlers append encodeURIComponent(query) to —
	// not a %s-template, matching the legacy app's concatenation behavior.
	urlTemplate: z.string().url(),
	prefix: z.string().optional()
});
export type SearchEngine = z.infer<typeof searchEngineSchema>;

export const shortcutSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string(),
	category: z.string()
});
export type Shortcut = z.infer<typeof shortcutSchema>;

export const colorOverridesSchema = z
	.object({
		border: z.string(),
		commandlineBg: z.string(),
		topbarBg: z.string(),
		text: z.string(),
		mainBg: z.string(),
		sideImage: z.string()
	})
	.partial();
export type ColorOverrides = z.infer<typeof colorOverridesSchema>;

export const colorSchemeIdSchema = z.enum(['vaporwave', 'light', 'dark']);
export type ColorSchemeId = z.infer<typeof colorSchemeIdSchema>;

export const chromeStyleIdSchema = z.enum(['win95']);
export type ChromeStyleId = z.infer<typeof chromeStyleIdSchema>;

export const themeSchema = z.object({
	colorSchemeId: colorSchemeIdSchema,
	colorOverrides: colorOverridesSchema,
	chromeStyleId: chromeStyleIdSchema,
	effects: z.object({
		scanlines: z.boolean(),
		glow: z.boolean()
	})
});
export type Theme = z.infer<typeof themeSchema>;

export const backgroundSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('preset'), value: z.string() }),
	z.object({ type: z.literal('url'), value: z.string().url() })
]);
export type Background = z.infer<typeof backgroundSchema>;

export const configSchemaV1 = z
	.object({
		version: z.literal(1),
		searchEngines: z.array(searchEngineSchema),
		defaultSearchEngineId: z.string(),
		shortcuts: z.array(shortcutSchema),
		theme: themeSchema,
		background: backgroundSchema
	})
	.refine(
		(config) => config.searchEngines.some((engine) => engine.id === config.defaultSearchEngineId),
		{
			message: 'defaultSearchEngineId must reference an existing search engine id',
			path: ['defaultSearchEngineId']
		}
	)
	.refine(
		(config) =>
			new Set(config.searchEngines.map((engine) => engine.id)).size === config.searchEngines.length,
		{ message: 'search engine ids must be unique', path: ['searchEngines'] }
	)
	.refine(
		(config) =>
			new Set(config.shortcuts.map((shortcut) => shortcut.name)).size === config.shortcuts.length,
		{ message: 'shortcut names must be unique', path: ['shortcuts'] }
	);
export type Config = z.infer<typeof configSchemaV1>;
