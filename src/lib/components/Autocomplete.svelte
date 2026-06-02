<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value?: string;
		options?: string[];
		placeholder?: string;
		maxResults?: number;
		debounceMs?: number;
		loadOptions?: (query: string) => Promise<string[]>;
	}

	let { 
		value = $bindable(''), 
		options = [],
		placeholder = 'Search...',
		maxResults = 5,
		debounceMs = 300,
		loadOptions
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let isOpen = $state(false);
	let highlightedIndex = $state(-1);
	let isLoading = $state(false);

	let filteredOptions = $state<string[]>([]);
	let debounceTimeout: ReturnType<typeof setTimeout>;

	async function search(query: string) {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		debounceTimeout = setTimeout(async () => {
			if (loadOptions) {
				isLoading = true;
				try {
					filteredOptions = await loadOptions(query);
				} catch (error) {
					filteredOptions = [];
					dispatch('error', error);
				} finally {
					isLoading = false;
				}
			} else {
				const queryLower = query.toLowerCase();
				filteredOptions = options
					.filter(opt => opt.toLowerCase().includes(queryLower))
					.slice(0, maxResults);
			}

			isOpen = filteredOptions.length > 0;
			highlightedIndex = -1;
		}, debounceMs);
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		dispatch('input', value);
		search(value);
	}

	function selectOption(option: string) {
		value = option;
		isOpen = false;
		dispatch('select', option);
		dispatch('change', value);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (highlightedIndex >= 0) {
					selectOption(filteredOptions[highlightedIndex]);
				}
				break;
			case 'Escape':
				isOpen = false;
				break;
		}
	}

	function handleBlur() {
		setTimeout(() => {
			isOpen = false;
		}, 200);
	}
</script>

<div class="autocomplete">
	<div class="input-wrapper">
		<input
			type="text"
			bind:value
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => value && search(value)}
			onblur={handleBlur}
			{placeholder}
			class="autocomplete-input"
			role="combobox"
			aria-expanded={isOpen}
			aria-autocomplete="list"
		/>

		{#if isLoading}
			<div class="loading-indicator">
				<div class="spinner"></div>
			</div>
		{:else if value}
			<button 
				class="clear-button"
				onclick={() => { value = ''; dispatch('clear'); }}
				aria-label="Clear"
			>
				×
			</button>
		{/if}
	</div>

	{#if isOpen}
		<div class="dropdown" role="listbox">
			{#each filteredOptions as option, index}
				<button
					class="option"
					class:highlighted={index === highlightedIndex}
					onmousedown={(e) => { e.preventDefault(); selectOption(option); }}
					role="option"
					aria-selected={index === highlightedIndex}
				>
					{option}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.autocomplete {
		position: relative;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.autocomplete-input {
		width: 100%;
		padding: 10px 36px 10px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.autocomplete-input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-bg);
	}

	.autocomplete-input::placeholder {
		color: var(--text-tertiary);
	}

	.loading-indicator,
	.clear-button {
		position: absolute;
		right: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.clear-button {
		width: 24px;
		height: 24px;
		background: var(--surface-hover);
		border: none;
		border-radius: 50%;
		color: var(--text-tertiary);
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		transition: all 0.15s ease;
	}

	.clear-button:hover {
		background: var(--border);
		color: var(--text);
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-height: 240px;
		overflow-y: auto;
		z-index: 1000;
	}

	.option {
		display: block;
		width: 100%;
		padding: 10px 12px;
		background: none;
		border: none;
		color: var(--text);
		font-size: 14px;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.option:hover,
	.option.highlighted {
		background: var(--surface-hover);
	}

	.option.highlighted {
		background: var(--primary-bg);
		color: var(--primary);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.autocomplete-input {
			padding: 8px 32px 8px 10px;
			font-size: 13px;
		}

		.option {
			padding: 8px 10px;
			font-size: 13px;
		}
	}
</style>
