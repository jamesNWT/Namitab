import type { ColorSchemeId, ColorOverrides } from './schema';

export const colorSchemePresets: Record<ColorSchemeId, ColorOverrides> = {
	vaporwave: {
		border: '#f1adc3',
		commandlineBg: '#fdebf1',
		topbarBg: '#ad78ba',
		text: 'rgb(0, 0, 0)',
		mainBg: '#fcdfe8',
		sideImage: 'wavepink.png'
	},
	// Corrected values from origin/darkmode's main-dark.css, with the
	// text color fix from commit 226bae9 (raw darkmode used near-black
	// text, which was unreadable against the dark background).
	dark: {
		border: '#41596c',
		commandlineBg: '#9ca49e',
		topbarBg: '#e08e63',
		text: 'rgba(248, 231, 231, 0.973)',
		mainBg: '#1d242a',
		sideImage: 'skyline.gif'
	},
	// TODO: no source of truth for a dedicated light scheme yet.
	light: {}
};
