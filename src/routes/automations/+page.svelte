<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Automation } from '$lib/types';
	import InlineEdit from '$lib/components/InlineEdit.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let automations = $state<Automation[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newAutomation = $state({ name: '', trigger_type: 'keyword', trigger_value: '' });
	let editingAutomation = $state<Automation | null>(null);

	onMount(async () => {
		await loadAutomations();
	});

	async function loadAutomations() {
		loading = true;
		try {
			automations = await api.automations() as Automation[];
		} catch (err) {
			showToast('Could not load automations. Please try again.', 'error');
		} finally {
			loading = false;
		}
	}

	async function saveAutomation() {
		try {
			if (editingAutomation) {
				await api.updateAutomation(editingAutomation.id, newAutomation);
				showToast('Automation updated.', 'success');
			} else {
				await api.createAutomation(newAutomation);
				showToast('Automation added.', 'success');
			}
			showForm = false;
			editingAutomation = null;
			newAutomation = { name: '', trigger_type: 'keyword', trigger_value: '' };
			await loadAutomations();
		} catch (err) {
			showToast('Could not save automation. Check your fields and try again.', 'error');
		}
	}

	function editAutomation(auto: Automation) {
		editingAutomation = auto;
		newAutomation = { name: auto.name || '', trigger_type: auto.trigger_type || 'keyword', trigger_value: auto.trigger_value || '' };
		showForm = true;
	}

	function openNewAutomation() {
		editingAutomation = null;
		newAutomation = { name: '', trigger_type: 'keyword', trigger_value: '' };
		showForm = true;
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteAutomation() {
		if (!deletingId) return;
		try {
			await api.deleteAutomation(deletingId);
			showToast('Automation deleted.', 'success');
			await loadAutomations();
		} catch (err) {
			showToast('Could not delete. Please try again.', 'error');
		} finally {
			showDeleteConfirm = false;
			deletingId = null;
		}
	}

	async function updateAutomationField(id: number, fields: Partial<Automation>) {
		try {
			await api.updateAutomation(id, fields);
			showToast('Automation updated.', 'success');
			await loadAutomations();
		} catch {
			showToast('Failed to update automation.', 'error');
			throw new Error('Save failed');
		}
	}
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This Automation?"
	message="This automation will be deleted and the bot will no longer auto-reply to this trigger. You can recreate it at any time."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteAutomation}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon" style="color: var(--accent); display: flex; align-items: center;">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
				</svg>
			</span>
			<h1>Automations</h1>
		</div>
		<button class="btn btn-primary" onclick={openNewAutomation}>+ Add Automation</button>
	</header>

	{#if loading}
		<div class="card-list">
			{#each Array(4) as _}
				<div class="card" style="flex-direction: column; gap: 10px;">
					<Skeleton width="40%" height="20px" />
					<div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
						<Skeleton width="100px" height="32px" />
						<Skeleton width="200px" height="32px" />
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="card-list">
			{#each automations as auto}
				<div 
					class="card"
				>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="card-content" onclick={(e) => e.stopPropagation()}>
						<div class="card-label">
							<InlineEdit
								bind:value={auto.name}
								onSave={(val) => updateAutomationField(auto.id, { name: val })}
								placeholder="Automation Name..."
							/>
						</div>
						<div class="card-trigger" style="display:flex; gap: 8px; align-items: baseline; margin-top: 8px;">
							<div style="width: 100px;">
								<InlineEdit
									bind:value={auto.trigger_type}
									type="select"
									options={['keyword', 'postback']}
									onSave={(val) => updateAutomationField(auto.id, { trigger_type: val })}
								/>
							</div>
							<div style="flex: 1;">
								<InlineEdit
									bind:value={auto.trigger_value}
									onSave={(val) => updateAutomationField(auto.id, { trigger_value: val })}
									placeholder="Trigger value..."
								/>
							</div>
						</div>
					</div>
					<div class="card-actions" style="display: flex; gap: 8px; align-items: center;">
						<button class="btn-icon" onclick={(e) => { e.stopPropagation(); editAutomation(auto); }} title="Edit" aria-label="Edit automation">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
						</button>
						<button class="btn-icon danger" onclick={(e) => { e.stopPropagation(); promptDelete(auto.id); }} title="Delete" aria-label="Delete automation">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								<line x1="10" y1="11" x2="10" y2="17"></line>
								<line x1="14" y1="11" x2="14" y2="17"></line>
							</svg>
						</button>
					</div>
				</div>
			{:else}
				<EmptyState
					title="No Automations yet"
					description="Configure custom triggers to automate chat flows, routing patterns, or tags automatically."
					iconType="automation"
					actionText="Create Automation"
					onAction={openNewAutomation}
				/>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showForm = false)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>{editingAutomation ? 'Edit Automation' : 'Add Automation'}</h3>
				<button class="btn-icon" onclick={() => { showForm = false; editingAutomation = null; }} aria-label="Close modal">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form onsubmit={e => { e.preventDefault(); saveAutomation(); }}>
				<div class="form-group">
					<label for="auto-name">Name</label>
					<input id="auto-name" type="text" bind:value={newAutomation.name} placeholder="Welcome message" />
				</div>
				<div class="form-grid">
					<div class="form-group">
						<label for="auto-trigger-type">Trigger Type</label>
						<select id="auto-trigger-type" bind:value={newAutomation.trigger_type}>
							<option value="keyword">Keyword</option>
							<option value="postback">Postback</option>
						</select>
					</div>
					<div class="form-group">
						<label for="auto-trigger-value">Trigger Value</label>
						<input id="auto-trigger-value" type="text" bind:value={newAutomation.trigger_value} placeholder="hello, GET_STARTED" />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => { showForm = false; editingAutomation = null; }}>Cancel</button>
					<button type="submit" class="btn btn-primary">{editingAutomation ? 'Save Changes' : 'Add Automation'}</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page { padding: 32px; max-width: 900px; margin: 0 auto; }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }
	.card-list { display: flex; flex-direction: column; gap: 12px; }
	.card { 
		background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; gap: 16px; 
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
	}
	.card-content { flex: 1; }
	.card-label { font-weight: 600; margin-bottom: 8px; }
	.card-trigger { display: flex; gap: 8px; align-items: center; }
	.empty-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }
	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); }
	.btn-icon {
		display: inline-flex; align-items: center; justify-content: center;
		background: none; border: none; cursor: pointer; padding: 6px;
		color: var(--text-secondary); flex-shrink: 0; border-radius: var(--radius-sm);
		transition: all 0.15s ease;
	}
	.btn-icon:hover { background: var(--surface-hover); color: var(--text); }
	.btn-icon.danger:hover { background: var(--red-bg); color: var(--red); }
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 500px; max-width: 95vw; box-shadow: var(--shadow-lg); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
	.modal-header h3 { font-size: 16px; font-weight: 600; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 20px; }
	.form-group { padding: 12px 20px; }
	.form-grid .form-group { padding: 0; }
	.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; }
	.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg); color: var(--text); }
	.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); }
</style>
