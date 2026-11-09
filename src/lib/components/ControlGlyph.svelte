<script lang="ts">
	interface Props {
		name: 'a' | 'b' | 'x' | 'y' | 'l' | 'r' | 'zl' | 'stick';
		active?: boolean;
		/** Required for the stick: which directional stick icon to show. */
		direction?: 'up' | 'down' | null;
		label: string;
		/** Extra warm + dimmed inactive state, for glyphs on the note display. */
		dim?: boolean;
	}

	let { name, active = false, direction = null, label, dim = false }: Props = $props();

	let filename = $derived(
		name === 'stick'
			? `switch_stick_l_${direction ?? 'up'}.svg`
			: `switch_button_${name}${active ? '' : '_outline'}.svg`
	);
</script>

<img
	class="glyph"
	class:active
	class:dim
	src={`/icons/${filename}`}
	alt=""
	title={label}
	aria-hidden="true"
/>

<style>
	.glyph {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		opacity: 0.5;
		filter: sepia(1) hue-rotate(-14deg) brightness(1.3);
	}

	.glyph.dim {
		opacity: 0.24;
		filter: sepia(1) sepia(0.6) hue-rotate(-20deg) brightness(1.4);
	}

	.glyph.active {
		opacity: 1;
		filter: brightness(0) saturate(100%) invert(78%) sepia(69%) saturate(627%) hue-rotate(353deg)
			brightness(99%) contrast(89%);
	}
</style>
