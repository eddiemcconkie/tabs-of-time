<script lang="ts">
	import type { Accidental, Bend, PlayButton, TabNote } from '#lib/tabs.js';
	import { ACCIDENTALS, BENDS, PLAY_BUTTONS, createNote } from '#lib/tabs.js';
	import { playNote } from '#lib/audio.js';
	import ControlGlyph from './ControlGlyph.svelte';

	interface Props {
		value: TabNote;
		editing: boolean;
		onchange: (note: TabNote) => void;
		onsubmit: () => void;
		ondelete: () => void;
		onaddbefore: () => void;
		onaddafter: () => void;
	}

	let { value, editing, onchange, onsubmit, ondelete, onaddbefore, onaddafter }: Props = $props();

	const glyphNames: Record<PlayButton, 'a' | 'b' | 'x' | 'y' | 'r'> = {
		A: 'a',
		B: 'b',
		X: 'x',
		Y: 'y',
		R: 'r'
	};

	function chooseButton(button: PlayButton) {
		onchange(createNote(button, value.accidental, value.bend));
		playNote({ button, accidental: value.accidental, bend: value.bend });
	}

	function toggleAccidental(accidental: Exclude<Accidental, null>) {
		const next = value.accidental === accidental ? null : accidental;
		onchange(createNote(value.button, next, value.bend));
		playNote({ button: value.button, accidental: next, bend: value.bend });
	}

	function toggleBend(bend: Exclude<Bend, null>) {
		const next = value.bend === bend ? null : bend;
		onchange(createNote(value.button, value.accidental, next));
		playNote({ button: value.button, accidental: value.accidental, bend: next });
	}
</script>

<section class="builder" aria-label="Note composer">
	<div class="controls-col">
		<p class="notice">Classic layout</p>
		<div class="controller">
			<fieldset>
				<legend class="sr-only">Pitch bend</legend>
				{#each BENDS as bend (bend)}
					<button
						type="button"
						class="ctl"
						data-pos={bend === 'U' ? 'up' : 'down'}
						class:active={value.bend === bend}
						onclick={() => toggleBend(bend)}
						aria-label={`Bend ${bend === 'U' ? 'up' : 'down'}`}
						aria-pressed={value.bend === bend}
					>
						<ControlGlyph
							name="stick"
							active={value.bend === bend}
							direction={bend === 'U' ? 'up' : 'down'}
							label={bend}
						/>
					</button>
				{/each}
			</fieldset>

			<fieldset>
				<legend class="sr-only">Half step</legend>
				{#each ACCIDENTALS as accidental (accidental)}
					<button
						type="button"
						class="ctl"
						data-pos={accidental === 'Z' ? 'zl' : 'l'}
						class:active={value.accidental === accidental}
						onclick={() => toggleAccidental(accidental)}
						aria-label={accidental === 'Z' ? 'ZL, half step down' : 'L, half step up'}
						aria-pressed={value.accidental === accidental}
					>
						<ControlGlyph
							name={accidental === 'Z' ? 'zl' : 'l'}
							active={value.accidental === accidental}
							label={accidental}
						/>
					</button>
				{/each}
			</fieldset>

			<fieldset>
				<legend class="sr-only">Note</legend>
				{#each PLAY_BUTTONS as button (button)}
					<button
						type="button"
						class="ctl"
						data-pos={button.toLowerCase()}
						class:active={value.button === button}
						onclick={() => chooseButton(button)}
						aria-label={button}
						aria-pressed={value.button === button}
					>
						<ControlGlyph
							name={glyphNames[button]}
							active={value.button === button}
							label={button}
						/>
					</button>
				{/each}
			</fieldset>
		</div>
	</div>

	<div class="actions">
		{#if editing}
			<button type="button" class="button secondary danger" onclick={ondelete}>Delete</button>
			<div class="pair">
				<button type="button" class="button secondary" onclick={onaddbefore}>Before</button>
				<button type="button" class="button secondary" onclick={onaddafter}>After</button>
			</div>
			<button type="button" class="button gold" onclick={onsubmit}>Update</button>
		{:else}
			<button type="button" class="button gold" onclick={onsubmit}>Add</button>
		{/if}
	</div>
</section>

<style>
	.builder {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		padding: 0.9rem;
		border: 1px solid #4a6655;
		border-radius: var(--radius-md);
		background: #132d20;
		color: var(--ink);
	}

	.controls-col {
		flex: none;
	}

	.notice {
		margin: 0 0 0.35rem;
		color: #b3a78e;
		font: 400 0.72rem/1 var(--font-display);
	}

	/* Controller copy: same geometry as the note display (NoteCard), scaled ~2x so
	   each control sits where its glyph sits on a note. Left column = ZL/L + stick;
	   right cluster = R + A/B/X/Y perfect diamond, flush right. */
	.controller {
		position: relative;
		width: 12.6rem;
		flex: none;
		height: 9.9rem;
	}

	fieldset {
		display: contents;
	}

	.ctl {
		position: absolute;
		display: grid;
		width: 2.7rem;
		height: 2.7rem;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
	}

	.ctl :global(img),
	.ctl :global(.stick-glyph) {
		width: 100%;
		height: 100%;
	}

	/* Left column: shoulders + bend pair in the stick's spot */
	.ctl[data-pos='zl'] {
		left: 0;
		top: 0;
	}
	.ctl[data-pos='l'] {
		left: 3.05rem;
		top: 0;
	}
	.ctl[data-pos='up'] {
		left: 0.25rem;
		top: 3.4rem;
	}
	.ctl[data-pos='down'] {
		left: 0.25rem;
		bottom: 0.9rem;
	}

	/* Right cluster: centers of X/Y/A/B sit on a perfect diamond
	   (equal 2.35rem steps horizontally and vertically), R above A. */
	.ctl[data-pos='r'] {
		right: 0;
		top: 0;
	}
	.ctl[data-pos='x'] {
		left: 7.55rem;
		top: 2.05rem;
	}
	.ctl[data-pos='y'] {
		left: 5.2rem;
		top: 4.4rem;
	}
	.ctl[data-pos='a'] {
		left: 9.9rem;
		top: 4.4rem;
	}
	.ctl[data-pos='b'] {
		left: 7.55rem;
		top: 6.75rem;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex: 1;
		min-width: 0;
	}

	.actions .pair {
		display: flex;
		gap: 0.35rem;
	}

	.actions .pair > .button {
		flex: 1;
		min-width: 0;
	}

	.actions .danger {
		border-color: #a94e43;
		color: #ef9c91;
	}

	@media (max-width: 780px) {
		.builder {
			border: 0;
			border-top: 1px solid #4a6655;
			border-radius: 0;
		}
	}

	@media (max-width: 560px) {
		.builder {
			gap: 0.6rem;
			padding: 0.65rem;
		}
	}

	@media (max-width: 420px) {
		.controller {
			zoom: 0.85;
		}
	}
</style>
