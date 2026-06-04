<script lang="ts">
	import { tick } from 'svelte';

	interface Option {
		value: any;
		label: string;
	}

	interface Props {
		value: any;
		type?: 'text' | 'number' | 'textarea' | 'select';
		options?: Option[] | string[];
		placeholder?: string;
		currency?: boolean;
		onSave: (val: any) => Promise<any> | any;
	}

	let {
		value = $bindable(),
		type = 'text',
		options = [],
		placeholder = 'Click to edit...',
		currency = false,
		onSave
	}: Props = $props();

	let isEditing = $state(false);
	let editValue = $state(value);
	let isSaving = $state(false);
	let errorMsg = $state<string | null>(null);
	let inputEl = $state<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

	$effect(() => {
		if (!isEditing) {
			editValue = value;
		}
	});

	async function startEditing() {
		editValue = value;
		isEditing = true;
		errorMsg = null;
		await tick();
		if (inputEl) {
			inputEl.focus();
			if (type !== 'select' && 'select' in inputEl) {
				(inputEl as HTMLInputElement | HTMLTextAreaElement).select();
			}
		}
	}

	async function save() {
		if (isSaving) return;
		if (editValue === value) {
			isEditing = false;
			return;
		}

		isSaving = true;
		errorMsg = null;
		try {
			let parsedVal = editValue;
			if (type === 'number') {
				parsedVal = Number(editValue);
				if (isNaN(parsedVal)) {
					throw new Error('Must be a number');
				}
			}
			await onSave(parsedVal);
			value = parsedVal;
			isEditing = false;
		} catch (err: any) {
			errorMsg = err.message || 'Save failed';
		} finally {
			isSaving = false;
		}
	}

	function cancel() {
		isEditing = false;
		errorMsg = null;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (type !== 'textarea') {
				e.preventDefault();
				save();
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		}
	}

	function formatDisplay(val: any): string {
		if (val === undefined || val === null || val === '') return placeholder;
		if (type === 'select') {
			const found = options.find(opt => typeof opt === 'object' ? opt.value === val : opt === val);
			if (found) {
				return typeof found === 'object' ? found.label : found;
			}
		}
		if (currency) {
			return '₱' + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		}
		return String(val);
	}
</script>

<div class="inline-edit" class:editing={isEditing} class:saving={isSaving} class:has-error={!!errorMsg}>
	{#if isEditing}
		<div class="edit-wrapper">
			{#if type === 'textarea'}
				<textarea
					bind:this={inputEl}
					bind:value={editValue}
					onblur={save}
					onkeydown={handleKeyDown}
					disabled={isSaving}
					class="edit-input"
				></textarea>
			{:else if type === 'select'}
				<select
					bind:this={inputEl}
					bind:value={editValue}
					onblur={save}
					onchange={save}
					onkeydown={handleKeyDown}
					disabled={isSaving}
					class="edit-input select-input"
				>
					{#each options as opt}
						{#if typeof opt === 'object'}
							<option value={opt.value}>{opt.label}</option>
						{:else}
							<option value={opt}>{opt}</option>
						{/if}
					{/each}
				</select>
			{:else if type === 'number'}
				<input
					type="number"
					bind:this={inputEl}
					bind:value={editValue}
					onblur={save}
					onkeydown={handleKeyDown}
					disabled={isSaving}
					step="any"
					class="edit-input"
				/>
			{:else}
				<input
					type="text"
					bind:this={inputEl}
					bind:value={editValue}
					onblur={save}
					onkeydown={handleKeyDown}
					disabled={isSaving}
					class="edit-input"
				/>
			{/if}

			{#if errorMsg}
				<div class="error-tooltip">{errorMsg}</div>
			{/if}
		</div>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="view-value"
			class:placeholder={value === undefined || value === null || value === ''}
			onclick={startEditing}
			title="Click to edit"
		>
			<span class="value-text">{formatDisplay(value)}</span>
			<span class="edit-icon-indicator" aria-hidden="true">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
			</span>
		</div>
	{/if}
</div>

<style>
	.inline-edit {
		display: inline-block;
		width: 100%;
		min-height: 24px;
		vertical-align: middle;
	}

	.view-value {
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		min-height: 24px;
		transition: background 0.15s ease, border-color 0.15s ease;
		white-space: pre-wrap;
		word-break: break-all;
		border: 1px dashed transparent;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.view-value:hover {
		background: var(--surface-hover);
		border-color: var(--border-strong);
	}

	.view-value.placeholder {
		color: var(--text-tertiary);
		font-style: italic;
	}

	.value-text {
		flex: 1;
	}

	.edit-icon-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--text-tertiary);
		opacity: 0;
		transition: opacity 0.2s ease, transform 0.2s ease;
		transform: translateX(-4px);
		flex-shrink: 0;
	}

	.view-value:hover .edit-icon-indicator {
		opacity: 1;
		transform: translateX(0);
	}

	.edit-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.edit-input {
		width: 100%;
		padding: 4px 8px;
		font-size: inherit;
		font-family: inherit;
		color: inherit;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.edit-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-bg);
	}

	textarea.edit-input {
		resize: vertical;
		min-height: 50px;
	}

	.select-input {
		padding: 4px 24px 4px 8px;
	}

	.error-tooltip {
		position: absolute;
		bottom: 100%;
		left: 0;
		background: var(--red);
		color: white;
		font-size: 11px;
		padding: 3px 8px;
		border-radius: 4px;
		margin-bottom: 4px;
		z-index: 10;
		box-shadow: var(--shadow-sm);
		white-space: nowrap;
	}
</style>
