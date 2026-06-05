<script lang="ts">
	import { onMount } from 'svelte';
	import { api, fmtPeso, showToast, downloadCSV } from '$lib/api';
	import type { Order, CustomField, OrderStatus, ColumnConfig } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import InlineEdit from '$lib/components/InlineEdit.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { createDebouncedStore } from '$lib/debounce';

	let orders = $state<Order[]>([]);
	let customFields = $state<CustomField[]>([]);
	let orderStatuses = $state<OrderStatus[]>([]);
	let columnConfigs = $state<ColumnConfig[]>([]);
	let loading = $state(true);

	const searchStore = createDebouncedStore('', 300);
	let searchQuery = $state('');
	$effect(() => { searchStore.set(searchQuery); });

	let activeTab = $state('all');
	let sortField = $state<string | null>(null);
	let sortDir = $state<'asc' | 'desc'>('desc');
	let editingOrder = $state<Order | null>(null);
	let showColumnManager = $state(false);
	let viewMode = $state<'table' | 'kanban'>('table');
	let selectedIds = $state<Set<number>>(new Set());
	let showBulkActions = $state(false);
	let bulkStatus = $state('');
	let paymentFilter = $state('all');
	let dateFrom = $state('');
	let dateTo = $state('');
	let showNewOrder = $state(false);
	let showTemplates = $state(false);
	let page = $state(1);
	const pageSize = 25;

	const orderTemplates = [
		{ name: 'Walk-in Sale', status: 'delivered', payment: 'paid', amount: 0, notes: 'Walk-in customer' },
		{ name: 'Online Order (COD)', status: 'new', payment: 'pending', amount: 0, notes: 'Cash on delivery' },
		{ name: 'Online Order (GCash)', status: 'new', payment: 'paid', amount: 0, notes: 'Paid via GCash' },
		{ name: 'Bulk Order', status: 'new', payment: 'pending', amount: 0, notes: 'Bulk purchase request' },
		{ name: 'Pre-order', status: 'new', payment: 'pending', amount: 0, notes: 'Pre-order item' },
	];

	const defaultColumns: ColumnConfig[] = [
		{ id: 0, tenant_id: 1, table_name: 'orders', column_key: 'id', column_label: '#', is_visible: true, sort_order: 0, width: null },
		{ id: 0, tenant_id: 1, table_name: 'orders', column_key: 'customer_name', column_label: 'Customer', is_visible: true, sort_order: 1, width: null },
		{ id: 0, tenant_id: 1, table_name: 'orders', column_key: 'amount', column_label: 'Amount', is_visible: true, sort_order: 2, width: null },
		{ id: 0, tenant_id: 1, table_name: 'orders', column_key: 'status', column_label: 'Status', is_visible: true, sort_order: 3, width: null },
		{ id: 0, tenant_id: 1, table_name: 'orders', column_key: 'payment_status', column_label: 'Payment', is_visible: true, sort_order: 4, width: null },
		{ id: 0, tenant_id: 1, table_name: 'orders', column_key: 'updated_at', column_label: 'Date', is_visible: true, sort_order: 5, width: null }
	];

	onMount(async () => { await loadOrders(); });

	async function loadOrders(silent = false) {
		if (!silent) loading = true;
		try {
			const res = await api.orders();
			orders = res.orders as Order[];
			customFields = res.custom_fields as CustomField[];
			orderStatuses = res.order_statuses as OrderStatus[];
			const dbCols = res.column_configs as ColumnConfig[];
			if (dbCols && dbCols.length > 0) {
				columnConfigs = dbCols;
			} else {
				columnConfigs = [...defaultColumns];
				for (const cf of customFields) {
					columnConfigs.push({
						id: 0, tenant_id: 1, table_name: 'orders',
						column_key: `cf_${cf.field_key}`, column_label: cf.field_label || cf.field_key,
						is_visible: true, sort_order: columnConfigs.length, width: null
					});
				}
			}
		} catch (err) {
			showToast('Could not load orders. Please check your connection.', 'error');
			console.error(err);
		} finally { if (!silent) loading = false; }
	}

	let visibleColumns = $derived(
		columnConfigs.filter(c => c.is_visible).sort((a, b) => a.sort_order - b.sort_order)
	);

	let filteredOrders = $derived.by(() => {
		let list = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			list = list.filter(o =>
				(o.customer_name || '').toLowerCase().includes(q) ||
				String(o.id).includes(q) ||
				(o.notes || '').toLowerCase().includes(q)
			);
		}
		if (paymentFilter !== 'all') {
			list = list.filter(o => (o.payment_status || 'pending') === paymentFilter);
		}
		if (dateFrom) {
			list = list.filter(o => o.created_at >= dateFrom);
		}
		if (dateTo) {
			list = list.filter(o => o.created_at <= dateTo + 'T23:59:59');
		}
		if (sortField) {
			const sf = sortField;
			list = [...list].sort((a, b) => {
				let va: unknown, vb: unknown;
				if (sf.startsWith('cf_')) {
					const key = sf.replace('cf_', '');
					const cfa = (typeof a.custom_fields === 'string' ? JSON.parse(a.custom_fields || '{}') : a.custom_fields || {}) as Record<string, unknown>;
					const cfb = (typeof b.custom_fields === 'string' ? JSON.parse(b.custom_fields || '{}') : b.custom_fields || {}) as Record<string, unknown>;
					va = cfa[key]; vb = cfb[key];
				} else {
					va = (a as unknown as Record<string, unknown>)[sf];
					vb = (b as unknown as Record<string, unknown>)[sf];
				}
				const cmp = String(va || '') > String(vb || '') ? 1 : -1;
				return sortDir === 'asc' ? cmp : -cmp;
			});
		}
		return list;
	});

	let paginatedOrders = $derived.by(() => {
		const all = filteredOrders;
		const start = (page - 1) * pageSize;
		return all.slice(start, start + pageSize);
	});

	let totalPages = $derived(Math.ceil(filteredOrders.length / pageSize));

	let tabCounts = $derived.by(() => {
		const counts: Record<string, number> = { all: orders.length };
		for (const s of orderStatuses) {
			counts[s.status_key] = orders.filter(o => o.status === s.status_key).length;
		}
		return counts;
	});

	let selectedTotal = $derived.by(() => {
		return [...selectedIds].reduce((sum, id) => {
			const o = orders.find(ord => ord.id === id);
			return sum + (Number(o?.amount) || 0);
		}, 0);
	});

	function toggleSort(field: string) {
		if (sortField === field) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
		else { sortField = field; sortDir = 'asc'; }
	}

	function toggleSelect(id: number) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id); else next.add(id);
		selectedIds = next;
		showBulkActions = next.size > 0;
	}

	function toggleSelectAll() {
		if (selectedIds.size === paginatedOrders.length) {
			selectedIds = new Set();
			showBulkActions = false;
		} else {
			selectedIds = new Set(paginatedOrders.map(o => o.id));
			showBulkActions = true;
		}
	}

	function getCellValue(order: Order, col: ColumnConfig): string {
		if (col.column_key.startsWith('cf_')) {
			const key = col.column_key.replace('cf_', '');
			const cf = (typeof order.custom_fields === 'string' ? JSON.parse(order.custom_fields || '{}') : order.custom_fields || {}) as Record<string, unknown>;
			return String(cf[key] || '—');
		}
		switch (col.column_key) {
			case 'id': return `#${order.id}`;
			case 'customer_name': return order.customer_name || '—';
			case 'amount': return fmtPeso(order.amount);
			case 'status': return order.status;
			case 'payment_status': return order.payment_status || 'pending';
			case 'updated_at': return new Date(order.updated_at).toLocaleDateString();
			case 'created_at': return new Date(order.created_at).toLocaleDateString();
			case 'notes': return order.notes || '—';
			default: return '—';
		}
	}

	function getStatusColor(status: string): string {
		const s = orderStatuses.find(o => o.status_key === status);
		return s?.color || '#4d8ef7';
	}

	let showDeleteConfirm = $state(false);
	let deleteOrderId = $state<number | null>(null);
	let showBulkDeleteConfirm = $state(false);

	async function deleteOrder(id: number) { deleteOrderId = id; showDeleteConfirm = true; }

	async function confirmDeleteOrder() {
		if (!deleteOrderId) return;
		try {
			await api.deleteOrder(deleteOrderId);
			showToast(`Order #${deleteOrderId} deleted.`, 'success');
			await loadOrders(true);
		} catch (err) { showToast('Could not delete the order.', 'error'); }
		finally { showDeleteConfirm = false; deleteOrderId = null; }
	}

	function promptBulkDelete() {
		showBulkDeleteConfirm = true;
	}

	async function confirmBulkDelete() {
		try {
			for (const id of selectedIds) { await api.deleteOrder(id); }
			showToast(`${selectedIds.size} orders deleted.`, 'success');
			selectedIds = new Set();
			showBulkActions = false;
			await loadOrders(true);
		} catch { showToast('Could not delete the selected orders. Please try again.', 'error'); }
		finally { showBulkDeleteConfirm = false; }
	}

	async function bulkStatusChange() {
		if (!bulkStatus) return;
		try {
			for (const id of selectedIds) { await api.updateOrder(id, { status: bulkStatus }); }
			showToast(`${selectedIds.size} orders updated to ${bulkStatus}.`, 'success');
			selectedIds = new Set();
			showBulkActions = false;
			bulkStatus = '';
			await loadOrders(true);
		} catch { showToast('Could not update the orders. Please try again.', 'error'); }
	}

	async function quickStatusChange(order: Order, newStatus: string) {
		try {
			await api.updateOrder(order.id, { status: newStatus });
			showToast(`Order #${order.id} updated to ${newStatus}.`, 'success');
			await loadOrders(true);
		} catch { showToast('Could not update the status. Please try again.', 'error'); }
	}

	async function saveOrder() {
		if (!editingOrder) return;
		try {
			if (editingOrder.id) {
				await api.updateOrder(editingOrder.id, editingOrder);
			} else {
				await api.createOrder({
					customerName: editingOrder.customer_name,
					amount: editingOrder.amount,
					status: editingOrder.status,
					paymentStatus: editingOrder.payment_status,
					custom_fields: editingOrder.custom_fields,
					notes: editingOrder.notes
				});
			}
			showToast(editingOrder.id ? `Order #${editingOrder.id} updated.` : 'Order created.', 'success');
			editingOrder = null;
			await loadOrders(true);
		} catch (err) { showToast('Could not save order. Please check the fields and try again.', 'error'); }
	}

	function newOrder(template?: typeof orderTemplates[0]) {
		editingOrder = {
			id: 0, tenant_id: 1, conversation_id: null,
			customer_name: '',
			status: template?.status || orderStatuses[0]?.status_key || 'new',
			payment_status: template?.payment || 'pending',
			amount: template?.amount || 0,
			custom_fields: {},
			notes: template?.notes || null,
			updated_at: '', created_at: ''
		};
		showTemplates = false;
	}

	function editOrder(order: Order) {
		editingOrder = { ...order, custom_fields: typeof order.custom_fields === 'string' ? JSON.parse(order.custom_fields || '{}') : { ...order.custom_fields } };
	}

	function exportCSV() {
		const headers = visibleColumns.map(c => c.column_label);
		const rows = filteredOrders.map(o => visibleColumns.map(c => getCellValue(o, c)));
		downloadCSV(headers, rows, 'pawperfume-orders.csv');
		showToast('CSV exported.', 'success');
	}

	function clearFilters() {
		searchQuery = '';
		paymentFilter = 'all';
		dateFrom = '';
		dateTo = '';
		activeTab = 'all';
	}

	async function togglePaymentStatus(order: Order) {
		const newStatus = order.payment_status === 'paid' ? 'pending' : 'paid';
		try {
			await api.updateOrder(order.id, { payment_status: newStatus });
			order.payment_status = newStatus;
			showToast(`Order #${order.id} payment status updated to ${newStatus}.`, 'success');
			await loadOrders(true);
		} catch {
			showToast('Could not update payment status. Please try again.', 'error');
		}
	}

	let hasActiveFilters = $derived(searchQuery || paymentFilter !== 'all' || dateFrom || dateTo);
</script>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Orders</h1>
			<span class="order-count">{filteredOrders.length} total</span>
		</div>
		<div class="page-actions">
			<div class="search-box">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
				<input type="text" placeholder="Search orders..." bind:value={searchQuery} />
			</div>
			<div class="view-toggle">
				<button class="view-btn" class:active={viewMode === 'table'} onclick={() => viewMode = 'table'} title="Table view">☰</button>
				<button class="view-btn" class:active={viewMode === 'kanban'} onclick={() => viewMode = 'kanban'} title="Kanban view">⊞</button>
			</div>
			<button class="btn btn-ghost" onclick={() => showColumnManager = !showColumnManager}>Columns</button>
			<button class="btn btn-ghost" onclick={exportCSV}>Export CSV</button>
			<div class="btn-group">
				<button class="btn btn-ghost" onclick={() => showTemplates = !showTemplates}>Templates</button>
				<button class="btn btn-primary" onclick={() => newOrder()}>+ New Order</button>
			</div>
		</div>
	</header>

	{#if showTemplates}
		<div class="templates-panel">
			<h3>Order Templates</h3>
			<div class="template-grid">
				{#each orderTemplates as tpl}
					<button class="template-card" onclick={() => newOrder(tpl)}>
						<div class="template-name">{tpl.name}</div>
						<div class="template-meta">
							<span class="badge badge-{tpl.status === 'delivered' ? 'delivered' : 'new'}">{tpl.status}</span>
							<span class="template-payment">{tpl.payment}</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if showBulkActions}
		<div class="bulk-bar">
			<div class="bulk-info">
				<span class="bulk-count">{selectedIds.size} selected</span>
				<span class="bulk-total">Total: {fmtPeso(selectedTotal)}</span>
			</div>
			<div class="bulk-actions">
				<select bind:value={bulkStatus} class="bulk-select">
					<option value="">Change status...</option>
					{#each orderStatuses as s}
						<option value={s.status_key}>{s.status_label || s.status_key}</option>
					{/each}
				</select>
				{#if bulkStatus}
					<button class="btn btn-primary btn-sm" onclick={bulkStatusChange}>Apply</button>
				{/if}
				<button class="btn btn-danger btn-sm" onclick={promptBulkDelete}>Delete ({selectedIds.size})</button>
				<button class="btn btn-ghost btn-sm" onclick={() => { selectedIds = new Set(); showBulkActions = false; }}>Clear</button>
			</div>
		</div>
	{/if}

	{#if showColumnManager}
		<div class="column-manager">
			<div class="cm-header">
				<h3>Manage Columns</h3>
			</div>
			<div class="cm-list">
				{#each columnConfigs.sort((a, b) => a.sort_order - b.sort_order) as col}
					<div class="cm-item" class:visible={col.is_visible}>
						<button class="cm-toggle" onclick={() => { col.is_visible = !col.is_visible; columnConfigs = [...columnConfigs]; }}>
							{col.is_visible ? '' : ''}
						</button>
						<span class="cm-label">{col.column_label}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="filter-bar">
		<div class="filter-tabs">
			<button class="tab" class:active={activeTab === 'all'} onclick={() => { activeTab = 'all'; page = 1; }}>
				All <span class="tab-count">{tabCounts.all}</span>
			</button>
			{#each orderStatuses as status}
				<button class="tab" class:active={activeTab === status.status_key} onclick={() => { activeTab = status.status_key; page = 1; }}>
					<span class="status-dot" style="background:{status.color}"></span>
					{status.status_label || status.status_key}
					<span class="tab-count">{tabCounts[status.status_key] || 0}</span>
				</button>
			{/each}
		</div>
		<div class="filter-right">
			<select bind:value={paymentFilter} class="filter-select">
				<option value="all">All Payments</option>
				<option value="paid">Paid</option>
				<option value="pending">Pending</option>
			</select>
			<input type="date" bind:value={dateFrom} class="filter-date" placeholder="From" />
			<input type="date" bind:value={dateTo} class="filter-date" placeholder="To" />
			{#if hasActiveFilters}
				<button class="btn btn-ghost btn-sm" onclick={clearFilters}>Clear filters</button>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="table-wrap">
			<table class="table">
				<thead><tr>{#each Array(6) as _}<th><Skeleton width="60px" height="12px" /></th>{/each}</tr></thead>
				<tbody>{#each Array(8) as _}<tr>{#each Array(6) as _}<td><Skeleton width="80%" height="14px" /></td>{/each}</tr>{/each}</tbody>
			</table>
		</div>
	{:else if viewMode === 'table'}
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th class="select-col"><input type="checkbox" checked={selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0} onchange={toggleSelectAll} /></th>
						{#each visibleColumns as col}
							<th onclick={() => toggleSort(col.column_key)}>
								{col.column_label}
								{#if sortField === col.column_key}<span class="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
						{/each}
						<th class="actions-col"></th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedOrders as order}
						<tr class:selected={selectedIds.has(order.id)}>
							<td class="select-col"><input type="checkbox" checked={selectedIds.has(order.id)} onchange={() => toggleSelect(order.id)} /></td>
							{#each visibleColumns as col}
								<td>
									{#if col.column_key === 'status'}
										<select class="status-select" value={order.status} onchange={(e) => quickStatusChange(order, (e.target as HTMLSelectElement).value)} style="border-color:{getStatusColor(order.status)};color:{getStatusColor(order.status)}">
											{#each orderStatuses as s}
												<option value={s.status_key}>{s.status_label || s.status_key}</option>
											{/each}
										</select>
									{:else if col.column_key === 'payment_status'}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<span class="badge cursor-pointer" class:badge-paid={order.payment_status === 'paid'} class:badge-pending={order.payment_status !== 'paid'} onclick={() => togglePaymentStatus(order)} title="Click to toggle status">{order.payment_status || 'pending'}</span>
									{:else if col.column_key === 'id'}
										<span class="order-id">#{order.id}</span>
									{:else if col.column_key === 'customer_name'}
										<InlineEdit
											bind:value={order.customer_name}
											onSave={(val) => api.updateOrder(order.id, { customer_name: val })}
											placeholder="Enter name..."
										/>
									{:else if col.column_key === 'amount'}
										<InlineEdit
											bind:value={order.amount}
											type="number"
											currency={true}
											onSave={(val) => api.updateOrder(order.id, { amount: val })}
											placeholder="0.00"
										/>
									{:else if col.column_key === 'notes'}
										<InlineEdit
											bind:value={order.notes}
											type="textarea"
											onSave={(val) => api.updateOrder(order.id, { notes: val })}
											placeholder="Add notes..."
										/>
									{:else if col.column_key.startsWith('cf_')}
										{@const cfKey = col.column_key.replace('cf_', '')}
										{@const cfConfig = customFields.find(f => f.field_key === cfKey)}
										{#if cfConfig}
											{#if cfConfig.field_type === 'select'}
												{@const optList = typeof cfConfig.field_options === 'string' ? JSON.parse(cfConfig.field_options) : cfConfig.field_options || []}
												<InlineEdit
													value={(() => {
														const cf = typeof order.custom_fields === 'string' ? JSON.parse(order.custom_fields || '{}') : order.custom_fields || {};
														return cf[cfKey] || '';
													})()}
													type="select"
													options={['', ...optList]}
													onSave={(val) => {
														const cf = typeof order.custom_fields === 'string' ? JSON.parse(order.custom_fields || '{}') : order.custom_fields || {};
														cf[cfKey] = val;
														return api.updateOrder(order.id, { custom_fields: cf });
													}}
													placeholder="—"
												/>
											{:else}
												<InlineEdit
													value={(() => {
														const cf = typeof order.custom_fields === 'string' ? JSON.parse(order.custom_fields || '{}') : order.custom_fields || {};
														return cf[cfKey] || '';
													})()}
													type="text"
													onSave={(val) => {
														const cf = typeof order.custom_fields === 'string' ? JSON.parse(order.custom_fields || '{}') : order.custom_fields || {};
														cf[cfKey] = val;
														return api.updateOrder(order.id, { custom_fields: cf });
													}}
													placeholder="—"
												/>
											{/if}
										{/if}
									{:else}
										<span>{getCellValue(order, col)}</span>
									{/if}
								</td>
							{/each}
							<td class="actions-col">
								<div class="row-actions">
									<button class="btn-icon" onclick={() => editOrder(order)} title="Edit" aria-label="Edit order">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
											<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
										</svg>
									</button>
									<button class="btn-icon danger" onclick={() => deleteOrder(order.id)} title="Delete" aria-label="Delete order">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="3 6 5 6 21 6"></polyline>
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
											<line x1="10" y1="11" x2="10" y2="17"></line>
											<line x1="14" y1="11" x2="14" y2="17"></line>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan={visibleColumns.length + 2} style="padding: 0;">
								{#if orders.length === 0}
									<EmptyState
										title="No orders yet — let's add one! 📦"
										description="Track all your sales here — from new orders to completed deliveries. You can also export a CSV report for your records."
										iconType="order"
										actionText="+ Log Your First Order"
										onAction={() => newOrder()}
									/>
								{:else}
									<EmptyState
										title={hasActiveFilters ? "No matching orders found" : `No ${activeTab} orders`}
										description={hasActiveFilters ? "Try another keyword, or clear the search to view all orders." : `Once orders are set to ${activeTab}, they will appear here.`}
										iconType="order"
										actionText={hasActiveFilters ? "Clear Filters" : ""}
										onAction={hasActiveFilters ? clearFilters : undefined}
									/>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				<button class="btn btn-ghost btn-sm" onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}>← Prev</button>
				<span class="page-info">Page {page} of {totalPages}</span>
				<button class="btn btn-ghost btn-sm" onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}>Next →</button>
			</div>
		{/if}
	{:else}
		<div class="kanban-view">
			{#each orderStatuses as status}
				<div class="kanban-column">
					<div class="kanban-header" style="border-top-color:{status.color}">
						<span class="kanban-title">{status.status_label || status.status_key}</span>
						<span class="kanban-count">{orders.filter(o => o.status === status.status_key).length}</span>
					</div>
					<div class="kanban-cards">
						{#each orders.filter(o => o.status === status.status_key) as order}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="kanban-card" onclick={() => editOrder(order)}>
								<div class="kanban-card-header">
									<span class="order-id">#{order.id}</span>
									<span class="badge badge-{order.payment_status === 'paid' ? 'paid' : 'pending'}">{order.payment_status || 'pending'}</span>
								</div>
								<div class="kanban-card-name">{order.customer_name || 'Unknown'}</div>
								<div class="kanban-card-amount">{fmtPeso(order.amount)}</div>
								{#if order.notes}
									<div class="kanban-card-notes">{order.notes.slice(0, 50)}</div>
								{/if}
								<div class="kanban-card-footer">
									<span class="kanban-date">{new Date(order.updated_at).toLocaleDateString()}</span>
									<select class="kanban-status-change" value={order.status} onchange={(e) => { e.stopPropagation(); quickStatusChange(order, (e.target as HTMLSelectElement).value); }} onclick={(e) => e.stopPropagation()}>
										{#each orderStatuses as s}
											<option value={s.status_key}>{s.status_label || s.status_key}</option>
										{/each}
									</select>
								</div>
							</div>
						{:else}
							<div class="kanban-empty">No orders</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if editingOrder}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (editingOrder = null)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>{editingOrder.id ? `Edit Order #${editingOrder.id}` : 'New Order'}</h3>
				<button class="btn-icon" onclick={() => editingOrder = null} aria-label="Close modal">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
			<form onsubmit={e => { e.preventDefault(); saveOrder(); }}>
				<div class="form-grid">
					<div class="form-group">
						<label for="order-customer">Customer Name</label>
						<input id="order-customer" type="text" bind:value={editingOrder.customer_name} placeholder="Customer name" />
					</div>
					<div class="form-group">
						<label for="order-amount">Amount (₱)</label>
						<input id="order-amount" type="number" bind:value={editingOrder.amount} min="0" step="0.01" />
					</div>
					<div class="form-group">
						<label for="order-status">Status</label>
						<select id="order-status" bind:value={editingOrder.status}>
							{#each orderStatuses as s}
								<option value={s.status_key}>{s.status_label || s.status_key}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="order-payment">Payment</label>
						<select id="order-payment" bind:value={editingOrder.payment_status}>
							<option value="pending">Pending</option>
							<option value="paid">Paid</option>
						</select>
					</div>
				</div>
				{#each customFields as cf}
					<div class="form-group">
						<label for="cf-{cf.field_key}">{cf.field_label || cf.field_key}</label>
						{#if cf.field_type === 'select' && cf.field_options?.length}
							<select id="cf-{cf.field_key}" bind:value={(editingOrder.custom_fields as Record<string, string>)[cf.field_key]}>
								<option value="">—</option>
								{#each cf.field_options as opt}
									<option value={opt}>{opt}</option>
								{/each}
							</select>
						{:else}
							<input id="cf-{cf.field_key}" type="text" bind:value={(editingOrder.custom_fields as Record<string, string>)[cf.field_key]} placeholder={cf.field_label || cf.field_key} />
						{/if}
					</div>
				{/each}
				<div class="form-group">
					<label for="order-notes">Notes</label>
					<textarea id="order-notes" bind:value={editingOrder.notes} placeholder="Optional notes..." rows="2"></textarea>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => editingOrder = null}>Cancel</button>
					<button type="submit" class="btn btn-primary">{editingOrder.id ? 'Save Changes' : 'Create Order'}</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title={`Delete Order #${deleteOrderId}?`}
	message="This action cannot be undone, but you can create a new order at any time."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteOrder}
/>

<ConfirmDialog
	bind:open={showBulkDeleteConfirm}
	title={`Delete ${selectedIds.size} Orders?`}
	message="This action cannot be undone. All selected orders will be permanently deleted."
	confirmText="Yes, Delete All"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmBulkDelete}
/>

<style>
	.page { padding: 24px 32px; max-width: 1400px; margin: 0 auto; }
	.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }
	.order-count { font-size: 13px; color: var(--text-secondary); background: var(--surface-hover); padding: 2px 8px; border-radius: 10px; }
	.page-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
	.btn-group { display: flex; gap: 4px; }

	.search-box { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text-tertiary); }
	.search-box input { border: none; background: transparent; font-size: 13px; color: var(--text); width: 160px; }
	.search-box input:focus { outline: none; }

	.view-toggle { display: flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
	.view-btn { padding: 6px 10px; border: none; background: var(--surface); cursor: pointer; font-size: 14px; color: var(--text-secondary); transition: all 0.15s; }
	.view-btn.active { background: var(--accent-bg); color: var(--accent); }
	.view-btn:hover { background: var(--surface-hover); }

	.templates-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
	.templates-panel h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
	.template-grid { display: flex; gap: 8px; flex-wrap: wrap; }
	.template-card { padding: 10px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); cursor: pointer; transition: all 0.15s; text-align: left; }
	.template-card:hover { border-color: var(--accent); background: var(--accent-bg); }
	.template-name { font-weight: 500; font-size: 13px; margin-bottom: 4px; }
	.template-meta { display: flex; gap: 8px; align-items: center; font-size: 11px; color: var(--text-secondary); }

	.bulk-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--accent-bg); border: 1px solid var(--accent); border-radius: 8px; margin-bottom: 12px; }
	.bulk-info { display: flex; gap: 16px; align-items: center; }
	.bulk-count { font-weight: 600; font-size: 14px; color: var(--accent); }
	.bulk-total { font-size: 13px; color: var(--text-secondary); }
	.bulk-actions { display: flex; gap: 8px; align-items: center; }
	.bulk-select { padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; background: var(--surface); color: var(--text); }

	.column-manager { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
	.cm-header { margin-bottom: 8px; }
	.cm-header h3 { font-size: 13px; font-weight: 600; }
	.cm-list { display: flex; flex-wrap: wrap; gap: 6px; }
	.cm-item { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; opacity: 0.5; transition: opacity 0.15s; cursor: pointer; }
	.cm-item.visible { opacity: 1; }
	.cm-toggle { background: none; border: none; cursor: pointer; font-size: 12px; color: var(--text); padding: 0; }
	.cm-label { font-size: 12px; color: var(--text); }

	.filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
	.filter-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); flex: 1; min-width: 0; overflow-x: auto; }
	.filter-right { display: flex; gap: 8px; align-items: center; }
	.filter-select { padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; background: var(--surface); color: var(--text); }
	.filter-date { padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; background: var(--surface); color: var(--text); }

	.tab { padding: 8px 14px; border: none; background: transparent; font-size: 13px; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; display: flex; align-items: center; gap: 6px; transition: all 0.15s; white-space: nowrap; }
	.tab:hover { color: var(--text); }
	.tab.active { color: var(--text); border-bottom-color: var(--accent); font-weight: 500; }
	.tab-count { font-size: 11px; color: var(--text-tertiary); background: var(--surface-hover); padding: 0 5px; border-radius: 8px; }
	.status-dot { width: 7px; height: 7px; border-radius: 50%; }

	.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
	.table { width: 100%; border-collapse: collapse; }
	.table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; white-space: nowrap; }
	.table th:hover { color: var(--text); }
	.sort-arrow { margin-left: 4px; font-size: 10px; }
	.select-col { width: 32px; text-align: center; }
	.select-col input { cursor: pointer; }
	.table td { padding: 8px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
	.table tr:last-child td { border-bottom: none; }
	.table tr:hover td { background: var(--surface-hover); }
	.table tr.selected td { background: var(--accent-bg); }
	.order-id { font-weight: 600; color: var(--text-secondary); }

	.status-select { padding: 2px 6px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px; font-weight: 500; background: transparent; cursor: pointer; }
	.status-select:focus { outline: none; }

	.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
	.badge-paid { background: var(--green-bg); color: var(--green); }
	.badge-pending { background: var(--orange-bg); color: var(--orange); }
	.badge-new { background: var(--accent-bg); color: var(--accent); }
	.badge-delivered { background: var(--green-bg); color: var(--green); }

	.actions-col { width: 70px; text-align: right; }
	.row-actions { display: flex; gap: 2px; justify-content: flex-end; opacity: 0; transition: opacity 0.15s; }
	tr:hover .row-actions { opacity: 1; }

	.empty-state { text-align: center; padding: 48px 24px; color: var(--text-secondary); }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }

	.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 16px 0; }
	.page-info { font-size: 13px; color: var(--text-secondary); }

	/* Kanban */
	.kanban-view { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 16px; }
	.kanban-column { min-width: 260px; flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; border-top: 3px solid var(--border); }
	.kanban-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
	.kanban-title { font-weight: 600; font-size: 13px; text-transform: capitalize; }
	.kanban-count { font-size: 12px; color: var(--text-secondary); background: var(--surface-hover); padding: 1px 6px; border-radius: 8px; }
	.kanban-cards { padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
	.kanban-card { padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); cursor: pointer; transition: all 0.15s; }
	.kanban-card:hover { border-color: var(--accent); box-shadow: var(--shadow); }
	.kanban-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
	.kanban-card-name { font-weight: 500; font-size: 13px; margin-bottom: 4px; }
	.kanban-card-amount { font-weight: 600; font-size: 15px; color: var(--accent); margin-bottom: 4px; }
	.kanban-card-notes { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; line-height: 1.4; }
	.kanban-card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
	.kanban-date { font-size: 11px; color: var(--text-tertiary); }
	.kanban-status-change { font-size: 10px; padding: 1px 4px; border: 1px solid var(--border); border-radius: 3px; background: var(--surface); color: var(--text); cursor: pointer; }
	.kanban-empty {
		text-align: center;
		padding: 24px 16px;
		color: var(--text-tertiary);
		font-size: 13px;
		border: 1px dashed var(--border);
		border-radius: var(--radius);
		background: var(--bg);
		margin: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Buttons */
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-danger { background: var(--red); color: white; }
	.btn-danger:hover { opacity: 0.9; }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); color: var(--text); }
	.btn-sm { padding: 4px 8px; font-size: 12px; }
	.btn-icon { background: none; border: none; cursor: pointer; padding: 4px; border-radius: var(--radius-sm); font-size: 12px; color: var(--text-secondary); transition: all 0.15s; }
	.btn-icon:hover { background: var(--surface-hover); color: var(--text); }
	.btn-icon.danger:hover { color: var(--red); }
	.btn-icon:disabled { opacity: 0.3; cursor: default; }

	/* Modal */
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 560px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
	.modal-sm { width: 400px; }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
	.modal-header h3 { font-size: 16px; font-weight: 600; }
	.modal-body { padding: 20px; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 20px; }
	.form-group { padding: 0 20px; margin-bottom: 10px; }
	.form-grid .form-group { padding: 0; }
	.form-group label { display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
	.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; background: var(--bg); color: var(--text); }
	.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--accent); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border); }

	@media (max-width: 768px) {
		.page { padding: 16px; }
		.page-header { flex-direction: column; align-items: flex-start; }
		.page-actions { width: 100%; }
		.form-grid { grid-template-columns: 1fr; }
		
		/* Kanban mobile improvements */
		.kanban-view { 
			flex-direction: column; 
			gap: 16px;
			overflow-x: visible;
		}
		.kanban-column { 
			min-width: auto;
			width: 100%;
		}
		
		/* Better touch targets for kanban cards */
		.kanban-card { 
			padding: 16px;
			min-height: 44px;
		}
		.kanban-status-change {
			padding: 8px 12px;
			font-size: 12px;
			min-height: 44px;
		}
		
		/* Table mobile improvements */
		.table-wrap {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		/* Filter bar stacking on mobile */
		.filter-bar {
			flex-direction: column;
			align-items: stretch;
		}
		.filter-tabs {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			padding-bottom: 8px;
		}
		.filter-right {
			flex-wrap: wrap;
		}
		
		/* Better modal on mobile */
		.modal {
			margin: 16px;
			max-height: calc(100vh - 32px);
		}
		
		/* Page actions stacking */
		.page-actions {
			flex-wrap: wrap;
		}
		
		/* Bulk actions wrapping */
		.bulk-bar {
			flex-direction: column;
			gap: 12px;
		}
		.bulk-actions {
			flex-wrap: wrap;
		}
		
		/* Improve search box touch target */
		.search-box {
			padding: 12px 16px;
		}
		.search-box input {
			font-size: 16px;
		}
		
		/* Better tab touch targets */
		.tab {
			padding: 12px 16px;
			min-height: 44px;
		}
		
		/* Improve button touch targets */
		.btn {
			padding: 10px 16px;
			min-height: 44px;
		}
		.btn-icon {
			padding: 10px;
			min-width: 44px;
			min-height: 44px;
		}
		
		/* Filter select/date inputs */
		.filter-select,
		.filter-date {
			padding: 8px 12px;
			font-size: 16px;
			min-height: 44px;
		}
		
		/* Row actions always visible on mobile (no hover) */
		.row-actions {
			opacity: 1;
		}
	}
</style>

