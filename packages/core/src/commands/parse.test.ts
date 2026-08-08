import { describe, it, expect } from 'vitest';
import { parseCommandInput } from './parse';

describe('parseCommandInput', () => {
	it('splits a prefixed command on the first whitespace', () => {
		expect(parseCommandInput('-d hello world')).toEqual({ prefix: '-d', args: 'hello world' });
	});

	it('returns empty args for a bare prefix with no arguments', () => {
		expect(parseCommandInput('-w')).toEqual({ prefix: '-w', args: '' });
	});

	it('treats a query with no dash prefix as a null-prefix query', () => {
		expect(parseCommandInput('cats and dogs')).toEqual({ prefix: null, args: 'cats and dogs' });
	});

	it('preserves multi-word -a args, unlike the legacy fixed-offset substr(3) parser', () => {
		expect(parseCommandInput('-a name url category')).toEqual({
			prefix: '-a',
			args: 'name url category'
		});
	});
});
