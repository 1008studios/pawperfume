<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		accept?: string;
		multiple?: boolean;
		maxSize?: number; // in MB
		maxFiles?: number;
	}

	let { 
		accept = '*', 
		multiple = false, 
		maxSize = 10,
		maxFiles = 10
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let isDragging = $state(false);
	let files = $state<File[]>([]);
	let fileInput: HTMLInputElement;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const droppedFiles = Array.from(e.dataTransfer?.files || []);
		addFiles(droppedFiles);
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const selectedFiles = Array.from(target.files || []);
		addFiles(selectedFiles);
		target.value = ''; // Reset input
	}

	function addFiles(newFiles: File[]) {
		// Validate file size
		const validFiles = newFiles.filter(file => {
			const sizeMB = file.size / (1024 * 1024);
			if (sizeMB > maxSize) {
				dispatch('error', {
					type: 'size',
					file: file.name,
					message: `File "${file.name}" exceeds ${maxSize}MB limit`
				});
				return false;
			}
			return true;
		});

		// Check max files limit
		const totalFiles = [...files, ...validFiles];
		if (totalFiles.length > maxFiles) {
			dispatch('error', {
				type: 'count',
				message: `Maximum ${maxFiles} files allowed`
			});
			validFiles.splice(maxFiles - files.length);
		}

		files = [...files, ...validFiles];
		dispatch('add', { files: validFiles });
	}

	function removeFile(index: number) {
		const removed = files[index];
		files = files.filter((_, i) => i !== index);
		dispatch('remove', { file: removed });
	}

	function clearAll() {
		files = [];
		dispatch('clear');
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function getFileIcon(file: File): string {
		const type = file.type;
		if (type.startsWith('image/')) return '';
		if (type.startsWith('video/')) return '';
		if (type.startsWith('audio/')) return '';
		if (type.includes('pdf')) return '';
		if (type.includes('word') || type.includes('document')) return '';
		if (type.includes('excel') || type.includes('spreadsheet')) return '';
		if (type.includes('zip') || type.includes('archive')) return '';
		return '';
	}

	function openFileDialog() {
		fileInput?.click();
	}
</script>

<div 
	class="file-upload-zone"
	class:dragging={isDragging}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onclick={openFileDialog}
	onkeydown={(e) => e.key === 'Enter' && openFileDialog()}
	role="button"
	tabindex="0"
	aria-label="Upload files"
>
	<input
		bind:this={fileInput}
		type="file"
		{accept}
		{multiple}
		onchange={handleFileSelect}
		class="file-input"
	/>

	<div class="upload-content">
		<div class="upload-icon">
			{#if isDragging}
				<span></span>
			{:else}
				<span></span>
			{/if}
		</div>
		<div class="upload-text">
			{#if isDragging}
				<p class="upload-primary">Drop files here</p>
			{:else}
				<p class="upload-primary">
					Drag & drop files or <span class="upload-link">browse</span>
				</p>
			{/if}
			<p class="upload-hint">
				Max {maxSize}MB per file • Up to {maxFiles} files
			</p>
		</div>
	</div>
</div>

{#if files.length > 0}
	<div class="files-list">
		<div class="files-header">
			<span class="files-count">{files.length} file{files.length > 1 ? 's' : ''}</span>
			<button class="clear-button" onclick={clearAll}>
				Clear All
			</button>
		</div>

		{#each files as file, index}
			<div class="file-item">
				<div class="file-icon">{getFileIcon(file)}</div>
				<div class="file-info">
					<div class="file-name">{file.name}</div>
					<div class="file-size">{formatSize(file.size)}</div>
				</div>
				<button 
					class="file-remove"
					onclick={(e) => { e.stopPropagation(); removeFile(index); }}
					aria-label="Remove {file.name}"
				>
					
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.file-upload-zone {
		border: 2px dashed var(--border);
		border-radius: 12px;
		padding: 40px 20px;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		background: var(--surface);
	}

	.file-upload-zone:hover {
		border-color: var(--primary);
		background: var(--surface-hover);
	}

	.file-upload-zone.dragging {
		border-color: var(--primary);
		background: var(--primary-bg);
		border-style: solid;
	}

	.file-upload-zone:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-bg);
	}

	.file-input {
		display: none;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.upload-icon {
		font-size: 48px;
		transition: transform 0.2s ease;
	}

	.file-upload-zone.dragging .upload-icon {
		transform: scale(1.1);
	}

	.upload-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.upload-primary {
		margin: 0;
		font-size: 16px;
		font-weight: 500;
		color: var(--text);
	}

	.upload-link {
		color: var(--primary);
		text-decoration: underline;
	}

	.upload-hint {
		margin: 0;
		font-size: 13px;
		color: var(--text-tertiary);
	}

	.files-list {
		margin-top: 16px;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.files-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: var(--surface-hover);
		border-bottom: 1px solid var(--border);
	}

	.files-count {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.clear-button {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 13px;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.clear-button:hover {
		background: var(--surface);
		color: var(--text);
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
		transition: background 0.2s ease;
	}

	.file-item:last-child {
		border-bottom: none;
	}

	.file-item:hover {
		background: var(--surface-hover);
	}

	.file-icon {
		font-size: 24px;
		flex-shrink: 0;
	}

	.file-info {
		flex: 1;
		min-width: 0;
	}

	.file-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: 12px;
		color: var(--text-tertiary);
		margin-top: 2px;
	}

	.file-remove {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.file-remove:hover {
		background: var(--danger-bg);
		color: var(--danger);
	}

	@media (max-width: 768px) {
		.file-upload-zone {
			padding: 30px 15px;
		}

		.upload-icon {
			font-size: 36px;
		}

		.upload-primary {
			font-size: 14px;
		}
	}
</style>
