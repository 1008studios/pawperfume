<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { MediaAsset } from '$lib/types';

	let media = $state<MediaAsset[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newMedia = $state({ url: '', filename: '', category: 'general' });

	onMount(async () => {
		await loadMedia();
	});

	async function loadMedia() {
		loading = true;
		try {
			media = await api.media() as MediaAsset[];
		} catch (err) {
			showToast('Di makuha ang media files. Try lang ulit?', 'error');
		} finally {
			loading = false;
		}
	}

	async function addMedia() {
		try {
			await api.createMedia(newMedia);
			showToast('Media added! Ready na gamitin.', 'success');
			showForm = false;
			newMedia = { url: '', filename: '', category: 'general' };
			await loadMedia();
		} catch (err) {
			showToast('Di ma-add ang media. Check mo URL?', 'error');
		}
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteMedia() {
		if (!deletingId) return;
		try {
			await api.deleteMedia(deletingId);
			showToast('Media deleted!', 'success');
			await loadMedia();
		} catch (err) {
			showToast('Di ma-delete. Try ulit?', 'error');
		} finally {
			showDeleteConfirm = false;
			deletingId = null;
		}
	}
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This Media?"
	message="Ma-remove ito sa media library mo. Hindi na ito ma-undo."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteMedia}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Media</h1>
		</div>
		<button class="btn btn-primary" onclick={() => showForm = true}>+ Add Media</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="media-grid">
			{#each media as item}
				<div class="media-card">
					{#if item.url}
						<img src={item.url} alt={item.filename || 'Media'} onerror={e => e.currentTarget.style.display = 'none'} />
					{:else}
						<div class="media-placeholder">No preview</div>
					{/if}
					<div class="media-info">
						<div class="media-filename">{item.filename || 'Untitled'}</div>
						<div class="media-category">{item.category || 'general'}</div>
					</div>
					<button class="media-delete" onclick={() => promptDelete(item.id)}></button>
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-icon"></div>
					<p>No media yet</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showForm = false)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>Add Media</h3>
				<button class="btn-icon" onclick={() => showForm = false}></button>
			</div>
			<form onsubmit={e => { e.preventDefault(); addMedia(); }}>
				<div class="form-group">
					<label>URL</label>
					<input type="url" bind:value={newMedia.url} placeholder="https://..." required />
				</div>
				<div class="form-grid">
					<div class="form-group">
						<label>Filename</label>
						<input type="text" bind:value={newMedia.filename} placeholder="product-photo.jpg" />
					</div>
					<div class="form-group">
						<label>Category</label>
						<input type="text" bind:value={newMedia.category} placeholder="products, receipts" />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => showForm = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add Media</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page { padding: 32px; max-width: 1200px; margin: 0 auto; }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }
	.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
	.media-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; position: relative; }
	.media-card img { width: 100%; height: 160px; object-fit: cover; display: block; }
	.media-placeholder { width: 100%; height: 160px; background: var(--surface-hover); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); }
	.media-info { padding: 12px; }
	.media-filename { font-size: 13px; font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.media-category { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
	.media-delete { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
	.media-card:hover .media-delete { opacity: 1; }
	.media-delete:hover { background: var(--red); }
	.empty-state { text-align: center; padding: 64px; color: var(--text-secondary); grid-column: 1 / -1; }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }
	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); }
	.btn-icon { background: none; border: none; cursor: pointer; padding: 4px; font-size: 14px; }
	.btn-icon:hover { background: var(--surface-hover); border-radius: var(--radius-sm); }
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
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); }
</style>
