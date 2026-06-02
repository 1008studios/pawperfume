<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value?: string;
		presets?: string[];
		showInput?: boolean;
	}

	let { 
		value = $bindable('#3b82f6'), 
		presets = [
			'#ef4444', '#f97316', '#f59e0b', '#eab308',
			'#84cc16', '#22c55e', '#10b981', '#14b8a6',
			'#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
			'#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
			'#f43f5e', '#000000', '#6b7280', '#ffffff'
		],
		showInput = true
	}: Props = $props();

	const dispatch = createEventDispatcher();

	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		dispatch('change', value);
	}

	function selectPreset(color: string) {
		value = color;
		dispatch('change', value);
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(value);
		dispatch('copy', value);
	}

	function getContrastColor(hex: string): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}
</script>

<div class="color-picker">
	<div class="color-preview-section">
		<div 
			class="color-preview"
			style="background: {value}; color: {getContrastColor(value)}"
		>
			<span class="color-value">{value.toUpperCase()}</span>
		</div>
		
		{#if showInput}
			<div class="color-input-group">
				<input
					type="color"
					{value}
					oninput={handleColorChange}
					class="color-input"
				/>
				<input
					type="text"
					bind:value
					oninput={handleColorChange}
					class="color-text-input"
					placeholder="#000000"
					pattern="^#[0-9A-Fa-f]{6}$"
				/>
				<button 
					class="copy-button"
					onclick={copyToClipboard}
					title="Copy to clipboard"
				>
					
				</button>
			</div>
		{/if}
	</div>

	{#if presets.length > 0}
		<div class="presets-section">
			<div class="presets-label">Presets</div>
			<div class="presets-grid">
				{#each presets as color}
					<button
						class="preset"
						class:selected={value === color}
						style="background: {color}"
						onclick={() => selectPreset(color)}
						title={color}
					>
						{#if value === color}
							<span class="check" style="color: {getContrastColor(color)}"></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.color-picker {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		max-width: 320px;
	}

	.color-preview-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.color-preview {
		width: 100%;
		height: 80px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border);
		transition: all 0.2s ease;
	}

	.color-value {
		font-size: 16px;
		font-weight: 700;
		font-family: monospace;
		text-transform: uppercase;
	}

	.color-input-group {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.color-input {
		width: 48px;
		height: 48px;
		border: 1px solid var(--border);
		border-radius: 8px;
		cursor: pointer;
		padding: 4px;
		background: var(--surface);
	}

	.color-input::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.color-input::-webkit-color-swatch {
		border: none;
		border-radius: 4px;
	}

	.color-text-input {
		flex: 1;
		padding: 10px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		font-family: monospace;
		text-transform: uppercase;
	}

	.color-text-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.copy-button {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		font-size: 18px;
		transition: all 0.15s ease;
	}

	.copy-button:hover {
		background: var(--border);
	}

	.presets-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.presets-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.presets-grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 6px;
	}

	.preset {
		aspect-ratio: 1;
		border: 2px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.preset:hover {
		transform: scale(1.1);
		border-color: var(--text);
	}

	.preset.selected {
		border-color: var(--text);
		transform: scale(1.1);
	}

	.check {
		font-size: 14px;
		font-weight: 700;
	}

	@media (max-width: 768px) {
		.presets-grid {
			grid-template-columns: repeat(8, 1fr);
		}
	}
</style>
