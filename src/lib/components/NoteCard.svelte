<script lang="ts">
	import type { TabNote } from '#lib/tabs.js';
	import { readableNote } from '#lib/tabs.js';
	import ControlGlyph from './ControlGlyph.svelte';

	interface Props {
		note: TabNote;
		selected?: boolean;
		interactive?: boolean;
		flash?: boolean;
		onselect?: () => void;
	}

	let { note, selected = false, interactive = false, flash = false, onselect }: Props = $props();
	let label = $derived(readableNote(note));
</script>

{#if interactive}
	<button
		type="button"
		class={['note-card', { selected, flash }]}
		onclick={onselect}
		aria-label={`Edit note: ${label}`}
		aria-pressed={selected}
	>
		{@render content()}
	</button>
{:else}
	<div class="note-card" aria-label={label}>
		{@render content()}
	</div>
{/if}

{#snippet content()}
	<span class="controller" aria-hidden="true">
		<span class="shoulder zl"
			><ControlGlyph dim name="zl" active={note.accidental === 'Z'} label="ZL" /></span
		>
		<span class="shoulder l"
			><ControlGlyph dim name="l" active={note.accidental === 'L'} label="L" /></span
		>
		<span class="stick up"
			><ControlGlyph
				dim
				name="stick"
				active={note.bend === 'U'}
				direction="up"
				label="Left stick up"
			/></span
		>
		<span class="stick down"
			><ControlGlyph
				dim
				name="stick"
				active={note.bend === 'D'}
				direction="down"
				label="Left stick down"
			/></span
		>
		<span class="shoulder r"
			><ControlGlyph dim name="r" active={note.button === 'R'} label="R" /></span
		>
		<span class="face x"><ControlGlyph dim name="x" active={note.button === 'X'} label="X" /></span>
		<span class="face y"><ControlGlyph dim name="y" active={note.button === 'Y'} label="Y" /></span>
		<span class="face a"><ControlGlyph dim name="a" active={note.button === 'A'} label="A" /></span>
		<span class="face b"><ControlGlyph dim name="b" active={note.button === 'B'} label="B" /></span>
	</span>
{/snippet}

<style>
	/* Flush tiling: note cards butt together edge-to-edge inside a line. */
	.note-card {
		position: relative;
		display: inline-grid;
		place-items: center;
		min-width: 3.6rem;
		width: 5.55rem;
		height: 4.4rem;
		padding: 0.3rem;
		border: 1px solid #43594c;
		border-radius: 0;
		background: #1a3528;
		color: var(--ink);
	}

	button.note-card {
		cursor: pointer;
	}

	button.note-card:hover,
	.note-card.selected {
		border-color: var(--gold);
		z-index: 1;
		box-shadow: inset 0 0 0 1px var(--gold);
	}

	.note-card.flash {
		animation: note-flash 1.1s ease-out;
	}

	@keyframes note-flash {
		0% {
			background: rgba(210, 169, 71, 0.55);
			border-color: var(--gold-light);
		}
		100% {
			background: #1a3528;
			border-color: #43594c;
		}
	}

	.controller {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
	}

	.controller > span {
		position: absolute;
		display: block;
		width: 1.05rem;
		height: 1.05rem;
	}

	.shoulder.zl {
		left: 0.05rem;
		top: 0.1rem;
	}
	.shoulder.l {
		left: 1.05rem;
		top: 0.1rem;
	}
	.shoulder.r {
		right: 0.05rem;
		top: 0.1rem;
	}
	.stick.up {
		left: 0.1rem;
		bottom: 1.25rem;
	}
	.stick.down {
		left: 0.1rem;
		bottom: 0.2rem;
	}
	.face.x {
		right: 1rem;
		top: 0.75rem;
	}
	.face.y {
		right: 1.9rem;
		top: 1.65rem;
	}
	.face.a {
		right: 0.1rem;
		top: 1.65rem;
	}
	.face.b {
		right: 1rem;
		top: 2.55rem;
	}
</style>
