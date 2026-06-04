<script lang="ts">
	interface Props {
		open: boolean;
		title?: string;
		position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
	}

	let { 
		open, 
		title = 'Quick Actions',
		position = 'bottom-right',
		children
	}: Props & { children?: import('svelte').Snippet } = $props();

	let expanded = $state(false);

	function toggle() {
		expanded = !expanded;
	}

	function getPositionStyles(): string {
		let styles = '';
		
		if (position.includes('bottom')) {
			styles += 'bottom: 24px;';
		} else {
			styles += 'top: 24px;';
		}
		
		if (position.includes('right')) {
			styles += 'right: 24px;';
		} else {
			styles += 'left: 24px;';
		}
		
		return styles;
	}
</script>

<div class="fab-container" style={getPositionStyles()}>
	{#if expanded && open}
		<div class="fab-backdrop" onclick={toggle} role="button" tabindex="-1" onkeydown={(e) => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && toggle()} aria-label="Close menu"></div>
	{/if}

	{#if open}
		<div class="fab-menu" class:expanded>
			{#if children}
				{@render children()}
			{/if}
		</div>

		<button 
			class="fab-button"
			class:expanded
			onclick={toggle}
			aria-label={expanded ? 'Close menu' : 'Open menu'}
		>
			<span class="fab-icon">
				{#if expanded}
					
				{:else}
					+
				{/if}
			</span>
		</button>
	{/if}
</div>

<style>
	.fab-container {
		position: fixed;
		z-index: 1000;
		display: flex;
		flex-direction: column-reverse;
		align-items: flex-end;
		gap: 12px;
	}

	.fab-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: -1;
		animation: fadeIn 0.2s ease-out;
	}

	.fab-menu {
		display: flex;
		flex-direction: column;
		gap: 8px;
		opacity: 0;
		transform: translateY(20px) scale(0.9);
		pointer-events: none;
		transition: all 0.2s ease;
	}

	.fab-menu.expanded {
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: auto;
	}

	.fab-button {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--primary);
		border: none;
		color: white;
		font-size: 24px;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		z-index: 1;
	}

	.fab-button:hover {
		transform: scale(1.05);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	}

	.fab-button:active {
		transform: scale(0.95);
	}

	.fab-button.expanded {
		background: var(--danger);
		transform: rotate(45deg);
	}

	.fab-button.expanded:hover {
		transform: rotate(45deg) scale(1.05);
	}

	.fab-icon {
		display: block;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		line-height: 1;
		font-weight: 300;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Action items in the menu */
	:global(.fab-menu .fab-action) {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	:global(.fab-menu .fab-action:hover) {
		background: var(--surface-hover);
		transform: translateX(-4px);
	}

	:global(.fab-menu .fab-action-icon) {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
	}

	@media (max-width: 768px) {
		.fab-button {
			width: 48px;
			height: 48px;
			font-size: 20px;
		}

		:global(.fab-menu .fab-action) {
			padding: 10px 14px;
			font-size: 13px;
		}
	}
</style>
