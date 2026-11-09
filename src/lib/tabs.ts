// Button order highest → lowest note for the builder toolbar.
export const PLAY_BUTTONS = ['X', 'Y', 'A', 'B', 'R'] as const;
export const ACCIDENTALS = ['L', 'Z'] as const;
export const BENDS = ['U', 'D'] as const;

export type PlayButton = (typeof PLAY_BUTTONS)[number];
export type Accidental = (typeof ACCIDENTALS)[number] | null;
export type Bend = (typeof BENDS)[number] | null;
export interface TabNote {
	id: string;
	button: PlayButton;
	accidental: Accidental;
	bend: Bend;
}

export interface TabLine {
	id: string;
	notes: TabNote[];
}

export interface DecodeResult {
	lines: TabLine[];
	invalidTokens: string[];
}

let nextId = 0;

export function makeId(prefix: 'note' | 'line'): string {
	nextId += 1;
	return `${prefix}-${nextId}`;
}

export function createNote(
	button: PlayButton = 'A',
	accidental: Accidental = null,
	bend: Bend = null
): TabNote {
	return { id: makeId('note'), button, accidental, bend };
}

export function createLine(notes: TabNote[] = []): TabLine {
	return { id: makeId('line'), notes };
}

export function cloneNote(note: TabNote): TabNote {
	return createNote(note.button, note.accidental, note.bend);
}

export function encodeNote(note: Pick<TabNote, 'button' | 'accidental' | 'bend'>): string {
	return `${note.button}${note.accidental ?? ''}${note.bend ?? ''}`;
}

export function encodeTabs(lines: TabLine[]): string {
	if (!lines.some((line) => line.notes.length > 0)) return '';
	return lines.map((line) => line.notes.map(encodeNote).join('-')).join('|');
}

export function decodeNote(token: string): TabNote | null {
	const match = /^([ABXYR])([LZ]?)([UD]?)$/.exec(token.trim().toUpperCase());
	if (!match) return null;

	return createNote(
		match[1] as PlayButton,
		(match[2] || null) as Accidental,
		(match[3] || null) as Bend
	);
}

export function decodeTabs(value: string): DecodeResult {
	const invalidTokens: string[] = [];
	if (!value) return { lines: [createLine()], invalidTokens };

	const lines = value.split('|').map((encodedLine) => {
		const notes = encodedLine
			.split('-')
			.filter(Boolean)
			.flatMap((token) => {
				const note = decodeNote(token);
				if (!note) invalidTokens.push(token);
				return note ? [note] : [];
			});
		return createLine(notes);
	});

	return { lines: lines.length ? lines : [createLine()], invalidTokens };
}

export function readableNote(note: TabNote): string {
	const parts: string[] = [note.button];
	if (note.accidental === 'L') parts.push('L (+ half step)');
	if (note.accidental === 'Z') parts.push('ZL (− half step)');
	if (note.bend === 'U') parts.push('Stick ↑');
	if (note.bend === 'D') parts.push('Stick ↓');
	return parts.join(' + ');
}

/**
 * MIDI note number a note sounds as, following the classic ocarina layout
 * (A = D4, C-down = F4, C-right = A4, C-left = B4, C-up = D5):
 * L shifts a semitone up, ZL a semitone down, and the stick bends a whole step.
 * The sound buttons stand in for the five play notes: R is the lowest (D4).
 */
const BASE_SEMITONES: Record<PlayButton, number> = {
	R: 0, // D4
	B: 3, // F4
	A: 7, // A4
	Y: 9, // B4
	X: 12 // D5
};

export function noteMidi(note: Pick<TabNote, 'button' | 'accidental' | 'bend'>): number {
	let midi = 62; // D4
	midi += BASE_SEMITONES[note.button];
	if (note.accidental === 'L') midi += 1;
	if (note.accidental === 'Z') midi -= 1;
	if (note.bend === 'U') midi += 2;
	if (note.bend === 'D') midi -= 2;
	return midi;
}

/** Frequency in Hz from a MIDI note number under A440 tuning. */
export function midiToHz(midi: number): number {
	return 440 * 2 ** ((midi - 69) / 12);
}
