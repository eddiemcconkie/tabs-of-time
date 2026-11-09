import { describe, expect, it } from 'vitest';
import {
	createLine,
	createNote,
	decodeNote,
	decodeTabs,
	encodeNote,
	encodeTabs,
	midiToHz,
	noteMidi
} from './tabs';

describe('tab URL codec', () => {
	it('encodes controls in canonical button, accidental, bend order', () => {
		expect(encodeNote(createNote('Y', 'L', 'U'))).toBe('YLU');
	});

	it('round-trips lines and notes', () => {
		const source = [
			createLine([createNote('A'), createNote('B', null, 'U')]),
			createLine([createNote('X', 'Z'), createNote('Y', 'L', 'D')])
		];
		const encoded = encodeTabs(source);
		const decoded = decodeTabs(encoded);

		expect(encoded).toBe('A-BU|XZ-YLD');
		expect(encodeTabs(decoded.lines)).toBe(encoded);
		expect(decoded.invalidTokens).toEqual([]);
	});

	it('rejects ambiguous or impossible tokens', () => {
		expect(decodeNote('AB')).toBeNull();
		expect(decodeNote('ALZ')).toBeNull();
		expect(decodeNote('AU L')).toBeNull();
	});

	it('keeps valid notes when a shared URL contains invalid tokens', () => {
		const result = decodeTabs('A-NOPE-XZ');
		expect(encodeTabs(result.lines)).toBe('A-XZ');
		expect(result.invalidTokens).toEqual(['NOPE']);
	});

	it('does not treat plus signs as note separators', () => {
		const result = decodeTabs('A+BU|XZ');
		expect(encodeTabs(result.lines)).toBe('|XZ');
		expect(result.invalidTokens).toEqual(['A+BU']);
	});
});

describe('note pitch model', () => {
	// Classic ocarina layout: R=D4, B=F4, A=A4, Y=B4, X=D5; L is sharp, ZL flat.
	it('maps the five sound buttons to their game pitches', () => {
		expect(noteMidi(createNote('R'))).toBe(62); // D4
		expect(noteMidi(createNote('B'))).toBe(65); // F4
		expect(noteMidi(createNote('A'))).toBe(69); // A4
		expect(noteMidi(createNote('Y'))).toBe(71); // B4
		expect(noteMidi(createNote('X'))).toBe(74); // D5
	});

	it('applies half steps and whole-step bends', () => {
		expect(noteMidi(createNote('A', 'L'))).toBe(70); // A4 sharp
		expect(noteMidi(createNote('A', 'Z'))).toBe(68); // A4 flat
		expect(noteMidi(createNote('A', null, 'U'))).toBe(71); // bend up a whole step
		expect(noteMidi(createNote('A', null, 'D'))).toBe(67); // bend down a whole step
		expect(noteMidi(createNote('R', 'Z', 'D'))).toBe(59); // lowest reachable note
		expect(noteMidi(createNote('X', 'L', 'U'))).toBe(77); // highest reachable note
	});

	it('converts MIDI to standard A440 frequencies', () => {
		expect(midiToHz(69)).toBeCloseTo(440);
		expect(midiToHz(62)).toBeCloseTo(293.66, 1); // D4
	});
});
