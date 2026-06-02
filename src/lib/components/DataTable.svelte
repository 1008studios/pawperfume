<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		width?: string;
		align?: 'left' | 'center' | 'right';
		render?: (value: any, row: any) => string;
	}

	interface Props {
		data: any[];
		columns: Column[];
		sortable?: boolean;
		filterable?: boolean;
		paginated?: boolean;
		pageSize?: number;
		searchable?: boolean;
		selectable?: boolean;
	}

	let { 
		data, 
		columns,
		sortable = true,
		filterable = false,
		paginated = false,
		pageSize = 10,
		searchable = false,
		selectable = false
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let sortColumn = $state('');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let currentPage = $state(1);
	let searchQuery = $state('');
	let selectedRows = $state<Set<number>>(new Set());

	const filteredData = $derived(() => {
		let result = [...data];
		
		// Search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(row => 
				columns.some(col => {
					const value = row[col.key];
					return value && String(value).toLowerCase().includes(query);
				})
			);
		}
		
		// Sort
		if (sortColumn) {
			result.sort((a, b) => {
				const aVal = a[sortColumn];
				const bVal = b[sortColumn];
				
				if (aVal === bVal) return 0;
				if (aVal === null || aVal === undefined) return 1;
				if (bVal === null || bVal === undefined) return -1;
				
				const comparison = aVal < bVal ? -1 : 1;
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		}
		
		return result;
	});

	const paginatedData = $derived(() => {
		if (!paginated) return filteredData();
		
		const start = (currentPage - 1) * pageSize;
		const end = start + pageSize;
		return filteredData().slice(start, end);
	});

	const totalPages = $derived(() => {
		if (!paginated) return 1;
		return Math.ceil(filteredData().length / pageSize);
	});

	function handleSort(column: Column) {
		if (!sortable || !column.sortable) return;
		
		if (sortColumn === column.key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column.key;
			sortDirection = 'asc';
		}
		
		dispatch('sort', { column: column.key, direction: sortDirection });
	}

	function handlePageChange(page: number) {
		currentPage = page;
		dispatch('pageChange', page);
	}

	function handleRowSelect(index: number) {
		if (!selectable) return;
		
		const newSelected = new Set(selectedRows);
		if (newSelected.has(index)) {
			newSelected.delete(index);
		} else {
			newSelected.add(index);
		}
		selectedRows = newSelected;
		
		dispatch('select', Array.from(selectedRows));
	}

	function handleSelectAll() {
		if (selectedRows.size === paginatedData().length) {
			selectedRows = new Set();
		} else {
			selectedRows = new Set(paginatedData().map((_, i) => i));
		}
		
		dispatch('select', Array.from(selectedRows));
	}

	function getCellValue(row: any, column: Column): string {
		const value = row[column.key];
		if (column.render) {
			return column.render(value, row);
		}
		return value ?? '';
	}
</script>

<div class="data-table">
	{#if searchable}
		<div class="table-toolbar">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search..."
				class="search-input"
			/>
		</div>
	{/if}

	<div class="table-wrapper">
		<table class="table">
			<thead>
				<tr>
					{#if selectable}
						<th class="checkbox-column">
							<input
								type="checkbox"
								checked={selectedRows.size === paginatedData().length && paginatedData().length > 0}
								onchange={handleSelectAll}
							/>
						</th>
					{/if}
					
					{#each columns as column}
						<th
							class:sortable={sortable && column.sortable}
							style="width: {column.width || 'auto'}; text-align: {column.align || 'left'}"
							onclick={() => handleSort(column)}
						>
							<span class="th-content">
								{column.label}
								{#if sortable && column.sortable && sortColumn === column.key}
									<span class="sort-indicator">
										{sortDirection === 'asc' ? '↑' : '↓'}
									</span>
								{/if}
							</span>
						</th>
					{/each}
				</tr>
			</thead>
			
			<tbody>
				{#each paginatedData() as row, rowIndex}
					<tr class:selectable class:selected={selectedRows.has(rowIndex)}>
						{#if selectable}
							<td class="checkbox-column">
								<input
									type="checkbox"
									checked={selectedRows.has(rowIndex)}
									onchange={() => handleRowSelect(rowIndex)}
								/>
							</td>
						{/if}
						
						{#each columns as column}
							<td style="text-align: {column.align || 'left'}">
								{@html getCellValue(row, column)}
							</td>
						{/each}
					</tr>
				{:else}
					<tr>
						<td colspan={columns.length + (selectable ? 1 : 0)} class="empty-state">
							No data available
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if paginated && totalPages() > 1}
		<div class="pagination">
			<button
				class="page-button"
				disabled={currentPage === 1}
				onclick={() => handlePageChange(currentPage - 1)}
			>
				Previous
			</button>
			
			<div class="page-numbers">
				{#each Array(totalPages()) as _, i}
					{@const page = i + 1}
					<button
						class="page-number"
						class:active={currentPage === page}
						onclick={() => handlePageChange(page)}
					>
						{page}
					</button>
				{/each}
			</div>
			
			<button
				class="page-button"
				disabled={currentPage === totalPages()}
				onclick={() => handlePageChange(currentPage + 1)}
			>
				Next
			</button>
		</div>
	{/if}
</div>

<style>
	.data-table {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.table-toolbar {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.search-input {
		padding: 8px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		min-width: 240px;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.table-wrapper {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		background: var(--surface);
	}

	.table thead {
		background: var(--surface-hover);
		border-bottom: 2px solid var(--border);
	}

	.table th {
		padding: 12px 16px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.table th.sortable {
		cursor: pointer;
		user-select: none;
	}

	.table th.sortable:hover {
		background: var(--border);
	}

	.th-content {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.sort-indicator {
		font-size: 14px;
	}

	.table td {
		padding: 12px 16px;
		font-size: 14px;
		color: var(--text);
		border-bottom: 1px solid var(--border);
	}

	.table tbody tr:last-child td {
		border-bottom: none;
	}

	.table tbody tr.selectable {
		cursor: pointer;
	}

	.table tbody tr.selectable:hover {
		background: var(--surface-hover);
	}

	.table tbody tr.selected {
		background: var(--primary-bg);
	}

	.checkbox-column {
		width: 40px;
		text-align: center !important;
	}

	.checkbox-column input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.empty-state {
		text-align: center;
		padding: 40px 16px !important;
		color: var(--text-tertiary);
		font-style: italic;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}

	.page-button {
		padding: 8px 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.page-button:hover:not(:disabled) {
		background: var(--surface-hover);
	}

	.page-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-numbers {
		display: flex;
		gap: 4px;
	}

	.page-number {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.page-number:hover {
		background: var(--surface-hover);
	}

	.page-number.active {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	@media (max-width: 768px) {
		.search-input {
			min-width: 100%;
		}

		.table th,
		.table td {
			padding: 8px 12px;
			font-size: 13px;
		}

		.pagination {
			flex-wrap: wrap;
		}

		.page-numbers {
			order: 3;
			width: 100%;
			justify-content: center;
			margin-top: 8px;
		}
	}
</style>
