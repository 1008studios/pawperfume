<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { QuickReply } from '$lib/types';

	let quickReplies = $state<QuickReply[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newReply = $state({ label: '', message: '' });

	onMount(async () => {
		await loadQuickReplies();
	});

	async function loadQuickReplies() {
		loading = true;
		try {
			quickReplies = await api.quickReplies() as QuickReply[];
		} catch (err) {
			showToast('Di makuha ang quick replies. Try lang ulit?', 'error');
		} finally {
			loading = false;
		}
	}

	async function addReply() {
		try {
			await api.createQuickReply(newReply);
			showToast('Quick reply added! Ready na sa chats.', 'success');
			showForm = false;
			newReply = { label: '', message: '' };
			await loadQuickReplies();
		} catch (err) {
			showToast('Di ma-add ang reply. Check mo fields?', 'error');
		}
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteReply() {
		if (!deletingId) return;
		try {
			await api.deleteQuickReply(deletingId);
			showToast('Quick reply deleted!', 'success');
			await loadQuickReplies();
		} catch (err) {
			showToast('Di ma-delete. Try ulit?', 'error');
		} finally {
			showDeleteConfirm = false;
			deletingId = null;
		}
	}

	function copyMessage(message: string) {
		navigator.clipboard.writeText(message);
		showToast('Naka-copy na! Paste mo na sa chat.', 'success');
	}
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This Quick Reply?"
	message="Hindi mo na ito ma-gagamit sa chats. Pwede ka mag-add ulit kung kailangan mo."
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
		<button class="btn btn-primary" onclick={() => showForm = true}>+ Add Reply</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="card-list">
			{#each quickReplies as reply}
				<div class="card">
					<div class="card-content">
						<div class="card-label"> {reply.label || '—'}</div>
						<div class="card-message">{reply.message || '—'}</div>
					</div>
					<div class="card-actions">
						<button class="btn btn-ghost btn-sm" onclick={() => copyMessage(reply.message || '')}>Copy</button>
						<button class="btn-icon danger" onclick={() => promptDelete(reply.id)}></button>
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
				<h3>Add Quick Reply</h3>
				<button class="btn-icon" onclick={() => showForm = false}></button>
			</div>
			<form onsubmit={e => { e.preventDefault(); addReply(); }}>
				<div class="form-group">
					<label>Label</label>
					<input type="text" bind:value={newReply.label} placeholder="Short name" />
				</div>
				<div class="form-group">
					<label>Message</label>
					<textarea bind:value={newReply.message} placeholder="Full message..." rows="4"></textarea>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => showForm = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add Reply</button>
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
	.btn-icon { background: none; border: none; cursor: pointer; padding: 4px; font-size: 14px; }
	.btn-icon:hover { background: var(--surface-hover); border-radius: var(--radius-sm); }
	.btn-icon.danger:hover { color: var(--red); }
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
