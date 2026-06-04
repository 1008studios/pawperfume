<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Tag } from '$lib/types';
	import InlineEdit from '$lib/components/InlineEdit.svelte';

	let tags = $state<Tag[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newTag = $state({ tagKey: '', tagLabel: '', color: '#8b5cf6' });
	let editingTag = $state<Tag | null>(null);

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

	async function saveTag() {
		try {
			if (editingTag) {
				await api.updateTag(editingTag.id, newTag);
				showToast('Tag updated.', 'success');
			} else {
				await api.createTag(newTag);
				showToast('Tag added.', 'success');
			}
			showForm = false;
			editingTag = null;
			newTag = { tagKey: '', tagLabel: '', color: '#8b5cf6' };
			await loadTags();
		} catch (err) {
			showToast('Could not save tag. Check your fields and try again.', 'error');
		}
	}

	function editTag(tag: Tag) {
		editingTag = tag;
		newTag = { tagKey: tag.tag_key || '', tagLabel: tag.tag_label || '', color: tag.color || '#8b5cf6' };
		showForm = true;
	}

	function openNewTag() {
		editingTag = null;
		newTag = { tagKey: '', tagLabel: '', color: '#8b5cf6' };
		showForm = true;
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

	async function updateTagField(id: number, fields: Partial<Tag>) {
		try {
			await api.updateTag(id, fields);
			showToast('Tag updated.', 'success');
			await loadTags();
		} catch {
			showToast('Failed to update tag.', 'error');
			throw new Error('Save failed');
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
		<button class="btn btn-primary" onclick={openNewTag}>+ Add Tag</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="tags-grid">
			{#each tags as tag}
				<div 
					class="tag-card" 
					style="border-color: {tag.color}40"
				>
					<input 
						type="color" 
						value={tag.color} 
						onchange={(e) => updateTagField(tag.id, { color: (e.target as HTMLInputElement).value })} 
						style="width:24px; height:24px; border:none; padding:0; background:none; border-radius:50%; cursor:pointer; flex-shrink:0;" 
						title="Change color"
					/>
					<div class="tag-preview" style="background: {tag.color}20; color: {tag.color}; flex:1; min-width:120px;">
						<InlineEdit
							bind:value={tag.tag_label}
							onSave={(val) => updateTagField(tag.id, { tag_label: val })}
							placeholder={tag.tag_key}
						/>
					</div>
					<div class="tag-actions" style="display: flex; gap: 4px; margin-left: 8px;">
						<button class="btn-icon" onclick={(e) => { e.stopPropagation(); editTag(tag); }} title="Edit" aria-label="Edit tag" style="color: var(--text-secondary);">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
						</button>
						<button class="btn-icon danger" onclick={(e) => { e.stopPropagation(); promptDelete(tag.id); }} title="Delete" aria-label="Delete tag">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
				<h3>{editingTag ? 'Edit Tag' : 'Add Tag'}</h3>
				<button class="btn-icon" onclick={() => { showForm = false; editingTag = null; }} aria-label="Close modal">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form onsubmit={e => { e.preventDefault(); saveTag(); }}>
				<div class="form-grid">
					<div class="form-group">
						<label for="tag-key">Key</label>
						<input id="tag-key" type="text" bind:value={newTag.tagKey} placeholder="vip" required />
					</div>
					<div class="form-group">
						<label for="tag-label">Label</label>
						<input id="tag-label" type="text" bind:value={newTag.tagLabel} placeholder="VIP Customer" />
					</div>
				</div>
				<div class="form-group">
					<label for="tag-color">Color</label>
					<div class="color-picker">
						<input id="tag-color" type="color" bind:value={newTag.color} />
						<span class="color-preview" style="background: {newTag.color}"></span>
						<code>{newTag.color}</code>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => { showForm = false; editingTag = null; }}>Cancel</button>
					<button type="submit" class="btn btn-primary">{editingTag ? 'Save Changes' : 'Add Tag'}</button>
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
	.tag-card { 
		background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; 
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
	}
	.tag-preview { padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600; }
	.empty-state { text-align: center; padding: 64px; color: var(--text-secondary); width: 100%; }
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
