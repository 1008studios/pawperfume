<script lang="ts">
	interface AuditLog {
		id: string;
		timestamp: string;
		user: string;
		action: string;
		resource: string;
		resourceId: string;
		details?: Record<string, any>;
		ipAddress?: string;
	}

	interface Props {
		logs: AuditLog[];
	}

	let { logs }: Props = $props();

	let filterAction = $state('');
	let filterUser = $state('');

	const ACTION_COLORS: Record<string, string> = {
		create: '#10b981',
		update: '#3b82f6',
		delete: '#ef4444',
		login: '#8b5cf6',
		logout: '#6b7280',
		export: '#f59e0b'
	};

	let filteredLogs = $derived(() => {
		return logs.filter(log => {
			if (filterAction && log.action !== filterAction) return false;
			if (filterUser && !log.user.toLowerCase().includes(filterUser.toLowerCase())) return false;
			return true;
		});
	});

	function getActionColor(action: string): string {
		return ACTION_COLORS[action] || '#6b7280';
	}

	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function clearFilters() {
		filterAction = '';
		filterUser = '';
	}
</script>

<div class="audit-logs">
	<div class="filters">
		<input 
			type="text" 
			bind:value={filterUser}
			placeholder="Filter by user..."
			class="filter-input"
		/>
		<select bind:value={filterAction} class="filter-select">
			<option value="">All actions</option>
			<option value="create">Create</option>
			<option value="update">Update</option>
			<option value="delete">Delete</option>
			<option value="login">Login</option>
			<option value="logout">Logout</option>
			<option value="export">Export</option>
		</select>
		{#if filterAction || filterUser}
			<button class="btn btn-secondary" onclick={clearFilters}>
				Clear Filters
			</button>
		{/if}
	</div>

	<div class="logs-table">
		<table>
			<thead>
				<tr>
					<th>Timestamp</th>
					<th>User</th>
					<th>Action</th>
					<th>Resource</th>
					<th>Details</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredLogs() as log (log.id)}
					<tr>
						<td class="timestamp">{formatTimestamp(log.timestamp)}</td>
						<td class="user">{log.user}</td>
						<td>
							<span class="action-badge" style="background: {getActionColor(log.action)}20; color: {getActionColor(log.action)}">
								{log.action}
							</span>
						</td>
						<td class="resource">
							<span class="resource-type">{log.resource}</span>
							<span class="resource-id">#{log.resourceId}</span>
						</td>
						<td class="details">
							{#if log.details}
								<button class="details-toggle" onclick={(e) => {
									const el = e.currentTarget.nextElementSibling;
									el?.classList.toggle('show');
								}}>
									View
								</button>
								<div class="details-content">
									<pre>{JSON.stringify(log.details, null, 2)}</pre>
								</div>
							{:else}
								<span class="no-details">—</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="empty">
							<p>No audit logs found</p>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.audit-logs {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.filters {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.filter-input,
	.filter-select {
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		background: var(--surface);
		color: var(--text);
		min-width: 200px;
	}

	.filter-input:focus,
	.filter-select:focus {
		outline: none;
		border-color: var(--primary);
	}

	.logs-table {
		overflow-x: auto;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: var(--surface-hover);
	}

	th {
		text-align: left;
		padding: 12px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--border);
	}

	td {
		padding: 12px;
		border-bottom: 1px solid var(--border);
		font-size: 14px;
	}

	tr:last-child td {
		border-bottom: none;
	}

	.timestamp {
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.user {
		font-weight: 500;
		color: var(--text);
	}

	.action-badge {
		display: inline-block;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 600;
		text-transform: capitalize;
	}

	.resource {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.resource-type {
		font-weight: 500;
		color: var(--text);
		text-transform: capitalize;
	}

	.resource-id {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.details {
		position: relative;
	}

	.details-toggle {
		background: none;
		border: none;
		color: var(--primary);
		cursor: pointer;
		font-size: 13px;
		padding: 0;
	}

	.details-toggle:hover {
		text-decoration: underline;
	}

	.details-content {
		display: none;
		position: absolute;
		top: 100%;
		right: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 12px;
		box-shadow: var(--shadow);
		max-width: 400px;
		z-index: 10;
	}

	.details-content.show {
		display: block;
	}

	.details-content pre {
		margin: 0;
		font-size: 12px;
		color: var(--text);
		white-space: pre-wrap;
		word-break: break-all;
	}

	.no-details {
		color: var(--text-tertiary);
	}

	.empty {
		text-align: center;
		padding: 40px 20px !important;
		color: var(--text-tertiary);
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

	.btn-secondary {
		background: var(--surface-hover);
		color: var(--text);
	}

	.btn-secondary:hover {
		background: var(--border);
	}

	@media (max-width: 768px) {
		.filters {
			flex-direction: column;
		}

		.filter-input,
		.filter-select {
			width: 100%;
		}

		th, td {
			padding: 10px 8px;
			font-size: 13px;
		}
	}
</style>
