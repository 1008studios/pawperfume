<script lang="ts">
	import { onMount } from 'svelte';
	import { api, fmtPeso, showToast, downloadCSV } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { LedgerEntry } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import InlineEdit from '$lib/components/InlineEdit.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let entries = $state<LedgerEntry[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let searchQuery = $state('');
	let typeFilter = $state<'all' | 'income' | 'expense'>('all');
	let categoryFilter = $state('all');
	let dateFrom = $state('');
	let dateTo = $state('');
	let sortField = $state<'date' | 'amount'>('date');
	let sortDir = $state<'asc' | 'desc'>('desc');

	let newEntry = $state<Partial<LedgerEntry>>({
		date: new Date().toISOString().split('T')[0],
		type: 'expense', amount: 0, description: '', category: ''
	});

	const presetCategories = ['Supplies', 'Shipping', 'Rent', 'Utilities', 'Marketing', 'Inventory', 'Packaging', 'Misc'];
	const presetAmounts = [100, 250, 500, 1000, 2000, 5000];

	onMount(async () => { await loadEntries(); });

	async function loadEntries() {
		loading = true;
		try { entries = await api.finance() as LedgerEntry[]; }
		catch { showToast('Could not load finance data. Please try again.', 'error'); }
		finally { loading = false; }
	}

	let summary = $derived.by(() => {
		const filtered = filteredEntries;
		const income = filtered.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0);
		const expense = filtered.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount || 0), 0);
		return { income, expense, net: income - expense, count: filtered.length };
	});

	let filteredEntries = $derived.by(() => {
		let list = entries;
		if (typeFilter !== 'all') list = list.filter(e => e.type === typeFilter);
		if (categoryFilter !== 'all') list = list.filter(e => (e.category || 'Other') === categoryFilter);
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			list = list.filter(e => (e.description || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q));
		}
		if (dateFrom) list = list.filter(e => e.date >= dateFrom);
		if (dateTo) list = list.filter(e => e.date <= dateTo);
		list = [...list].sort((a, b) => {
			const va = sortField === 'date' ? a.date : String(a.amount);
			const vb = sortField === 'date' ? b.date : String(b.amount);
			return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
		});
		return list;
	});

	let categories = $derived.by(() => [...new Set(entries.map(e => e.category || 'Other'))].sort());

	let categoryBreakdown = $derived.by(() => {
		const map = new Map<string, number>();
		entries.filter(e => typeFilter === 'all' ? e.type === 'expense' : e.type === typeFilter).forEach(e => {
			const cat = e.category || 'Other';
			map.set(cat, (map.get(cat) || 0) + Number(e.amount || 0));
		});
		const colors = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
		return [...map.entries()].map(([label, value], i) => ({ label, value, color: colors[i % colors.length] })).sort((a, b) => b.value - a.value);
	});

	let monthlyTrend = $derived.by(() => {
		const map = new Map<string, { income: number; expense: number }>();
		entries.forEach(e => {
			const month = e.date?.substring(0, 7) || 'Unknown';
			const existing = map.get(month) || { income: 0, expense: 0 };
			if (e.type === 'income') existing.income += Number(e.amount || 0);
			else existing.expense += Number(e.amount || 0);
			map.set(month, existing);
		});
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
	});

	async function addEntry() {
		try {
			await api.createFinance(newEntry);
			showToast('Entry added.', 'success');
			showForm = false;
			newEntry = { date: new Date().toISOString().split('T')[0], type: 'expense', amount: 0, description: '', category: '' };
			await loadEntries();
		} catch { showToast('Could not add entry. Check your fields and try again.', 'error'); }
	}

	function promptDelete(id: number) { deletingId = id; showDeleteConfirm = true; }

	async function confirmDelete() {
		if (!deletingId) return;
		try { await api.deleteFinance(deletingId); showToast('Entry deleted.', 'success'); await loadEntries(); }
		catch { showToast('Could not delete. Please try again.', 'error'); }
		finally { showDeleteConfirm = false; deletingId = null; }
	}

	function exportCSV() {
		const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
		const rows = filteredEntries.map(e => [e.date, e.description || '', e.category || '', e.type, String(e.amount)]);
		downloadCSV(headers, rows, 'pawperfume-finance.csv');
		showToast('CSV exported.', 'success');
	}

	function clearFilters() { searchQuery = ''; typeFilter = 'all'; categoryFilter = 'all'; dateFrom = ''; dateTo = ''; }

	async function updateField(id: number, fields: Partial<LedgerEntry>) {
		try {
			await api.updateFinance(id, fields);
			showToast('Finance entry updated.', 'success');
			await loadEntries();
		} catch {
			showToast('Failed to update finance entry.', 'error');
			throw new Error('Save failed');
		}
	}

	let hasFilters = $derived(searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo);
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This Entry?"
	message="This entry will be removed from your financial records. This action cannot be undone."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDelete}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Finance</h1>
		</div>
		<div class="page-actions">
			<button class="btn btn-ghost" onclick={exportCSV}>Export CSV</button>
			<button class="btn btn-primary" onclick={() => showForm = true}>+ Add Entry</button>
		</div>
	</header>

	<div class="stats-grid">
		<div class="stat-card income">
			<div class="stat-icon"></div>
			<div class="stat-body">
				<div class="stat-label">Income</div>
				<div class="stat-value text-green">{fmtPeso(summary.income)}</div>
				<div class="stat-sub">{entries.filter(e => e.type === 'income').length} entries</div>
			</div>
		</div>
		<div class="stat-card expense">
			<div class="stat-icon"></div>
			<div class="stat-body">
				<div class="stat-label">Expenses</div>
				<div class="stat-value text-red">{fmtPeso(summary.expense)}</div>
				<div class="stat-sub">{entries.filter(e => e.type === 'expense').length} entries</div>
			</div>
		</div>
		<div class="stat-card net">
			<div class="stat-icon"></div>
			<div class="stat-body">
				<div class="stat-label">Net Profit</div>
				<div class="stat-value" class:text-green={summary.net >= 0} class:text-red={summary.net < 0}>{fmtPeso(summary.net)}</div>
				<div class="stat-sub">Income - Expenses</div>
			</div>
		</div>
		<div class="stat-card margin">
			<div class="stat-icon"></div>
			<div class="stat-body">
				<div class="stat-label">Margin</div>
				<div class="stat-value">{summary.income > 0 ? Math.round((summary.net / summary.income) * 100) : 0}%</div>
				<div class="stat-sub">Net / Income</div>
			</div>
		</div>
	</div>

	{#if categoryBreakdown.length > 0}
		<div class="charts-row">
			<div class="chart-card">
				<h3>Category Breakdown ({typeFilter === 'all' ? 'Expenses' : typeFilter})</h3>
				<DonutChart data={categoryBreakdown} />
			</div>
			<div class="chart-card">
				<h3>Monthly Trend</h3>
				<div class="monthly-list">
					{#each monthlyTrend as [month, data]}
						<div class="monthly-row">
							<span class="monthly-label">{month}</span>
							<div class="monthly-bars">
								<div class="bar income-bar" style="width:{Math.min(100, (data.income / Math.max(...monthlyTrend.map(([, d]) => Math.max(d.income, d.expense)), 1)) * 100)}%"></div>
								<div class="bar expense-bar" style="width:{Math.min(100, (data.expense / Math.max(...monthlyTrend.map(([, d]) => Math.max(d.income, d.expense)), 1)) * 100)}%"></div>
							</div>
							<span class="monthly-amount">{fmtPeso(data.income - data.expense)}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<div class="filter-bar">
		<div class="filter-left">
			<button class="filter-chip" class:active={typeFilter === 'all'} onclick={() => typeFilter = 'all'}>All</button>
			<button class="filter-chip" class:active={typeFilter === 'income'} onclick={() => typeFilter = 'income'}>Income</button>
			<button class="filter-chip" class:active={typeFilter === 'expense'} onclick={() => typeFilter = 'expense'}>Expense</button>
			{#if categories.length > 1}
				<select bind:value={categoryFilter} class="filter-select">
					<option value="all">All Categories</option>
					{#each categories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			{/if}
		</div>
		<div class="filter-right">
			<div class="search-box">
				<input type="text" placeholder="Search..." bind:value={searchQuery} />
			</div>
			<input type="date" bind:value={dateFrom} class="filter-date" />
			<input type="date" bind:value={dateTo} class="filter-date" />
			{#if hasFilters}
				<button class="btn btn-ghost btn-sm" onclick={clearFilters}>Clear</button>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="table-wrap"><table class="table"><thead><tr>{#each Array(5) as _}<th><Skeleton width="60px" height="12px" /></th>{/each}</tr></thead>
		<tbody>{#each Array(6) as _}<tr>{#each Array(5) as _}<td><Skeleton width="80%" height="14px" /></td>{/each}</tr>{/each}</tbody></table></div>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th onclick={() => { sortField = 'date'; sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }} style="cursor:pointer">Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
						<th>Description</th>
						<th>Category</th>
						<th>Type</th>
						<th onclick={() => { sortField = 'amount'; sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }} style="cursor:pointer">Amount {sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each filteredEntries as entry}
						<tr>
							<td>
								<InlineEdit
									bind:value={entry.date}
									onSave={(val) => updateField(entry.id, { date: val })}
									placeholder="YYYY-MM-DD"
								/>
							</td>
							<td>
								<InlineEdit
									bind:value={entry.description}
									onSave={(val) => updateField(entry.id, { description: val })}
									placeholder="Description..."
								/>
							</td>
							<td>
								<InlineEdit
									bind:value={entry.category}
									type="select"
									options={presetCategories}
									onSave={(val) => updateField(entry.id, { category: val })}
									placeholder="Category..."
								/>
							</td>
							<td>
								<InlineEdit
									bind:value={entry.type}
									type="select"
									options={['expense', 'income']}
									onSave={(val) => updateField(entry.id, { type: val })}
								/>
							</td>
							<td class="amount" class:text-green={entry.type === 'income'} class:text-red={entry.type === 'expense'}>
								<InlineEdit
									bind:value={entry.amount}
									type="number"
									currency={true}
									onSave={(val) => updateField(entry.id, { amount: val })}
								/>
							</td>
							<td>
								<button class="btn-icon danger" onclick={() => promptDelete(entry.id)} title="Delete entry" aria-label="Delete entry">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="3 6 5 6 21 6"></polyline>
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
										<line x1="10" y1="11" x2="10" y2="17"></line>
										<line x1="14" y1="11" x2="14" y2="17"></line>
									</svg>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" style="padding: 0;">
								<EmptyState
									title="No ledger entries found"
									description={hasFilters ? "Try adjusting your filters or date range to find specific records." : "Log store income, operational expenses, shipping supplies, and more to see your profit margins."}
									iconType="finance"
									actionText={hasFilters ? "Clear Filters" : "Log First Entry"}
									onAction={hasFilters ? clearFilters : () => showForm = true}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showForm = false)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>Add Entry</h3>
				<button class="btn-icon" onclick={() => showForm = false} aria-label="Close modal">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
			<form onsubmit={e => { e.preventDefault(); addEntry(); }}>
				<div class="form-grid">
					<div class="form-group">
						<label for="fin-date">Date</label>
						<input id="fin-date" type="date" bind:value={newEntry.date} />
					</div>
					<div class="form-group">
						<label for="fin-type">Type</label>
						<select id="fin-type" bind:value={newEntry.type}>
							<option value="expense">Expense</option>
							<option value="income">Income</option>
						</select>
					</div>
				</div>
				<div class="form-group">
					<label for="fin-desc">Description</label>
					<input id="fin-desc" type="text" bind:value={newEntry.description} placeholder="What was this for?" />
				</div>
				<div class="form-group">
					<label for="fin-cat">Quick Category</label>
					<div class="preset-cats">
						{#each presetCategories as cat}
							<button type="button" class="preset-chip" class:active={newEntry.category === cat} onclick={() => newEntry.category = cat}>{cat}</button>
						{/each}
					</div>
				</div>
				<div class="form-grid">
					<div class="form-group">
						<label for="fin-cat">Category</label>
						<input id="fin-cat" type="text" bind:value={newEntry.category} placeholder="Custom category" />
					</div>
					<div class="form-group">
						<label for="fin-amt">Amount (₱)</label>
						<input id="fin-amt" type="number" bind:value={newEntry.amount} min="0" step="0.01" />
						<div class="preset-amounts">
							{#each presetAmounts as amt}
								<button type="button" class="amt-chip" onclick={() => newEntry.amount = amt}>₱{amt}</button>
							{/each}
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => showForm = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add Entry</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page { padding: 24px 32px; max-width: 1200px; margin: 0 auto; }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }
	.page-actions { display: flex; gap: 8px; }

	.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
	.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; gap: 12px; align-items: center; }
	.stat-icon { font-size: 24px; }
	.stat-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
	.stat-value { font-size: 22px; font-weight: 600; margin: 2px 0; }
	.stat-sub { font-size: 11px; color: var(--text-tertiary); }
	.text-green { color: var(--green); }
	.text-red { color: var(--red); }

	.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
	.chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
	.chart-card h3 { font-size: 14px; font-weight: 600; margin-bottom: 16px; }

	.monthly-list { display: flex; flex-direction: column; gap: 8px; }
	.monthly-row { display: flex; align-items: center; gap: 12px; }
	.monthly-label { font-size: 12px; color: var(--text-secondary); width: 60px; flex-shrink: 0; }
	.monthly-bars { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.bar { height: 8px; border-radius: 4px; transition: width 0.3s; }
	.income-bar { background: var(--green); }
	.expense-bar { background: var(--red); opacity: 0.7; }
	.monthly-amount { font-size: 12px; font-weight: 500; width: 80px; text-align: right; flex-shrink: 0; }

	.filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
	.filter-left, .filter-right { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
	.filter-chip { padding: 4px 12px; border: 1px solid var(--border); border-radius: 16px; font-size: 12px; background: var(--surface); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
	.filter-chip.active { background: var(--accent-bg); color: var(--accent); border-color: var(--accent); }
	.filter-select { padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; background: var(--surface); color: var(--text); }
	.filter-date { padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; background: var(--surface); color: var(--text); }
	.search-box input { padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; background: var(--surface); color: var(--text); width: 120px; }
	.search-box input:focus, .filter-select:focus, .filter-date:focus { outline: none; border-color: var(--accent); }

	.table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
	.table { width: 100%; border-collapse: collapse; }
	.table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border); user-select: none; }
	.table td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
	.table tr:last-child td { border-bottom: none; }
	.table tr:hover td { background: var(--surface-hover); }
	.amount { font-weight: 600; }
	.empty-state { text-align: center; padding: 48px; color: var(--text-secondary); }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }

	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); }
	.btn-sm { padding: 4px 8px; font-size: 12px; }
	.btn-icon { background: none; border: none; cursor: pointer; padding: 4px; border-radius: var(--radius-sm); font-size: 14px; }
	.btn-icon:hover { background: var(--surface-hover); }
	.btn-icon.danger:hover { color: var(--red); }

	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 520px; max-width: 95vw; box-shadow: var(--shadow-lg); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
	.modal-header h3 { font-size: 16px; font-weight: 600; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 20px; }
	.form-group { padding: 0 20px; margin-bottom: 12px; }
	.form-grid .form-group { padding: 0; }
	.form-group label { display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; }
	.form-group input, .form-group select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; background: var(--bg); color: var(--text); }
	.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border); }

	.preset-cats { display: flex; flex-wrap: wrap; gap: 4px; }
	.preset-chip { padding: 3px 10px; border: 1px solid var(--border); border-radius: 12px; font-size: 11px; background: var(--surface); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
	.preset-chip.active { background: var(--accent-bg); color: var(--accent); border-color: var(--accent); }
	.preset-amounts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
	.amt-chip { padding: 2px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 11px; background: var(--surface); color: var(--text-secondary); cursor: pointer; }
	.amt-chip:hover { background: var(--accent-bg); color: var(--accent); }

	@media (max-width: 768px) {
		.page { padding: 16px; }
		.page-header { 
			flex-direction: column; 
			gap: 16px; 
			align-items: stretch; 
		}
		.page-actions { 
			flex-wrap: wrap; 
		}
		
		/* Charts */
		.charts-row { 
			grid-template-columns: 1fr; 
			gap: 16px; 
		}
		
		/* Form grid */
		.form-grid { 
			grid-template-columns: 1fr; 
		}
		
		/* Stats grid */
		.stats-grid { 
			grid-template-columns: repeat(2, 1fr); 
			gap: 8px; 
		}
		
		/* Stat card */
		.stat-card { 
			padding: 12px; 
		}
		.stat-value { 
			font-size: 20px; 
		}
		
		/* Filter bar stacking */
		.filter-bar { 
			flex-direction: column; 
			align-items: stretch; 
		}
		.filter-left, 
		.filter-right { 
			flex-wrap: wrap; 
		}
		
		/* Table overflow */
		.table-wrap { 
			overflow-x: auto; 
			-webkit-overflow-scrolling: touch; 
		}
		
		/* Better button touch targets */
		.btn { 
			padding: 10px 16px; 
			min-height: 44px; 
		}
		.btn-sm { 
			padding: 8px 12px; 
			min-height: 40px; 
		}
		.btn-icon { 
			padding: 10px; 
			min-width: 44px; 
			min-height: 44px; 
		}
		
		/* Filter inputs */
		.filter-chip { 
			padding: 8px 14px; 
			min-height: 40px; 
		}
		.filter-select, 
		.filter-date { 
			padding: 8px 12px; 
			font-size: 16px; 
			min-height: 44px; 
		}
		.search-box input { 
			padding: 8px 12px; 
			font-size: 16px; 
			min-height: 44px; 
			width: 100%; 
		}
		
		/* Modal improvements */
		.modal { 
			margin: 16px; 
			max-height: calc(100vh - 32px); 
			max-height: calc(100dvh - 32px); 
		}
		
		/* Form inputs */
		.form-group input, 
		.form-group select { 
			padding: 12px 14px; 
			font-size: 16px; 
			min-height: 48px; 
		}
		
		/* Preset chips */
		.preset-chip { 
			padding: 8px 14px; 
			min-height: 40px; 
		}
		.amt-chip { 
			padding: 6px 12px; 
			min-height: 36px; 
		}
		
		/* Table row actions visible on mobile */
		.table td:last-child {
			opacity: 1;
		}
		
		/* Monthly trend */
		.monthly-row {
			padding: 8px 0;
		}
		.monthly-label {
			width: 50px;
			font-size: 11px;
		}
		.monthly-amount {
			width: 70px;
			font-size: 11px;
		}
		
		/* Chart card */
		.chart-card {
			padding: 16px;
		}
		.chart-card h3 {
			font-size: 13px;
			margin-bottom: 12px;
		}
	}
	
	/* Very small phones */
	@media (max-width: 360px) {
		.stats-grid { 
			grid-template-columns: 1fr; 
		}
		
		.stat-value { 
			font-size: 18px; 
		}
		
		.stat-icon { 
			font-size: 20px; 
		}
	}
</style>

