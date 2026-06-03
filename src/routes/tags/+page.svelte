<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Tag } from '$lib/types';

	let tags = $state<Tag[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newTag = $state({ tagKey: '', tagLabel: '', color: '#8b5cf6' });

	onMount(async () => {
		await loadTags();
	});

	async function loadTags() {
		loading = true;
		try {
			tags = await api.tags() as Tag[];
		} catch (err) {
			showToast('Could not load tags. Please try again.', 'error');
		} finally {
			loading = false;
		}
	}

	async function addTag() {
		try {
			await api.createTag(newTag);
			showToast('Tag added.', 'success');
			showForm = false;
			newTag = { tagKey: '', tagLabel: '', color: '#8b5cf6' };
			await loadTags();
		} catch (err) {
			showToast('Could not add tag. Check your fields and try again.', 'error');
		}
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteTag() {
		if (!deletingId) return;
		try {
			await api.deleteTag(deletingId);
			showToast('Tag deleted.', 'success');
			await loadTags();
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
	title="Delete This Tag?"
	message="This tag will be deleted. Any items with this tag will be untagged."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteTag}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Tags</h1>
		</div>
		<button class="btn btn-primary" onclick={() => showForm = true}>+ Add Tag</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="tags-grid">
			{#each tags as tag}
				<div class="tag-card" style="border-color: {tag.color}40">
					<div class="tag-preview" style="background: {tag.color}20; color: {tag.color}">
						 {tag.tag_label || tag.tag_key}
					</div>
					<button class="btn-icon danger" onclick={() => promptDelete(tag.id)}></button>
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-icon"></div>
					<p>No tags yet</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showForm = false)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>Add Tag</h3>
				<button class="btn-icon" onclick={() => showForm = false}></button>
			</div>
			<form onsubmit={e => { e.preventDefault(); addTag(); }}>
				<div class="form-grid">
					<div class="form-group">
						<label>Key</label>
						<input type="text" bind:value={newTag.tagKey} placeholder="vip" required />
					</div>
					<div class="form-group">
						<label>Label</label>
						<input type="text" bind:value={newTag.tagLabel} placeholder="VIP Customer" />
					</div>
				</div>
				<div class="form-group">
					<label>Color</label>
					<div class="color-picker">
						<input type="color" bind:value={newTag.color} />
						<span class="color-preview" style="background: {newTag.color}"></span>
						<code>{newTag.color}</code>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => showForm = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add Tag</button>
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
	.tags-grid { display: flex; flex-wrap: wrap; gap: 12px; }
	.tag-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
	.tag-preview { padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600; }
	.empty-state { text-align: center; padding: 64px; color: var(--text-secondary); width: 100%; }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }
	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); }
	.btn-icon { background: none; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--text-tertiary); }
	.btn-icon:hover { color: var(--text); }
	.btn-icon.danger:hover { color: var(--red); }
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 500px; max-width: 95vw; box-shadow: var(--shadow-lg); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
	.modal-header h3 { font-size: 16px; font-weight: 600; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 20px; }
	.form-group { padding: 0 20px 12px; }
	.form-grid .form-group { padding: 0; }
	.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; }
	.form-group input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg); color: var(--text); }
	.form-group input:focus { outline: none; border-color: var(--accent); }
	.color-picker { display: flex; align-items: center; gap: 12px; }
	.color-picker input[type="color"] { width: 48px; height: 48px; padding: 0; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; }
	.color-preview { width: 32px; height: 32px; border-radius: 6px; }
	.color-picker code { font-family: monospace; color: var(--text-secondary); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); }
</style>
