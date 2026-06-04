<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { QuickReply } from '$lib/types';
	import InlineEdit from '$lib/components/InlineEdit.svelte';

	let quickReplies = $state<QuickReply[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newReply = $state({ label: '', message: '' });
	let editingReply = $state<QuickReply | null>(null);

	onMount(async () => {
		await loadQuickReplies();
	});

	async function loadQuickReplies() {
		loading = true;
		try {
			quickReplies = await api.quickReplies() as QuickReply[];
		} catch (err) {
			showToast('Could not load quick replies. Please try again.', 'error');
		} finally {
			loading = false;
		}
	}

	async function saveReply() {
		try {
			if (editingReply) {
				await api.updateQuickReply(editingReply.id, newReply);
				showToast('Quick reply updated.', 'success');
			} else {
				await api.createQuickReply(newReply);
				showToast('Quick reply added.', 'success');
			}
			showForm = false;
			editingReply = null;
			newReply = { label: '', message: '' };
			await loadQuickReplies();
		} catch (err) {
			showToast('Could not save reply. Check your fields and try again.', 'error');
		}
	}

	function editReply(reply: QuickReply) {
		editingReply = reply;
		newReply = { label: reply.label || '', message: reply.message || '' };
		showForm = true;
	}

	function openNewReply() {
		editingReply = null;
		newReply = { label: '', message: '' };
		showForm = true;
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteReply() {
		if (!deletingId) return;
		try {
			await api.deleteQuickReply(deletingId);
			showToast('Quick reply deleted.', 'success');
			await loadQuickReplies();
		} catch (err) {
			showToast('Could not delete. Please try again.', 'error');
		} finally {
			showDeleteConfirm = false;
			deletingId = null;
		}
	}

	async function updateReplyField(id: number, fields: Partial<QuickReply>) {
		try {
			await api.updateQuickReply(id, fields);
			showToast('Quick reply updated.', 'success');
			await loadQuickReplies();
		} catch {
			showToast('Failed to update quick reply.', 'error');
			throw new Error('Save failed');
		}
	}

	function copyMessage(message: string) {
		navigator.clipboard.writeText(message);
		showToast('Copied to clipboard.', 'success');
	}
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This Quick Reply?"
	message="This quick reply will no longer be available in chats, but you can add it back later if needed."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteReply}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Quick Replies</h1>
		</div>
		<button class="btn btn-primary" onclick={openNewReply}>+ Add Reply</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="card-list">
			{#each quickReplies as reply}
				<div 
					class="card"
				>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="card-content" onclick={(e) => e.stopPropagation()}>
						<div class="card-label">
							<InlineEdit
								bind:value={reply.label}
								onSave={(val) => updateReplyField(reply.id, { label: val })}
								placeholder="Label..."
							/>
						</div>
						<div class="card-message">
							<InlineEdit
								bind:value={reply.message}
								type="textarea"
								onSave={(val) => updateReplyField(reply.id, { message: val })}
								placeholder="Message content..."
							/>
						</div>
					</div>
					<div class="card-actions">
						<button class="btn btn-ghost btn-sm" onclick={(e) => { e.stopPropagation(); copyMessage(reply.message || ''); }} aria-label="Copy quick reply message">Copy</button>
						<button class="btn-icon" onclick={(e) => { e.stopPropagation(); editReply(reply); }} title="Edit" aria-label="Edit quick reply">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
						</button>
						<button class="btn-icon danger" onclick={(e) => { e.stopPropagation(); promptDelete(reply.id); }} title="Delete" aria-label="Delete quick reply">
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
				<div class="empty-state">
					<div class="empty-icon"></div>
					<p>No quick replies yet</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showForm = false)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>{editingReply ? 'Edit Quick Reply' : 'Add Quick Reply'}</h3>
				<button class="btn-icon" onclick={() => { showForm = false; editingReply = null; }} aria-label="Close modal">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form onsubmit={e => { e.preventDefault(); saveReply(); }}>
				<div class="form-group">
					<label>Label</label>
					<input type="text" bind:value={newReply.label} placeholder="Short name" />
				</div>
				<div class="form-group">
					<label>Message</label>
					<textarea bind:value={newReply.message} placeholder="Full message..." rows="4"></textarea>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => { showForm = false; editingReply = null; }}>Cancel</button>
					<button type="submit" class="btn btn-primary">{editingReply ? 'Save Changes' : 'Add Reply'}</button>
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
	.card.clickable-card { cursor: pointer; }
	.card.clickable-card:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: var(--shadow-lg);
	}
	.card.clickable-card:active {
		transform: translateY(0);
	}
	.card-content { flex: 1; }
	.card-label { font-weight: 600; margin-bottom: 8px; }
	.card-message { color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; }
	.card-actions { display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0; }
	.empty-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }
	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); }
	.btn-sm { padding: 4px 12px; font-size: 13px; }
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
	.form-group { padding: 12px 20px; }
	.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; }
	.form-group input, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg); color: var(--text); font-family: var(--font); }
	.form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--accent); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); }
</style>
