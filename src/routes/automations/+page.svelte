<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Automation } from '$lib/types';

	let automations = $state<Automation[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newAutomation = $state({ name: '', trigger_type: 'keyword', trigger_value: '' });

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

	async function addAutomation() {
		try {
			await api.createAutomation(newAutomation);
			showToast('Automation added.', 'success');
			showForm = false;
			newAutomation = { name: '', trigger_type: 'keyword', trigger_value: '' };
			await loadAutomations();
		} catch (err) {
			showToast('Could not add automation. Check your fields and try again.', 'error');
		}
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
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This Automation?"
	message="Ma-remove ito at hindi na auto-rereply ang bot sa keyword na ito. Pwede mo naman i-recreate anytime."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteAutomation}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Automations</h1>
		</div>
		<button class="btn btn-primary" onclick={() => showForm = true}>+ Add Automation</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="card-list">
			{#each automations as auto}
				<div class="card">
					<div class="card-content">
						<div class="card-label">{auto.name || 'Unnamed'}</div>
						<div class="card-trigger">
							<span class="trigger-type">{auto.trigger_type || 'keyword'}</span>
							<span class="trigger-value">"{auto.trigger_value || '—'}"</span>
						</div>
					</div>
					<button class="btn-icon danger" onclick={() => promptDelete(auto.id)}></button>
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-icon"></div>
					<p>No automations yet</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showForm = false)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>Add Automation</h3>
				<button class="btn-icon" onclick={() => showForm = false}></button>
			</div>
			<form onsubmit={e => { e.preventDefault(); addAutomation(); }}>
				<div class="form-group">
					<label>Name</label>
					<input type="text" bind:value={newAutomation.name} placeholder="Welcome message" />
				</div>
				<div class="form-grid">
					<div class="form-group">
						<label>Trigger Type</label>
						<select bind:value={newAutomation.trigger_type}>
							<option value="keyword">Keyword</option>
							<option value="postback">Postback</option>
						</select>
					</div>
					<div class="form-group">
						<label>Trigger Value</label>
						<input type="text" bind:value={newAutomation.trigger_value} placeholder="hello, GET_STARTED" />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => showForm = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add Automation</button>
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
	.card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; gap: 16px; }
	.card-content { flex: 1; }
	.card-label { font-weight: 600; margin-bottom: 8px; }
	.card-trigger { display: flex; gap: 8px; align-items: center; }
	.trigger-type { background: var(--accent-bg); color: var(--accent); padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
	.trigger-value { color: var(--text-secondary); font-family: monospace; }
	.empty-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }
	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); }
	.btn-icon { background: none; border: none; cursor: pointer; padding: 4px; font-size: 14px; flex-shrink: 0; }
	.btn-icon:hover { background: var(--surface-hover); border-radius: var(--radius-sm); }
	.btn-icon.danger:hover { color: var(--red); }
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
