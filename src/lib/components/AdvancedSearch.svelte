<script lang="ts">
	interface Props {
		query: string;
		filters: Record<string, any>;
		results: any[];
		placeholder?: string;
		filterOptions?: Record<string, { label: string; options: string[] }>;
	}

	let { 
		query = $bindable(''),
		filters = $bindable({}),
		results = [],
		placeholder = 'Search...',
		filterOptions = {},
		children
	}: Props & { children?: import('svelte').Snippet<[any[]]> } = $props();

	let showFilters = $state(false);
	let activeFilterCount = $derived(Object.keys(filters).filter(k => filters[k]).length);

	function toggleFilters() {
		showFilters = !showFilters;
	}

	function clearFilters() {
		filters = {};
	}

	function removeFilter(key: string) {
		filters = { ...filters, [key]: null };
	}

	function getActiveFilterLabels() {
		return Object.entries(filters)
			.filter(([_, value]) => value)
			.map(([key, value]) => ({
				key,
				label: filterOptions[key]?.label || key,
				value
			}));
	}
</script>

<div class="search-container">
	<div class="search-bar">
		<div class="search-input-wrapper">
			<span class="search-icon"></span>
			<input
				type="text"
				bind:value={query}
				{placeholder}
				class="search-input"
			/>
			{#if query}
				<button class="clear-search" onclick={() => query = ''} aria-label="Clear search">
					
				</button>
			{/if}
		</div>

		{#if Object.keys(filterOptions).length > 0}
			<button class="filter-toggle" onclick={toggleFilters} class:active={showFilters}>
				<span></span>
				<span>Filters</span>
				{#if activeFilterCount > 0}
					<span class="filter-badge">{activeFilterCount}</span>
				{/if}
			</button>
		{/if}
	</div>

	{#if showFilters}
		<div class="filters-panel">
			<div class="filters-header">
				<h3>Filters</h3>
				{#if activeFilterCount > 0}
					<button class="clear-filters" onclick={clearFilters}>
						Clear All
					</button>
				{/if}
			</div>

			<div class="filters-grid">
				{#each Object.entries(filterOptions) as [key, config]}
					<div class="filter-group">
						<label for="filter-select-{key}" class="filter-label">{config.label}</label>
						<select id="filter-select-{key}" bind:value={filters[key]} class="filter-select">
							<option value={null}>All</option>
							{#each config.options as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if activeFilterCount > 0}
		<div class="active-filters">
			{#each getActiveFilterLabels() as filter}
				<div class="filter-chip">
					<span class="filter-chip-label">{filter.label}:</span>
					<span class="filter-chip-value">{filter.value}</span>
					<button 
						class="filter-chip-remove"
						onclick={() => removeFilter(filter.key)}
						aria-label="Remove {filter.label} filter"
					>
						
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<div class="search-results">
		<div class="results-count">
			{results.length} result{results.length !== 1 ? 's' : ''} found
		</div>
		{#if children}
			{@render children(results)}
		{/if}
	</div>
</div>

<style>
	.search-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.search-bar {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.search-input-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		font-size: 16px;
		color: var(--text-tertiary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 10px 12px 10px 40px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 14px;
		color: var(--text);
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-bg);
	}

	.clear-search {
		position: absolute;
		right: 8px;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-hover);
		border: none;
		border-radius: 4px;
		color: var(--text-tertiary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.clear-search:hover {
		background: var(--border);
		color: var(--text);
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.filter-toggle:hover {
		background: var(--surface-hover);
	}

	.filter-toggle.active {
		background: var(--primary-bg);
		border-color: var(--primary);
		color: var(--primary);
	}

	.filter-badge {
		position: absolute;
		top: -6px;
		right: -6px;
		min-width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--primary);
		color: white;
		font-size: 11px;
		font-weight: 600;
		border-radius: 9px;
		padding: 0 5px;
	}

	.filters-panel {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px;
		animation: slideDown 0.2s ease-out;
	}

	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.filters-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.clear-filters {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 13px;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.clear-filters:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 12px;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.filter-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.filter-select {
		padding: 8px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		color: var(--text);
		cursor: pointer;
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--primary);
	}

	.active-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--primary-bg);
		border: 1px solid var(--primary);
		border-radius: 16px;
		font-size: 13px;
	}

	.filter-chip-label {
		color: var(--text-secondary);
	}

	.filter-chip-value {
		color: var(--primary);
		font-weight: 500;
	}

	.filter-chip-remove {
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--primary);
		cursor: pointer;
		border-radius: 50%;
		transition: all 0.2s ease;
		padding: 0;
		font-size: 12px;
	}

	.filter-chip-remove:hover {
		background: var(--primary);
		color: white;
	}

	.search-results {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.results-count {
		font-size: 13px;
		color: var(--text-tertiary);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 768px) {
		.search-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.filters-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
