import { midiToHz, noteMidi } from './tabs.js';
import type { TabNote } from './tabs.js';

/**
 * Sampled piano playback: Steinway grand single notes from the University of
 * Iowa Musical Instrument Samples (an anechoic-chamber recording, freely
 * usable). Each sound button anchors to its own exact pitch (D4→D5), so
 * accidentals/bends rate-shift at most ±3 semitones.
 */

const SAMPLES = [
	{ url: '/audio/note_d4.mp3', midi: 62, duration: 1.62 }, // D4 (R button)
	{ url: '/audio/note_f4.mp3', midi: 65, duration: 1.28 }, // F4 (B button)
	{ url: '/audio/note_a4.mp3', midi: 69, duration: 1.02 }, // A4 (A button)
	{ url: '/audio/note_b4.mp3', midi: 71, duration: 1.28 }, // B4 (Y button)
	{ url: '/audio/note_d5.mp3', midi: 74, duration: 1.28 } // D5 (X button)
] as const;

const CLICK_FADE = 0.012; // short fade-in to avoid clicks on rapid taps
const TRAIL_HEADROOM = 0.3; // samples carry their own release fade
const CLICK_GATE = 0.08;

interface LoadedSample {
	buffer: AudioBuffer;
	duration: number;
}

let ctx: AudioContext | null = null;
const loaded = new Map<string, LoadedSample>();
let loading = false;
let lastPlayed = 0;

function ensureContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!ctx) {
		const legacy = window as Window & { webkitAudioContext?: typeof AudioContext };
		const Ctor = window.AudioContext ?? legacy.webkitAudioContext;
		if (!Ctor) return null;
		ctx = new Ctor();
	}
	if (ctx.state === 'suspended') void ctx.resume();
	return ctx;
}

async function fetchSample(audio: AudioContext, url: string): Promise<AudioBuffer> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Sample fetch failed: ${url}`);
	return audio.decodeAudioData(await response.arrayBuffer());
}

/** Kick off loading immediately so the first tap isn't silent. */
export function preloadSamples(): void {
	if (loading) return;
	const audio = ensureContext();
	if (!audio) return;
	loading = true;
	void Promise.all([
		...SAMPLES.map(async (sample) => {
			if (loaded.has(sample.url)) return;
			try {
				loaded.set(sample.url, {
					buffer: await fetchSample(audio, sample.url),
					duration: sample.duration
				});
			} catch {
				// Playback silently skips until the next attempt loads.
			}
		})
	]).finally(() => {
		loading = false;
	});
}

/** Frequency in Hz a note sounds as under A440 tuning. */
export function noteHz(note: Pick<TabNote, 'button' | 'accidental' | 'bend'>): number {
	return midiToHz(noteMidi(note));
}

/** Play the pitch a note would sound as with the nearest anchored flute sample. */
export function playNote(note: Pick<TabNote, 'button' | 'accidental' | 'bend'>): void {
	const audio = ensureContext();
	if (!audio) return;
	preloadSamples();

	const hz = noteHz(note);
	if (!Number.isFinite(hz)) return;

	const targetMidi = noteMidi(note);
	let best: (typeof SAMPLES)[number] | null = null;
	for (const sample of SAMPLES) {
		if (!best || Math.abs(sample.midi - targetMidi) < Math.abs(best.midi - targetMidi)) {
			best = sample;
		}
	}
	if (!best) return;

	const loadedSample = loaded.get(best.url);
	if (!loadedSample) return;

	const rate = hz / midiToHz(best.midi);
	const playbackLength = loadedSample.duration / rate;

	// Rapid re-triggers (tweaking inputs fast) space out instead of clashing,
	// but never drift ahead of "now" and gag on their own wake-up.
	const now = audio.currentTime;
	const start = Math.max(now, lastPlayed + CLICK_GATE);
	lastPlayed = start;

	const bufferSource = audio.createBufferSource();
	bufferSource.buffer = loadedSample.buffer;
	bufferSource.playbackRate.value = rate;

	const envelope = audio.createGain();
	envelope.gain.setValueAtTime(0, start);
	envelope.gain.linearRampToValueAtTime(0.5, start + CLICK_FADE);
	const fadeOutStart = start + Math.max(CLICK_FADE + 0.01, playbackLength - TRAIL_HEADROOM);
	envelope.gain.setValueAtTime(0.5, fadeOutStart);
	envelope.gain.linearRampToValueAtTime(0, fadeOutStart + TRAIL_HEADROOM);
	bufferSource.connect(envelope).connect(audio.destination);
	bufferSource.start(start);
}
