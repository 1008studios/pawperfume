<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Order } from '$lib/types';

	interface Props {
		orders: Order[];
		statuses: Array<{ key: string; label: string; color: string }>;
	}

	let { orders, statuses }: Props = $props();

	const dispatch = createEventDispatcher();

	let draggedOrder = $state<Order | null>(null);
	let dragOverColumn = $state<string | null>(null);

	function handleDragStart(e: DragEvent, order: Order) {
		draggedOrder = order;
		e.dataTransfer?.setData('text/plain', order.id.toString());
		if (e.currentTarget instanceof HTMLElement) {
			e.currentTarget.style.opacity = '0.5';
		}
	}

	function handleDragEnd(e: DragEvent) {
		if (e.currentTarget instanceof HTMLElement) {
			e.currentTarget.style.opacity = '1';
		}
		draggedOrder = null;
		dragOverColumn = null;
	}

	function handleDragOver(e: DragEvent, statusKey: string) {
		e.preventDefault();
		dragOverColumn = statusKey;
	}

	function handleDragLeave() {
		dragOverColumn = null;
	}

	function handleDrop(e: DragEvent, newStatus: string) {
		e.preventDefault();
		dragOverColumn = null;

		if (!draggedOrder || draggedOrder.status === newStatus) return;

		dispatch('move', {
			orderId: draggedOrder.id,
			oldStatus: draggedOrder.status,
			newStatus
		});
	}

	function getOrdersByStatus(statusKey: string): Order[] {
		return orders.filter(o => o.status === statusKey);
	}

	function formatCurrency(amount: number | null): string {
		if (!amount) return '₱0';
		return `₱${amount.toLocaleString()}`;
	}
</script>

<div class="kanban-board">
	{#each statuses as status}
		{@const columnOrders = getOrdersByStatus(status.key)}
		<div
			class="kanban-column"
			class:drag-over={dragOverColumn === status.key}
			ondragover={(e) => handleDragOver(e, status.key)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, status.key)}
			role="region"
			aria-label="{status.label} column"
		>
			<div class="column-header">
				<div class="column-title">
					<span class="status-dot" style="background: {status.color}"></span>
					<h3>{status.label}</h3>
					<span class="column-count">{columnOrders.length}</span>
				</div>
			</div>

			<div class="column-body">
				{#each columnOrders as order (order.id)}
					<div
						class="kanban-card"
						draggable="true"
						ondragstart={(e) => handleDragStart(e, order)}
						ondragend={handleDragEnd}
						onclick={() => dispatch('select', order)}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch('select', order)}
						role="button"
						tabindex="0"
						aria-label="Order #{order.id} for {order.customer_name || 'Unknown Customer'}"
					>
						<div class="card-header">
							<span class="order-id">#{order.id}</span>
							<span class="order-amount">{formatCurrency(order.amount)}</span>
						</div>
						<div class="card-body">
							<p class="customer-name">{order.customer_name || 'Unknown Customer'}</p>
							{#if order.notes}
								<p class="order-notes">{order.notes}</p>
							{/if}
						</div>
						<div class="card-footer">
							<span class="order-date">
								{new Date(order.created_at).toLocaleDateString()}
							</span>
						</div>
					</div>
				{:else}
					<div class="empty-column">
						<p>No orders</p>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.kanban-board {
		display: flex;
		gap: 16px;
		overflow-x: auto;
		padding: 16px;
		min-height: 600px;
	}

	.kanban-column {
		flex: 0 0 300px;
		background: var(--surface-hover);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		transition: all 0.2s ease;
	}

	.kanban-column.drag-over {
		background: var(--primary-bg);
		box-shadow: 0 0 0 2px var(--primary);
	}

	.column-header {
		padding: 16px;
		border-bottom: 1px solid var(--border);
	}

	.column-title {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.column-title h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		flex: 1;
	}

	.column-count {
		background: var(--surface);
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.column-body {
		flex: 1;
		padding: 12px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.kanban-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px;
		cursor: grab;
		transition: all 0.2s ease;
	}

	.kanban-card:hover {
		box-shadow: var(--shadow);
		border-color: var(--primary);
	}

	.kanban-card:active {
		cursor: grabbing;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.order-id {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.order-amount {
		font-size: 14px;
		font-weight: 700;
		color: var(--success);
	}

	.card-body {
		margin-bottom: 8px;
	}

	.customer-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		margin: 0 0 4px 0;
	}

	.order-notes {
		font-size: 12px;
		color: var(--text-secondary);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-footer {
		display: flex;
		justify-content: flex-end;
	}

	.order-date {
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.empty-column {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-tertiary);
		font-size: 13px;
	}

	@media (max-width: 768px) {
		.kanban-board {
			padding: 8px;
		}

		.kanban-column {
			flex: 0 0 280px;
		}
	}
</style>
