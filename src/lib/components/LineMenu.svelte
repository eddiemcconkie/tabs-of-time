<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	interface Props {
		lineNumber: number;
		canMoveUp: boolean;
		canMoveDown: boolean;
		onmoveup: () => void;
		onmovedown: () => void;
		onduplicate: () => void;
		ondelete: () => void;
	}

	let { lineNumber, canMoveUp, canMoveDown, onmoveup, onmovedown, onduplicate, ondelete }: Props =
		$props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="line-menu-trigger"
		aria-label={`Line ${lineNumber} menu`}
		title="Line menu"
	>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="5" cy="12" r="1.6" />
			<circle cx="12" cy="12" r="1.6" />
			<circle cx="19" cy="12" r="1.6" />
		</svg>
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content class="line-menu-content" sideOffset={5} align="end" collisionPadding={8}>
			<DropdownMenu.Item class="line-menu-item" disabled={!canMoveUp} onclick={onmoveup}
				>↑ <span>Move up</span></DropdownMenu.Item
			>
			<DropdownMenu.Item class="line-menu-item" disabled={!canMoveDown} onclick={onmovedown}
				>↓ <span>Move down</span></DropdownMenu.Item
			>
			<DropdownMenu.Item class="line-menu-item" onclick={onduplicate}
				>⧉ <span>Duplicate</span></DropdownMenu.Item
			>
			<DropdownMenu.Separator class="line-menu-separator" />
			<DropdownMenu.Item class="line-menu-item danger" onclick={ondelete}
				>× <span>Delete</span></DropdownMenu.Item
			>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	:global(.line-menu-trigger) {
		display: grid;
		align-self: stretch;
		width: 1.5rem;
		place-items: center;
		padding: 0.3rem;
		border: 0;
		border-radius: 0;
		background: rgba(9, 22, 15, 0.35);
		color: #a8b2ab;
		cursor: pointer;
	}

	:global(.line-menu-trigger:hover),
	:global(.line-menu-trigger[data-state='open']) {
		color: var(--gold-light);
		background: rgba(210, 169, 71, 0.08);
	}

	:global(.line-menu-trigger svg) {
		width: 100%;
		height: 100%;
		fill: currentColor;
	}

	:global(.line-menu-content) {
		z-index: 100;
		width: 9.5rem;
		padding: 0.28rem;
		border: 1px solid rgba(210, 169, 71, 0.35);
		border-radius: var(--radius-lg);
		outline: none;
		background: rgba(24, 16, 9, 0.98);
		color: #ece4d6;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
	}

	:global(.line-menu-item) {
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

	:global(.line-menu-item[data-highlighted]) {
		background: rgba(210, 169, 71, 0.16);
		color: #f5f0d8;
		outline: none;
	}

	:global(.line-menu-item[data-disabled]) {
		color: #657069;
	}

	:global(.line-menu-item.danger) {
		color: #ef9c91;
	}

	:global(.line-menu-separator) {
		height: 1px;
		margin: 0.2rem 0.35rem;
		background: rgba(210, 169, 71, 0.2);
	}
</style>
