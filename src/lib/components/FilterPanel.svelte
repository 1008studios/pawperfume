<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		open: boolean;
	}

	let { open }: Props = $props();

	const dispatch = createEventDispatcher();

	interface FilterPreset {
		id: string;
		name: string;
		filters: {
			status?: string[];
			dateRange?: { start: string; end: string };
			amount?: { min?: number; max?: number };
			customer?: string;
		};
	}

	let savedFilters = $state<FilterPreset[]>([]);
	let filterName = $state('');
	
	// Current filters
	let selectedStatuses = $state<string[]>([]);
	let dateStart = $state('');
	let dateEnd = $state('');
	let minAmount = $state<number | undefined>();
	let maxAmount = $state<number | undefined>();
	let customerSearch = $state('');

	function saveFilter() {
		if (!filterName.trim()) return;
		
		const newFilter: FilterPreset = {
			id: Date.now().toString(),
			name: filterName,
			filters: {
				status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
				dateRange: (dateStart || dateEnd) ? { start: dateStart, end: dateEnd } : undefined,
				amount: (minAmount !== undefined || maxAmount !== undefined) ? { min: minAmount, max: maxAmount } : undefined,
				customer: customerSearch || undefined
			}
		};

		savedFilters = [...savedFilters, newFilter];
		filterName = '';
		dispatch('save', newFilter);
	}

	function loadFilter(filter: FilterPreset) {
		selectedStatuses = filter.filters.status || [];
		dateStart = filter.filters.dateRange?.start || '';
		dateEnd = filter.filters.dateRange?.end || '';
		minAmount = filter.filters.amount?.min;
		maxAmount = filter.filters.amount?.max;
		customerSearch = filter.filters.customer || '';
		
		dispatch('apply', filter.filters);
	}

	function deleteFilter(id: string) {
		savedFilters = savedFilters.filter(f => f.id !== id);
		dispatch('delete', id);
	}

	function clearFilters() {
		selectedStatuses = [];
		dateStart = '';
		dateEnd = '';
		minAmount = undefined;
		maxAmount = undefined;
		customerSearch = '';
		dispatch('clear');
	}

	function applyFilters() {
		dispatch('apply', {
			status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
			dateRange: (dateStart || dateEnd) ? { start: dateStart, end: dateEnd } : undefined,
			amount: (minAmount !== undefined || maxAmount !== undefined) ? { min: minAmount, max: maxAmount } : undefined,
			customer: customerSearch || undefined
		});
	}

	function toggleStatus(status: string) {
		if (selectedStatuses.includes(status)) {
			selectedStatuses = selectedStatuses.filter(s => s !== status);
		} else {
			selectedStatuses = [...selectedStatuses, status];
		}
	}
</script>

{#if open}
	<div class="filter-panel">
		<div class="filter-header">
			<h3>Advanced Filters</h3>
			<button class="btn-icon" onclick={clearFilters}>Clear All</button>
		</div>

		<div class="filter-sections">
			<!-- Status Filter -->
			<div class="filter-section">
				<span class="filter-label">Status</span>
				<div class="status-chips">
					{#each ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as status}
						<button
							class="status-chip"
							class:selected={selectedStatuses.includes(status)}
							onclick={() => toggleStatus(status)}
						>
							{status}
						</button>
					{/each}
				</div>
			</div>

			<!-- Date Range -->
			<div class="filter-section">
				<span class="filter-label">Date Range</span>
				<div class="date-range">
					<input
						type="date"
						bind:value={dateStart}
						placeholder="Start date"
						class="filter-input"
						aria-label="Start date"
					/>
					<span class="date-separator">to</span>
					<input
						type="date"
						bind:value={dateEnd}
						placeholder="End date"
						class="filter-input"
						aria-label="End date"
					/>
				</div>
			</div>

			<!-- Amount Range -->
			<div class="filter-section">
				<span class="filter-label">Amount Range (₱)</span>
				<div class="amount-range">
					<input
						type="number"
						bind:value={minAmount}
						placeholder="Min"
						class="filter-input"
						min="0"
						aria-label="Minimum amount"
					/>
					<span class="amount-separator">-</span>
					<input
						type="number"
						bind:value={maxAmount}
						placeholder="Max"
						class="filter-input"
						min="0"
						aria-label="Maximum amount"
					/>
				</div>
			</div>

			<!-- Customer Search -->
			<div class="filter-section">
				<label class="filter-label" for="customer-filter-input">Customer</label>
				<input
					type="text"
					id="customer-filter-input"
					bind:value={customerSearch}
					placeholder="Search by customer name..."
					class="filter-input"
				/>
			</div>
		</div>

		<div class="filter-actions">
			<button class="btn btn-secondary" onclick={applyFilters}>
				Apply Filters
			</button>
			<div class="save-filter-group">
				<input
					type="text"
					bind:value={filterName}
					placeholder="Filter name"
					class="filter-input"
					aria-label="Filter preset name"
				/>
				<button class="btn btn-primary" onclick={saveFilter}>
					Save
				</button>
			</div>
		</div>

		<!-- Saved Filters -->
		{#if savedFilters.length > 0}
			<div class="saved-filters">
				<h4>Saved Filters</h4>
				<div class="saved-filters-list">
					{#each savedFilters as filter}
						<div class="saved-filter-item">
							<button class="saved-filter-name" onclick={() => loadFilter(filter)}>
								{filter.name}
							</button>
							<button class="btn-icon danger" onclick={() => deleteFilter(filter.id)} aria-label="Delete filter preset" title="Delete filter preset">
								×
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.filter-panel {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 24px;
		margin-bottom: 24px;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.filter-header h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--text);
	}

	.filter-sections {
		display: grid;
		gap: 20px;
		margin-bottom: 24px;
	}

	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.status-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.status-chip {
		padding: 6px 12px;
		border: 1px solid var(--border);
		border-radius: 16px;
		background: var(--surface);
		color: var(--text);
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: capitalize;
	}

	.status-chip:hover {
		border-color: var(--primary);
	}

	.status-chip.selected {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.date-range,
	.amount-range {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.date-separator,
	.amount-separator {
		color: var(--text-tertiary);
		font-size: 13px;
	}

	.filter-input {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font-size: 14px;
	}

	.filter-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.filter-actions {
		display: flex;
		gap: 12px;
		margin-bottom: 24px;
	}

	.save-filter-group {
		display: flex;
		gap: 8px;
		flex: 1;
	}

	.btn {
		padding: 8px 16px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--primary-hover);
	}

	.btn-secondary {
		background: var(--surface-hover);
		color: var(--text);
	}

	.btn-secondary:hover {
		background: var(--border);
	}

	.btn-icon {
		padding: 4px 8px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-tertiary);
		font-size: 14px;
	}

	.btn-icon:hover {
		color: var(--text);
	}

	.btn-icon.danger:hover {
		color: var(--danger);
	}

	.saved-filters {
		border-top: 1px solid var(--border);
		padding-top: 20px;
	}

	.saved-filters h4 {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.saved-filters-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.saved-filter-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.saved-filter-name {
		flex: 1;
		padding: 8px 12px;
		background: var(--surface-hover);
		border: none;
		border-radius: 6px;
		text-align: left;
		cursor: pointer;
		color: var(--text);
		font-size: 14px;
	}

	.saved-filter-name:hover {
		background: var(--border);
	}
</style>
