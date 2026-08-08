export interface ParsedCommand {
	prefix: string | null;
	args: string;
}

/**
 * Splits on the first whitespace rather than a fixed 2-character prefix —
 * fixes the legacy `input.substr(0, 2)` / `input.substr(3)` bug that broke
 * on prefixes of any other length and swallowed extra spaces.
 */
export function parseCommandInput(input: string): ParsedCommand {
	if (!input.startsWith('-')) {
		return { prefix: null, args: input };
	}

	const spaceIndex = input.indexOf(' ');
	if (spaceIndex === -1) {
		return { prefix: input, args: '' };
	}

	return {
		prefix: input.slice(0, spaceIndex),
		args: input.slice(spaceIndex + 1)
	};
}
