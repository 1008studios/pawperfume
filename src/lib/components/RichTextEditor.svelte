<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value?: string;
		placeholder?: string;
		toolbar?: boolean;
	}

	let { 
		value = $bindable(''), 
		placeholder = 'Start typing...',
		toolbar = true
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let editor: HTMLDivElement;

	function execCommand(command: string, value?: string) {
		document.execCommand(command, false, value);
		editor.focus();
		updateValue();
	}

	function updateValue() {
		value = editor.innerHTML;
		dispatch('change', value);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case 'b':
					e.preventDefault();
					execCommand('bold');
					break;
				case 'i':
					e.preventDefault();
					execCommand('italic');
					break;
				case 'u':
					e.preventDefault();
					execCommand('underline');
					break;
			}
		}
	}

	function insertLink() {
		const url = prompt('Enter URL:');
		if (url) {
			execCommand('createLink', url);
		}
	}

	function insertImage() {
		const url = prompt('Enter image URL:');
		if (url) {
			execCommand('insertImage', url);
		}
	}
</script>

<div class="rich-text-editor">
	{#if toolbar}
		<div class="toolbar">
			<div class="toolbar-group">
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('bold')}
					title="Bold (Ctrl+B)"
				>
					<strong>B</strong>
				</button>
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('italic')}
					title="Italic (Ctrl+I)"
				>
					<em>I</em>
				</button>
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('underline')}
					title="Underline (Ctrl+U)"
				>
					<u>U</u>
				</button>
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('strikeThrough')}
					title="Strikethrough"
				>
					<s>S</s>
				</button>
			</div>

			<div class="toolbar-divider"></div>

			<div class="toolbar-group">
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('justifyLeft')}
					title="Align Left"
				>
					≡
				</button>
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('justifyCenter')}
					title="Align Center"
				>
					≡
				</button>
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('justifyRight')}
					title="Align Right"
				>
					≡
				</button>
			</div>

			<div class="toolbar-divider"></div>

			<div class="toolbar-group">
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('insertUnorderedList')}
					title="Bullet List"
				>
					•
				</button>
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('insertOrderedList')}
					title="Numbered List"
				>
					1.
				</button>
			</div>

			<div class="toolbar-divider"></div>

			<div class="toolbar-group">
				<select 
					class="toolbar-select"
					onchange={(e) => execCommand('formatBlock', e.currentTarget.value)}
				>
					<option value="p">Paragraph</option>
					<option value="h1">Heading 1</option>
					<option value="h2">Heading 2</option>
					<option value="h3">Heading 3</option>
					<option value="blockquote">Quote</option>
				</select>
			</div>

			<div class="toolbar-divider"></div>

			<div class="toolbar-group">
				<button 
					class="toolbar-button" 
					onclick={insertLink}
					title="Insert Link"
					aria-label="Insert Link"
				>
					🔗
				</button>
				<button 
					class="toolbar-button" 
					onclick={insertImage}
					title="Insert Image"
					aria-label="Insert Image"
				>
					🖼️
				</button>
			</div>

			<div class="toolbar-divider"></div>

			<div class="toolbar-group">
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('undo')}
					title="Undo"
				>
					↶
				</button>
				<button 
					class="toolbar-button" 
					onclick={() => execCommand('redo')}
					title="Redo"
				>
					↷
				</button>
			</div>
		</div>
	{/if}

	<div
		bind:this={editor}
		class="editor-content"
		contenteditable="true"
		{placeholder}
		oninput={updateValue}
		onkeydown={handleKeydown}
		role="textbox"
		tabindex="0"
		aria-multiline="true"
		aria-label="Rich text editor content"
	></div>
</div>

<style>
	.rich-text-editor {
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
		background: var(--surface);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 8px;
		background: var(--surface-hover);
		border-bottom: 1px solid var(--border);
	}

	.toolbar-group {
		display: flex;
		gap: 2px;
	}

	.toolbar-divider {
		width: 1px;
		background: var(--border);
		margin: 0 4px;
	}

	.toolbar-button {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 4px;
		color: var(--text);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toolbar-button:hover {
		background: var(--surface);
	}

	.toolbar-button:active {
		transform: scale(0.95);
	}

	.toolbar-select {
		padding: 6px 8px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text);
		font-size: 13px;
		cursor: pointer;
	}

	.editor-content {
		min-height: 200px;
		padding: 16px;
		outline: none;
		font-size: 14px;
		line-height: 1.6;
		color: var(--text);
	}

	.editor-content:empty::before {
		content: attr(placeholder);
		color: var(--text-tertiary);
		pointer-events: none;
	}

	.editor-content:focus {
		background: var(--surface-hover);
	}

	.editor-content :global(h1) {
		font-size: 24px;
		font-weight: 700;
		margin: 16px 0 8px;
	}

	.editor-content :global(h2) {
		font-size: 20px;
		font-weight: 600;
		margin: 14px 0 6px;
	}

	.editor-content :global(h3) {
		font-size: 16px;
		font-weight: 600;
		margin: 12px 0 4px;
	}

	.editor-content :global(blockquote) {
		border-left: 3px solid var(--primary);
		padding-left: 16px;
		margin: 12px 0;
		color: var(--text-secondary);
		font-style: italic;
	}

	.editor-content :global(ul),
	.editor-content :global(ol) {
		padding-left: 24px;
		margin: 8px 0;
	}

	.editor-content :global(li) {
		margin: 4px 0;
	}

	.editor-content :global(a) {
		color: var(--primary);
		text-decoration: underline;
	}

	.editor-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
		margin: 8px 0;
	}

	@media (max-width: 768px) {
		.toolbar {
			padding: 6px;
		}

		.toolbar-button {
			width: 28px;
			height: 28px;
			font-size: 12px;
		}

		.editor-content {
			padding: 12px;
			font-size: 13px;
		}
	}
</style>
