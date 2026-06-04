<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { MediaAsset } from '$lib/types';
	import InlineEdit from '$lib/components/InlineEdit.svelte';

	let media = $state<MediaAsset[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let newMedia = $state({ url: '', filename: '', category: 'general' });

	let dragActive = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state(0);

	function handleDrag(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === 'dragenter' || e.type === 'dragover') {
			dragActive = true;
		} else if (e.type === 'dragleave') {
			dragActive = false;
		}
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = false;
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			await uploadFile(e.dataTransfer.files[0]);
		}
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			await uploadFile(target.files[0]);
		}
	}

	async function uploadFile(file: File) {
		isUploading = true;
		uploadProgress = 10;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const token = localStorage.getItem('pp_token') || '';
			const res = await fetch('/api/admin/upload-blob', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`
				},
				body: formData
			});
			if (!res.ok) {
				const errText = await res.text();
				throw new Error(errText || 'Upload failed');
			}
			const data = await res.json() as { url: string };
			uploadProgress = 70;
			await api.createMedia({
				url: data.url,
				filename: file.name,
				category: 'general'
			});
			uploadProgress = 100;
			showToast('File uploaded successfully.', 'success');
			await loadMedia();
		} catch (err: any) {
			showToast(err.message || 'Upload failed.', 'error');
		} finally {
			isUploading = false;
			uploadProgress = 0;
		}
	}

	onMount(async () => {
		await loadMedia();
	});

	async function loadMedia() {
		loading = true;
		try {
			media = await api.media() as MediaAsset[];
		} catch (err) {
			showToast('Could not load media files. Please try again.', 'error');
		} finally {
			loading = false;
		}
	}

	async function addMedia() {
		try {
			await api.createMedia(newMedia);
			showToast('Media added.', 'success');
			showForm = false;
			newMedia = { url: '', filename: '', category: 'general' };
			await loadMedia();
		} catch (err) {
			showToast('Could not add media. Check your URL and try again.', 'error');
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
			showToast('Media deleted.', 'success');
			await loadMedia();
		} catch (err) {
			showToast('Could not delete. Please try again.', 'error');
		} finally {
			showDeleteConfirm = false;
			deletingId = null;
		}
	}

	async function updateMediaField(id: number, fields: Partial<MediaAsset>) {
		try {
			await api.updateMedia(id, fields);
			showToast('Media updated.', 'success');
			await loadMedia();
		} catch {
			showToast('Failed to update media.', 'error');
			throw new Error('Save failed');
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

	<!-- Drag and drop zone -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="dropzone" 
		class:drag-active={dragActive}
		ondragenter={handleDrag}
		ondragleave={handleDrag}
		ondragover={handleDrag}
		ondrop={handleDrop}
	>
		{#if isUploading}
			<div class="upload-progress-container">
				<div class="spinner"></div>
				<p>Uploading... {uploadProgress}%</p>
				<div class="progress-bar-bg">
					<div class="progress-bar-fill" style="width: {uploadProgress}%"></div>
				</div>
			</div>
		{:else}
			<div class="dropzone-prompt">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="17 8 12 3 7 8"></polyline>
					<line x1="12" y1="3" x2="12" y2="15"></line>
				</svg>
				<p>Drag and drop your images here, or <label class="file-label">browse<input type="file" accept="image/*" onchange={handleFileSelect} style="display:none;" /></label></p>
				<span class="dropzone-sub">Supports JPG, PNG, GIF up to 5MB</span>
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="media-grid">
			{#each media as item}
				<div class="media-card">
					{#if item.url}
						<img src={item.url} alt={item.filename || 'Media'} onerror={e => (e.currentTarget as HTMLImageElement).style.display = 'none'} />
					{:else}
						<div class="media-placeholder">No preview</div>
					{/if}
					<div class="media-info">
						<div class="media-filename">
							<InlineEdit
								bind:value={item.filename}
								onSave={(val) => updateMediaField(item.id, { filename: val })}
								placeholder="Filename..."
							/>
						</div>
						<div class="media-category">
							<InlineEdit
								bind:value={item.category}
								onSave={(val) => updateMediaField(item.id, { category: val })}
								placeholder="Category..."
							/>
						</div>
					</div>
					<button class="media-delete" onclick={() => promptDelete(item.id)} aria-label="Delete media">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
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
	.dropzone {
		border: 2px dashed var(--border);
		border-radius: 8px;
		padding: 32px;
		text-align: center;
		background: var(--surface);
		margin-bottom: 24px;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 140px;
	}
	.dropzone.drag-active {
		border-color: var(--accent);
		background: var(--accent-bg);
	}
	.dropzone-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		color: var(--text-secondary);
	}
	.dropzone-prompt p {
		margin: 0;
		font-size: 14px;
	}
	.file-label {
		color: var(--accent);
		font-weight: 500;
		text-decoration: underline;
		cursor: pointer;
	}
	.dropzone-sub {
		font-size: 11px;
		color: var(--text-tertiary);
	}
	.upload-progress-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
		max-width: 300px;
	}
	.progress-bar-bg {
		width: 100%;
		height: 6px;
		background: var(--border);
		border-radius: 3px;
		overflow: hidden;
	}
	.progress-bar-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 3px;
		transition: width 0.1s ease;
	}
	.spinner {
		width: 24px;
		height: 24px;
		border: 2.5px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
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
