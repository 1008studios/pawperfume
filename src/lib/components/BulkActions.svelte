<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		open: boolean;
	}

	let { open }: Props = $props();

	const dispatch = createEventDispatcher();

	interface SelectedItem {
		id: number;
		customer_name: string;
		amount: number;
		status: string;
	}

	let selectedItems = $state<SelectedItem[]>([]);

	function handleBulkAction(action: string) {
		if (selectedItems.length === 0) return;
		
		dispatch('bulk-action', {
			action,
			items: selectedItems.map(item => item.id)
		});
	}

	function clearSelection() {
		selectedItems = [];
		dispatch('clear-selection');
	}

	export function setSelected(items: SelectedItem[]) {
		selectedItems = items;
	}

	export function getSelected() {
		return selectedItems;
	}
</script>

{#if open && selectedItems.length > 0}
	<div class="bulk-actions-bar">
		<div class="selection-info">
			<span class="selection-count">{selectedItems.length} selected</span>
			<button class="btn-icon" onclick={clearSelection}>
				
			</button>
		</div>

		<div class="bulk-actions">
			<button 
				class="bulk-action-btn"
				onclick={() => handleBulkAction('update-status')}
			>
				Update Status
			</button>
			<button 
				class="bulk-action-btn"
				onclick={() => handleBulkAction('assign')}
			>
				Assign
			</button>
			<button 
				class="bulk-action-btn"
				onclick={() => handleBulkAction('export')}
			>
				Export
			</button>
			<button 
				class="bulk-action-btn danger"
				onclick={() => handleBulkAction('delete')}
			>
				Delete
			</button>
		</div>
	</div>
{/if}

<style>
	.bulk-actions-bar {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 12px 24px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		z-index: 1000;
		animation: slideUp 0.3s ease;
	}

	.selection-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.selection-count {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.bulk-actions {
		display: flex;
		gap: 8px;
	}

	.bulk-action-btn {
		padding: 8px 16px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.bulk-action-btn:hover {
		background: var(--surface-hover);
		border-color: var(--primary);
	}

	.bulk-action-btn.danger {
		color: var(--danger);
	}

	.bulk-action-btn.danger:hover {
		background: var(--danger);
		border-color: var(--danger);
		color: white;
	}

	.btn-icon {
		padding: 4px 8px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-tertiary);
		font-size: 16px;
		line-height: 1;
	}

	.btn-icon:hover {
		color: var(--text);
	}

	@keyframes slideUp {
		from {
			transform: translateX(-50%) translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateX(-50%) translateY(0);
			opacity: 1;
		}
	}
</style>
