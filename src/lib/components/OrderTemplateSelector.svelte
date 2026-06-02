<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface OrderTemplate {
		id: string;
		name: string;
		customer_name: string;
		amount: number;
		status: string;
		payment_status: string;
		custom_fields: Record<string, string>;
		notes: string;
	}

	interface Props {
		open: boolean;
		templates: OrderTemplate[];
	}

	let { open, templates }: Props = $props();

	const dispatch = createEventDispatcher();

	let showCreateForm = $state(false);
	let newTemplate = $state<Partial<OrderTemplate>>({
		name: '',
		customer_name: '',
		amount: 0,
		status: 'new',
		payment_status: 'pending',
		custom_fields: {},
		notes: ''
	});

	function useTemplate(template: OrderTemplate) {
		dispatch('use', template);
	}

	function deleteTemplate(id: string) {
		if (confirm('Delete this template?')) {
			dispatch('delete', id);
		}
	}

	function createTemplate() {
		if (!newTemplate.name?.trim()) {
			alert('Please enter a template name');
			return;
		}

		dispatch('create', newTemplate);
		showCreateForm = false;
		newTemplate = {
			name: '',
			customer_name: '',
			amount: 0,
			status: 'new',
			payment_status: 'pending',
			custom_fields: {},
			notes: ''
		};
	}
</script>

{#if open}
	<div class="modal-overlay" onclick={() => dispatch('close')} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h2>Order Templates</h2>
				<button class="btn-icon" onclick={() => dispatch('close')}></button>
			</div>

			<div class="modal-body">
				{#if !showCreateForm}
					<div class="templates-grid">
						{#each templates as template (template.id)}
							<div class="template-card">
								<div class="template-header">
									<h3>{template.name}</h3>
									<button 
										class="btn-icon danger" 
										onclick={() => deleteTemplate(template.id)}
										aria-label="Delete template"
									>
										
									</button>
								</div>
								<div class="template-preview">
									<p><strong>Customer:</strong> {template.customer_name || '—'}</p>
									<p><strong>Amount:</strong> ₱{template.amount || 0}</p>
									<p><strong>Status:</strong> {template.status}</p>
								</div>
								<button class="btn btn-primary" onclick={() => useTemplate(template)}>
									Use Template
								</button>
							</div>
						{:else}
							<div class="empty-state">
								<p>No templates yet</p>
								<p class="empty-hint">Create templates for common order types to save time!</p>
							</div>
						{/each}
					</div>

					<button class="btn btn-secondary" onclick={() => showCreateForm = true}>
						+ Create New Template
					</button>
				{:else}
					<form class="create-form" onsubmit={(e) => { e.preventDefault(); createTemplate(); }}>
						<div class="form-group">
							<label>Template Name *</label>
							<input 
								type="text" 
								bind:value={newTemplate.name}
								placeholder="e.g., Standard Perfume Order"
								required
							/>
						</div>

						<div class="form-group">
							<label>Default Customer Name</label>
							<input 
								type="text" 
								bind:value={newTemplate.customer_name}
								placeholder="Leave blank to fill later"
							/>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label>Default Amount (₱)</label>
								<input 
									type="number" 
									bind:value={newTemplate.amount}
									placeholder="0"
									min="0"
									step="0.01"
								/>
							</div>

							<div class="form-group">
								<label>Default Status</label>
								<select bind:value={newTemplate.status}>
									<option value="new">New</option>
									<option value="processing">Processing</option>
									<option value="completed">Completed</option>
								</select>
							</div>
						</div>

						<div class="form-group">
							<label>Default Payment Status</label>
							<select bind:value={newTemplate.payment_status}>
								<option value="pending">Pending</option>
								<option value="paid">Paid</option>
								<option value="refunded">Refunded</option>
							</select>
						</div>

						<div class="form-group">
							<label>Default Notes</label>
							<textarea 
								bind:value={newTemplate.notes}
								placeholder="Any default notes for this template"
								rows="3"
							></textarea>
						</div>

						<div class="form-actions">
							<button type="button" class="btn btn-secondary" onclick={() => showCreateForm = false}>
								Cancel
							</button>
							<button type="submit" class="btn btn-primary">
								Create Template
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.modal {
		background: var(--surface);
		border-radius: 12px;
		max-width: 800px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		border-bottom: 1px solid var(--border);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text);
	}

	.modal-body {
		padding: 20px;
		overflow-y: auto;
	}

	.templates-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
		margin-bottom: 20px;
	}

	.template-card {
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.template-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
	}

	.template-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text);
		flex: 1;
	}

	.template-preview {
		flex: 1;
	}

	.template-preview p {
		margin: 4px 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.template-preview strong {
		color: var(--text);
	}

	.empty-state {
		grid-column: 1 / -1;
		text-align: center;
		padding: 40px 20px;
	}

	.empty-state p {
		margin: 8px 0;
		color: var(--text-secondary);
	}

	.empty-hint {
		font-size: 13px;
		color: var(--text-tertiary);
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		background: var(--surface);
		color: var(--text);
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--primary);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 8px;
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
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
		font-size: 16px;
		line-height: 1;
		color: var(--text-secondary);
	}

	.btn-icon:hover {
		color: var(--text);
	}

	.btn-icon.danger:hover {
		color: var(--danger);
	}

	@media (max-width: 768px) {
		.templates-grid {
			grid-template-columns: 1fr;
		}

		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
