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
			{formatDisplay(value)}
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
		padding: 3px 6px;
		border-radius: 4px;
		cursor: pointer;
		min-height: 24px;
		transition: background 0.1s ease;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.view-value:hover {
		background: var(--surface-hover, rgba(0, 0, 0, 0.05));
	}

	.view-value.placeholder {
		color: var(--text-tertiary, #a0aec0);
		font-style: italic;
	}

	.edit-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.edit-input {
		width: 100%;
		padding: 2px 5px;
		font-size: inherit;
		font-family: inherit;
		color: inherit;
		background: var(--bg, #fff);
		border: 1px solid var(--accent, #4d8ef7);
		border-radius: 4px;
		outline: none;
		box-sizing: border-box;
	}

	textarea.edit-input {
		resize: vertical;
		min-height: 50px;
	}

	.select-input {
		padding: 2px 20px 2px 5px;
	}

	.error-tooltip {
		position: absolute;
		bottom: 100%;
		left: 0;
		background: var(--red, #ef4444);
		color: white;
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 4px;
		margin-bottom: 4px;
		z-index: 10;
		box-shadow: var(--shadow-sm);
		white-space: nowrap;
	}
</style>
