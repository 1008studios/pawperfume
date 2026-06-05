<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		open: boolean;
		position?: { x: number; y: number };
		items: MenuItem[];
	}

	interface MenuItem {
		label: string;
		icon?: string;
		shortcut?: string;
		disabled?: boolean;
		danger?: boolean;
		divider?: boolean;
		handler?: () => void;
	}

	let { open, position = { x: 0, y: 0 }, items }: Props = $props();

	const dispatch = createEventDispatcher();

	function handleItemClick(item: MenuItem) {
		if (item.disabled) return;
		
		if (item.handler) {
			item.handler();
		}
		
		dispatch('select', item);
		dispatch('close');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dispatch('close');
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="context-menu-backdrop" onclick={() => dispatch('close')} onkeydown={(e) => e.key === 'Escape' && dispatch('close')} role="button" tabindex="-1" aria-label="Close context menu">
		<div 
			class="context-menu"
			style="left: {position.x}px; top: {position.y}px;"
			onclick={(e) => e.stopPropagation()}
			role="menu"
			tabindex="-1"
		>
			{#each items as item}
				{#if item.divider}
					<div class="divider"></div>
				{:else}
					<button
						class="menu-item"
						class:disabled={item.disabled}
						class:danger={item.danger}
						disabled={item.disabled}
						onclick={() => handleItemClick(item)}
						role="menuitem"
					>
						{#if item.icon}
							<span class="menu-icon">{item.icon}</span>
						{/if}
						<span class="menu-label">{item.label}</span>
						{#if item.shortcut}
							<span class="menu-shortcut">{item.shortcut}</span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style>
	.context-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10000;
	}

	.context-menu {
		position: fixed;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		padding: 6px;
		min-width: 200px;
		max-width: 300px;
		animation: slideIn 0.15s ease-out;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 8px 12px;
		background: none;
		border: none;
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		cursor: pointer;
		transition: background 0.15s ease;
		text-align: left;
	}

	.menu-item:hover:not(.disabled) {
		background: var(--surface-hover);
	}

	.menu-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.menu-item.danger {
		color: var(--danger);
	}

	.menu-item.danger:hover:not(.disabled) {
		background: var(--danger-bg);
	}

	.menu-icon {
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		flex-shrink: 0;
	}

	.menu-label {
		flex: 1;
		font-weight: 500;
	}

	.menu-shortcut {
		font-size: 12px;
		color: var(--text-tertiary);
		font-family: monospace;
		background: var(--surface-hover);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.divider {
		height: 1px;
		background: var(--border);
		margin: 6px 0;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
