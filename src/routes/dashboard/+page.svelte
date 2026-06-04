<script lang="ts">
	import { onMount } from 'svelte';
	import { api, timeAgo, fmtPeso, fmtNum } from '$lib/api';
	import { showToast } from '$lib/stores';
	import { pendingOrdersCount, unreadChatsCount } from '$lib/stores';
	import type { Conversation, Order, LedgerEntry } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';

	let stats = $state({
		activeChats: 0,
		pendingOrders: 0,
		revenue: 0,
		expenses: 0,
		totalConversations: 0,
		totalOrders: 0,
		completedOrders: 0,
		newOrders: 0,
		confirmedOrders: 0,
		cancelledOrders: 0,
		paidOrders: 0,
		avgOrderValue: 0,
		revenueChange: 0,
	});

	let recentConversations = $state<Conversation[]>([]);
	let allOrders = $state<Order[]>([]);
	let allEntries = $state<LedgerEntry[]>([]);
	let loading = $state(true);
	let dateRange = $state('7d');
	let lastRefresh = $state(new Date());

	let revenueByDay = $state<Array<{ label: string; value: number }>>([]);
	let orderStatusData = $state<Array<{ label: string; value: number; color: string }>>([]);
	let expenseByCategory = $state<Array<{ label: string; value: number; color: string }>>([]);
	let topCustomers = $state<Array<{ name: string; orders: number; total: number }>>([]);
	let recentActivity = $state<Array<{ type: string; text: string; time: string }>>([]);

	onMount(async () => { await loadData(); });

	async function loadData() {
		loading = true;
		try {
			const [convsRes, ordersRes, financeRes] = await Promise.all([
				api.conversations(), api.orders(), api.finance()
			]);

			const conversations = convsRes.conversations as Conversation[];
			const orders = ordersRes.orders as Order[];
			const finance = financeRes as LedgerEntry[];

			allOrders = orders;
			allEntries = finance;

			const now = Date.now();
			const rangeMs = dateRange === 'today'
				? Date.now() - new Date().setHours(0,0,0,0) // calendar day midnight
				: dateRange === '7d' ? 604800000 : dateRange === '30d' ? 2592000000 : 7776000000;
			const rangeStart = new Date(now - rangeMs);
			const prevStart = new Date(now - rangeMs * 2);

			const rangeOrders = orders.filter(o => new Date(o.created_at) >= rangeStart);
			const prevOrders = orders.filter(o => { const d = new Date(o.created_at); return d >= prevStart && d < rangeStart; });

			const currentRevenue = rangeOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
			const prevRevenue = prevOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);

			const newOrders = rangeOrders.filter(o => o.status === 'new').length;
			const confirmedOrders = rangeOrders.filter(o => o.status === 'confirmed').length;
			const completedOrders = rangeOrders.filter(o => o.status === 'delivered').length;
			const cancelledOrders = rangeOrders.filter(o => o.status === 'cancelled').length;
			const paidOrders = rangeOrders.filter(o => o.payment_status === 'paid').length;

			const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

			stats = {
				activeChats: conversations.filter(c => new Date(c.last_activity_at || c.updated_at).getTime() > now - 86400000).length,
				pendingOrders: newOrders + confirmedOrders,
				revenue: currentRevenue,
				expenses: finance.filter(e => e.type === 'expense' && new Date(e.date) >= rangeStart).reduce((s, e) => s + Number(e.amount || 0), 0),
				totalConversations: conversations.length,
				totalOrders: rangeOrders.length,
				completedOrders,
				newOrders,
				confirmedOrders,
				cancelledOrders,
				paidOrders,
				avgOrderValue: rangeOrders.length > 0 ? currentRevenue / rangeOrders.length : 0,
				revenueChange,
			};

			// Update sidebar badge stores
			pendingOrdersCount.set(newOrders + confirmedOrders);
			unreadChatsCount.set(conversations.filter(c => new Date(c.last_activity_at || c.updated_at).getTime() > now - 86400000).length);
			// Revenue by day
			const dayCount = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
			const days = [];
			for (let i = dayCount - 1; i >= 0; i--) {
				const date = new Date(); date.setDate(date.getDate() - i);
				const dayStr = date.toISOString().split('T')[0];
				const dayLabel = dayCount <= 7 ? date.toLocaleDateString('en-US', { weekday: 'short' }) : `${date.getMonth() + 1}/${date.getDate()}`;
				const dayRevenue = orders.filter(o => o.created_at?.startsWith(dayStr)).reduce((s, o) => s + (Number(o.amount) || 0), 0);
				days.push({ label: dayLabel, value: dayRevenue });
			}
			revenueByDay = days;

			// Order status
			orderStatusData = [
				{ label: 'New', value: newOrders, color: '#6366f1' },
				{ label: 'Confirmed', value: confirmedOrders, color: '#f59e0b' },
				{ label: 'Completed', value: completedOrders, color: '#22c55e' },
				{ label: 'Cancelled', value: cancelledOrders, color: '#ef4444' }
			].filter(d => d.value > 0);

			// Expense by category
			const catMap = new Map<string, number>();
			finance.filter(e => e.type === 'expense' && new Date(e.date) >= rangeStart).forEach(e => {
				const cat = e.category || 'Other';
				catMap.set(cat, (catMap.get(cat) || 0) + Number(e.amount || 0));
			});
			const colors = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
			expenseByCategory = [...catMap.entries()].map(([label, value], i) => ({ label, value, color: colors[i % colors.length] })).sort((a, b) => b.value - a.value);

			// Top customers
			const custMap = new Map<string, { orders: number; total: number }>();
			rangeOrders.forEach(o => {
				const name = o.customer_name || 'Unknown';
				const existing = custMap.get(name) || { orders: 0, total: 0 };
				custMap.set(name, { orders: existing.orders + 1, total: existing.total + Number(o.amount || 0) });
			});
			topCustomers = [...custMap.entries()].map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total).slice(0, 5);

			// Recent activity
			const activity: Array<{ type: string; text: string; time: string }> = [];
			rangeOrders.slice(0, 5).forEach(o => {
				activity.push({ type: 'order', text: `New order #${o.id} from ${o.customer_name || 'Unknown'} — ${fmtPeso(o.amount)}`, time: o.created_at });
			});
			conversations.slice(0, 5).forEach(c => {
				activity.push({ type: 'chat', text: `${c.name || 'User'} sent a message`, time: c.last_activity_at || c.updated_at });
			});
			recentActivity = activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

			recentConversations = conversations.slice(0, 6);
			lastRefresh = new Date();
		} catch (err) {
			showToast('Could not load dashboard. Please try again.', 'error');
			console.error(err);
		} finally { loading = false; }
	}

	let conversionRate = $derived(
		stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0
	);
	let netProfit = $derived(stats.revenue - stats.expenses);
	let profitMargin = $derived(stats.revenue > 0 ? Math.round((netProfit / stats.revenue) * 100) : 0);
</script>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon">📊</span>
			<h1>Dashboard</h1>
			<span class="refresh-time">Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
		</div>
		<div class="page-actions">
			<div class="date-range-group">
				{#each [{ key: 'today', label: 'Today' }, { key: '7d', label: '7 Days' }, { key: '30d', label: '30 Days' }, { key: '90d', label: '90 Days' }] as dr}
					<button class="range-btn" class:active={dateRange === dr.key} onclick={() => { dateRange = dr.key; loadData(); }}>{dr.label}</button>
				{/each}
			</div>
			<button class="btn btn-ghost" onclick={loadData}>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
				Refresh
			</button>
		</div>
	</header>

	{#if loading}
		<div class="stats-grid">{#each Array(6) as _}<Skeleton height="100px" />{/each}</div>
		<div class="charts-grid" style="margin-top:20px"><Skeleton height="280px" /><Skeleton height="280px" /></div>
	{:else}
		<div class="stats-grid">
			<MetricCard label="Revenue" value={fmtPeso(stats.revenue)} icon="" color="var(--green)" change={stats.revenueChange} />
			<MetricCard label="Orders" value={fmtNum(stats.totalOrders)} icon="" color="var(--accent)" />
			<MetricCard label="Active Chats" value={stats.activeChats} icon="" color="var(--primary)" />
			<MetricCard label="Avg Order" value={fmtPeso(stats.avgOrderValue)} icon="" color="var(--info)" />
			<MetricCard label="Net Profit" value={fmtPeso(netProfit)} icon="" color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
			<MetricCard label="Conversion" value={`${conversionRate}%`} icon="" color="var(--warning)" />
		</div>

		<div class="charts-grid">
			<div class="section">
				<h2 class="section-title">Revenue Trend</h2>
				{#if revenueByDay.length > 0}
					<BarChart data={revenueByDay} color="var(--green)" />
				{:else}
					<div class="empty-chart"><p>No revenue data</p></div>
				{/if}
			</div>
			<div class="section">
				<h2 class="section-title">Order Status</h2>
				{#if orderStatusData.length > 0}
					<DonutChart data={orderStatusData} />
				{:else}
					<div class="empty-chart"><p>No orders yet</p></div>
				{/if}
			</div>
		</div>

		<div class="three-grid">
			<!-- Top Customers -->
			<div class="section">
				<h2 class="section-title">Top Customers</h2>
				{#if topCustomers.length > 0}
					<div class="customer-list">
						{#each topCustomers as cust, i}
							<div class="customer-row">
								<span class="customer-rank">#{i + 1}</span>
								<div class="customer-avatar">{cust.name.charAt(0).toUpperCase()}</div>
								<div class="customer-info">
									<div class="customer-name">{cust.name}</div>
									<div class="customer-meta">{cust.orders} orders</div>
								</div>
								<div class="customer-total">{fmtPeso(cust.total)}</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-chart"><p>No customer data</p></div>
				{/if}
			</div>

			<!-- Expense Breakdown -->
			<div class="section">
				<h2 class="section-title">Expense Breakdown</h2>
				{#if expenseByCategory.length > 0}
					<DonutChart data={expenseByCategory} />
				{:else}
					<div class="empty-chart"><p>No expenses</p></div>
				{/if}
			</div>

			<!-- Recent Activity -->
			<div class="section">
				<h2 class="section-title">Recent Activity</h2>
				<div class="activity-list">
					{#each recentActivity as act}
						<div class="activity-item">
							<span class="activity-icon">{act.type === 'order' ? '📦' : '💬'}</span>
							<div class="activity-content">
								<div class="activity-text">{act.text}</div>
								<div class="activity-time">{timeAgo(act.time)}</div>
							</div>
						</div>
					{:else}
						<div class="empty-chart"><p>No recent activity</p></div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Recent Conversations -->
		<div class="section" style="margin-top:20px">
			<div class="section-header">
				<h2 class="section-title">Recent Conversations</h2>
				<a href="/chats" class="btn btn-ghost btn-sm">View All →</a>
			</div>
			<div class="table-wrap">
				<table class="table">
					<thead><tr><th>User</th><th>Status</th><th>Bot</th><th>Last Active</th><th></th></tr></thead>
					<tbody>
						{#each recentConversations as conv}
							<tr>
								<td>
									<div class="user-cell">
										<div class="avatar">{(conv.name || conv.sender_id || 'U').charAt(0).toUpperCase()}</div>
										<div>
											<div class="user-name">{conv.name || `User ${conv.sender_id.slice(0, 8)}`}</div>
											<div class="user-id">{conv.sender_id.slice(0, 12)}...</div>
										</div>
									</div>
								</td>
								<td><span class="badge badge-{conv.status}">{conv.status}</span></td>
								<td>{conv.is_bot_enabled ? ' On' : '—'}</td>
								<td class="text-secondary">{timeAgo(conv.last_activity_at || conv.updated_at)}</td>
								<td><a href="/chats" class="btn btn-ghost btn-sm">Open</a></td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="empty-state">
									<div class="empty-icon" style="margin-bottom: 8px;">
										<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
											<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
										</svg>
									</div>
									<p><strong>No conversations yet</strong></p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Quick Stats Footer -->
		<div class="quick-stats">
			<div class="qs-item"><span class="qs-label">Paid Orders</span><span class="qs-value">{stats.paidOrders}</span></div>
			<div class="qs-item"><span class="qs-label">New Orders</span><span class="qs-value">{stats.newOrders}</span></div>
			<div class="qs-item"><span class="qs-label">Completed</span><span class="qs-value">{stats.completedOrders}</span></div>
			<div class="qs-item"><span class="qs-label">Cancelled</span><span class="qs-value">{stats.cancelledOrders}</span></div>
			<div class="qs-item"><span class="qs-label">Profit Margin</span><span class="qs-value" class:text-green={profitMargin >= 0} class:text-red={profitMargin < 0}>{profitMargin}%</span></div>
			<div class="qs-item"><span class="qs-label">Total Expenses</span><span class="qs-value">{fmtPeso(stats.expenses)}</span></div>
		</div>
	{/if}
</div>

<style>
	.page { padding: 24px 32px; max-width: 1400px; margin: 0 auto; }
	.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }
	.refresh-time { font-size: 11px; color: var(--text-tertiary); margin-left: 8px; }
	.page-actions { display: flex; gap: 8px; align-items: center; }

	.date-range-group { display: flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
	.range-btn { padding: 5px 12px; border: none; background: var(--surface); font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
	.range-btn.active { background: var(--accent); color: white; font-weight: 600; }
	.range-btn:hover { background: var(--surface-hover); }

	.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
	.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 20px; }
	.three-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }

	.section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
	.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
	.section-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
	.section-header .section-title { margin-bottom: 0; }

	.empty-chart { text-align: center; padding: 32px; color: var(--text-secondary); font-size: 13px; }

	.customer-list { display: flex; flex-direction: column; gap: 8px; }
	.customer-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 6px; }
	.customer-row:hover { background: var(--surface-hover); }
	.customer-rank { font-size: 12px; color: var(--text-tertiary); font-weight: 600; width: 24px; }
	.customer-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
	.customer-info { flex: 1; min-width: 0; }
	.customer-name { font-weight: 500; font-size: 13px; }
	.customer-meta { font-size: 11px; color: var(--text-secondary); }
	.customer-total { font-weight: 600; font-size: 13px; color: var(--green); }

	.activity-list { display: flex; flex-direction: column; gap: 6px; }
	.activity-item { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; }
	.activity-icon { font-size: 14px; margin-top: 2px; }
	.activity-content { flex: 1; }
	.activity-text { font-size: 13px; }
	.activity-time { font-size: 11px; color: var(--text-tertiary); }

	.table-wrap { overflow-x: auto; }
	.table { width: 100%; border-collapse: collapse; }
	.table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border); }
	.table td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
	.table tr:last-child td { border-bottom: none; }
	.user-cell { display: flex; align-items: center; gap: 10px; }
	.avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; }
	.user-name { font-weight: 500; font-size: 13px; }
	.user-id { font-size: 11px; color: var(--text-secondary); }
	.text-secondary { color: var(--text-secondary); }
	.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
	.badge-active { background: var(--green-bg); color: var(--green); }
	.badge-closed { background: var(--surface-hover); color: var(--text-secondary); }

	.quick-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
	.qs-item { display: flex; flex-direction: column; gap: 4px; }
	.qs-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
	.qs-value { font-size: 18px; font-weight: 600; }
	.text-green { color: var(--green); }
	.text-red { color: var(--red); }

	.empty-state { text-align: center; padding: 32px; color: var(--text-secondary); }
	.empty-icon { font-size: 36px; margin-bottom: 8px; }
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; text-decoration: none; }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); color: var(--text); }
	.btn-sm { padding: 4px 8px; font-size: 12px; }

	@media (max-width: 768px) {
		.page { padding: 16px; }
		.page-header { 
			flex-direction: column; 
			gap: 16px; 
			align-items: stretch; 
		}
		.page-actions { 
			flex-wrap: wrap; 
			justify-content: flex-start; 
		}
		
		/* Stats grid */
		.stats-grid { 
			grid-template-columns: repeat(2, 1fr); 
			gap: 8px; 
		}
		
		/* Charts and grids */
		.charts-grid, .three-grid { 
			grid-template-columns: 1fr; 
			gap: 16px; 
		}
		
		/* Date range buttons */
		.date-range-group { 
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			padding-bottom: 4px;
		}
		.range-btn {
			padding: 10px 16px;
			min-height: 44px;
			font-size: 13px;
		}
		
		/* Section padding */
		.section {
			padding: 16px;
		}
		
		/* Table improvements */
		.table-wrap {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		/* Quick stats grid */
		.quick-stats {
			grid-template-columns: repeat(2, 1fr);
			gap: 16px;
			padding: 16px;
		}
		
		/* Customer list */
		.customer-row {
			padding: 12px 8px;
		}
		
		/* Button touch targets */
		.btn {
			padding: 10px 16px;
			min-height: 44px;
		}
		.btn-sm {
			padding: 8px 12px;
			min-height: 40px;
		}
		
		/* Refresh button */
		.page-actions .btn-ghost {
			padding: 10px 16px;
			min-height: 44px;
		}
		
		/* Activity list */
		.activity-item {
			padding: 12px 0;
		}
		
		/* Table cell padding */
		.table td {
			padding: 12px 14px;
		}
		
		/* View all link */
		.section-header .btn {
			padding: 8px 12px;
			min-height: 40px;
		}
		
		/* User cell */
		.user-cell {
			gap: 12px;
		}
		
		/* Badge touch target */
		.badge {
			padding: 4px 10px;
		}
	}
	
	/* Very small phones */
	@media (max-width: 360px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
		
		.quick-stats {
			grid-template-columns: 1fr;
		}
		
		.stat-value {
			font-size: 20px;
		}
	}
</style>
