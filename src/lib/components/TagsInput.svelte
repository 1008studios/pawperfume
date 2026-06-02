<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value?: string[];
		placeholder?: string;
		maxTags?: number;
		allowDuplicates?: boolean;
		suggestions?: string[];
	}

	let { 
		value = $bindable([]), 
		placeholder = 'Add a tag...',
		maxTags = Infinity,
		allowDuplicates = false,
		suggestions = []
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let inputValue = $state('');
	let showSuggestions = $state(false);

	const filteredSuggestions = $derived(() => {
		if (!inputValue) return [];
		const query = inputValue.toLowerCase();
		return suggestions
			.filter(s => s.toLowerCase().includes(query))
			.filter(s => allowDuplicates || !value.includes(s))
			.slice(0, 5);
	});

	function addTag(tag: string) {
		const trimmed = tag.trim();
		if (!trimmed) return;
		
		if (value.length >= maxTags) {
			dispatch('maxReached');
			return;
		}

		if (!allowDuplicates && value.includes(trimmed)) {
			dispatch('duplicate', trimmed);
			return;
		}

		value = [...value, trimmed];
		inputValue = '';
		showSuggestions = false;
		dispatch('add', trimmed);
		dispatch('change', value);
	}

	function removeTag(index: number) {
		const removed = value[index];
		value = value.filter((_, i) => i !== index);
		dispatch('remove', removed);
		dispatch('change', value);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (inputValue) {
				addTag(inputValue);
			}
		} else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
			removeTag(value.length - 1);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
		}
	}

	function handleInput() {
		showSuggestions = filteredSuggestions().length > 0;
	}

	function selectSuggestion(suggestion: string) {
		addTag(suggestion);
	}
</script>

<div class="tags-input">
	<div class="tags-container">
		{#each value as tag, index}
			<span class="tag">
				<span class="tag-text">{tag}</span>
				<button 
					class="tag-remove"
					onclick={() => removeTag(index)}
					aria-label="Remove {tag}"
				>
					×
				</button>
			</span>
		{/each}

		<input
			type="text"
			bind:value={inputValue}
			onkeydown={handleKeydown}
			oninput={handleInput}
			onfocus={() => showSuggestions = filteredSuggestions().length > 0}
			onblur={() => setTimeout(() => showSuggestions = false, 200)}
			{placeholder}
			class="tag-input"
			disabled={value.length >= maxTags}
		/>
	</div>

	{#if showSuggestions}
		<div class="suggestions">
			{#each filteredSuggestions() as suggestion}
				<button
					class="suggestion"
					onmousedown={(e) => { e.preventDefault(); selectSuggestion(suggestion); }}
				>
					{suggestion}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tags-input {
		position: relative;
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 8px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		min-height: 44px;
		align-items: center;
		transition: all 0.2s ease;
	}

	.tags-container:focus-within {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-bg);
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: var(--primary-bg);
		border: 1px solid var(--primary);
		border-radius: 4px;
		font-size: 13px;
		color: var(--primary);
		font-weight: 500;
	}

	.tag-text {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tag-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		background: none;
		border: none;
		color: var(--primary);
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		padding: 0;
		border-radius: 50%;
		transition: all 0.15s ease;
	}

	.tag-remove:hover {
		background: var(--primary);
		color: white;
	}

	.tag-input {
		flex: 1;
		min-width: 120px;
		border: none;
		background: none;
		color: var(--text);
		font-size: 14px;
		outline: none;
		padding: 4px;
	}

	.tag-input:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.tag-input::placeholder {
		color: var(--text-tertiary);
	}

	.suggestions {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-height: 200px;
		overflow-y: auto;
		z-index: 1000;
	}

	.suggestion {
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

	.suggestion:hover {
		background: var(--surface-hover);
	}

	@media (max-width: 768px) {
		.tags-container {
			padding: 6px;
		}

		.tag {
			font-size: 12px;
			padding: 3px 6px;
		}

		.tag-input {
			min-width: 100px;
		}
	}
</style>
