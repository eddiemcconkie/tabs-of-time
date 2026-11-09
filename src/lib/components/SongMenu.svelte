<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	interface Props {
		title: string;
		ondelete: () => void;
	}

	let { title, ondelete }: Props = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="song-menu-trigger" aria-label={`${title} menu`} title="Song menu">
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="5" cy="12" r="1.6" />
			<circle cx="12" cy="12" r="1.6" />
			<circle cx="19" cy="12" r="1.6" />
		</svg>
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content class="song-menu-content" sideOffset={5} align="end" collisionPadding={8}>
			<DropdownMenu.Item class="song-menu-item danger" onclick={ondelete}
				>× <span>Delete</span></DropdownMenu.Item
			>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	:global(.song-menu-trigger) {
		display: grid;
		width: 2.1rem;
		align-self: stretch;
		place-items: center;
		padding: 0.42rem;
		border: 0;
		border-left: 1px solid #456752;
		border-radius: 0;
		background: rgba(9, 22, 15, 0.35);
		color: #91a69a;
		cursor: pointer;
	}

	:global(.song-menu-trigger:hover),
	:global(.song-menu-trigger[data-state='open']) {
		color: var(--gold-light);
		background: rgba(210, 169, 71, 0.08);
	}

	:global(.song-menu-trigger svg) {
		width: 100%;
		height: 100%;
		fill: currentColor;
	}

	:global(.song-menu-content) {
		z-index: 100;
		width: 8rem;
		padding: 0.28rem;
		border: 1px solid rgba(210, 169, 71, 0.35);
		border-radius: var(--radius-lg);
		outline: none;
		background: rgba(24, 16, 9, 0.98);
		color: #ece4d6;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
	}

	:global(.song-menu-item) {
		display: grid;
		grid-template-columns: 1.2rem 1fr;
		align-items: center;
		min-height: 2rem;
		padding: 0.38rem 0.38rem 0.38rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: default;
		user-select: none;
	}

	:global(.song-menu-item[data-highlighted]) {
		background: rgba(210, 169, 71, 0.16);
		color: #f5f0d8;
		outline: none;
	}

	:global(.song-menu-item.danger) {
		color: #ef9c91;
	}
</style>
