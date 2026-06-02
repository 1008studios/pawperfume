<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Step {
		id: string;
		title: string;
		description?: string;
		icon?: string;
		optional?: boolean;
	}

	interface Props {
		steps: Step[];
		currentStep: number;
		completedSteps?: number[];
		orientation?: 'horizontal' | 'vertical';
		clickable?: boolean;
	}

	let { 
		steps, 
		currentStep, 
		completedSteps = [],
		orientation = 'horizontal',
		clickable = true
	}: Props = $props();

	const dispatch = createEventDispatcher();

	function handleStepClick(index: number) {
		if (!clickable) return;
		dispatch('stepClick', index);
	}

	function isCompleted(index: number): boolean {
		return completedSteps.includes(index);
	}

	function isCurrent(index: number): boolean {
		return index === currentStep;
	}

	function isAccessible(index: number): boolean {
		return index <= currentStep || isCompleted(index);
	}
</script>

<div class="stepper" class:vertical={orientation === 'vertical'}>
	{#each steps as step, index}
		<div class="step-container">
			<button
				class="step"
				class:current={isCurrent(index)}
				class:completed={isCompleted(index)}
				class:disabled={!isAccessible(index)}
				disabled={!clickable || !isAccessible(index)}
				onclick={() => handleStepClick(index)}
			>
				<div class="step-indicator">
					{#if isCompleted(index)}
						<span class="step-icon check"></span>
					{:else if step.icon}
						<span class="step-icon">{step.icon}</span>
					{:else}
						<span class="step-number">{index + 1}</span>
					{/if}
				</div>

				<div class="step-content">
					<div class="step-title">
						{step.title}
						{#if step.optional}
							<span class="optional-badge">Optional</span>
						{/if}
					</div>
					{#if step.description}
						<div class="step-description">{step.description}</div>
					{/if}
				</div>
			</button>

			{#if index < steps.length - 1}
				<div class="connector" class:completed={isCompleted(index)}>
					<div class="connector-line"></div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.stepper {
		display: flex;
		gap: 0;
	}

	.stepper.vertical {
		flex-direction: column;
	}

	.step-container {
		display: flex;
		flex: 1;
	}

	.stepper.vertical .step-container {
		flex-direction: column;
	}

	.step {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
		flex: 1;
	}

	.step:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.step:not(:disabled):hover {
		background: var(--surface-hover);
		border-radius: 8px;
	}

	.step-indicator {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--surface-hover);
		border: 2px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.2s ease;
	}

	.step.current .step-indicator {
		background: var(--primary);
		border-color: var(--primary);
		transform: scale(1.1);
	}

	.step.completed .step-indicator {
		background: var(--success);
		border-color: var(--success);
	}

	.step-icon {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.step.current .step-icon,
	.step.completed .step-icon {
		color: white;
	}

	.step-icon.check {
		font-weight: 700;
	}

	.step-number {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.step.current .step-number {
		color: white;
	}

	.step-content {
		flex: 1;
		min-width: 0;
	}

	.step-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 4px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.step.current .step-title {
		color: var(--primary);
	}

	.optional-badge {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-tertiary);
		background: var(--surface-hover);
		padding: 2px 8px;
		border-radius: 12px;
	}

	.step-description {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.connector {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 8px;
	}

	.stepper.vertical .connector {
		padding: 8px 0;
		padding-left: 28px;
	}

	.connector-line {
		height: 2px;
		background: var(--border);
		flex: 1;
		transition: background 0.2s ease;
	}

	.stepper.vertical .connector-line {
		width: 2px;
		height: 100%;
		min-height: 24px;
	}

	.connector.completed .connector-line {
		background: var(--success);
	}

	@media (max-width: 768px) {
		.stepper:not(.vertical) {
			flex-direction: column;
		}

		.stepper:not(.vertical) .step-container {
			flex-direction: column;
		}

		.stepper:not(.vertical) .connector {
			padding: 8px 0;
			padding-left: 28px;
		}

		.stepper:not(.vertical) .connector-line {
			width: 2px;
			height: 100%;
			min-height: 24px;
		}
	}
</style>
