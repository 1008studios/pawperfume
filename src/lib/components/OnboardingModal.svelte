<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		open: boolean;
	}

	let { open }: Props = $props();

	const dispatch = createEventDispatcher();

	let currentStep = $state(0);

	const steps = [
		{
			title: 'Welcome to PawPerfume! ',
			description: 'Your all-in-one platform for managing perfume orders, customer conversations, and business analytics.',
			icon: ''
		},
		{
			title: 'Manage Orders with Ease',
			description: 'Create orders in seconds, track them through customizable workflows, and export reports. Use Kanban boards for visual management!',
			icon: ''
		},
		{
			title: 'Chat with Customers',
			description: 'Respond to customer inquiries, manage conversations, and build lasting relationships. Never miss a message again!',
			icon: ''
		},
		{
			title: 'Automate Your Workflow',
			description: 'Set up automations to handle repetitive tasks. Let the bot answer FAQs while you focus on growing your business.',
			icon: ''
		},
		{
			title: 'Track Your Growth',
			description: 'Beautiful analytics dashboard shows your revenue, order trends, and customer insights at a glance.',
			icon: ''
		}
	];

	function nextStep() {
		if (currentStep < steps.length - 1) {
			currentStep++;
		} else {
			complete();
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function complete() {
		localStorage.setItem('onboarding_complete', 'true');
		dispatch('complete');
	}

	function skip() {
		complete();
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			skip();
		}
	}
</script>

{#if open}
	<div class="onboarding-overlay" onclick={handleOverlayClick} role="button" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && skip()} aria-label="Skip onboarding">
		<div class="onboarding-modal" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="onboarding-title">
			<div class="onboarding-content">
				<div class="step-icon">{steps[currentStep].icon}</div>
				<h2 id="onboarding-title" class="step-title">{steps[currentStep].title}</h2>
				<p class="step-description">{steps[currentStep].description}</p>
			</div>

			<div class="onboarding-footer">
				<div class="step-indicators">
					{#each steps as _, i}
						<button 
							class="indicator"
							class:active={i === currentStep}
							class:completed={i < currentStep}
							onclick={() => currentStep = i}
							aria-label="Go to step {i + 1}"
						></button>
					{/each}
				</div>

				<div class="actions">
					{#if currentStep > 0}
						<button class="btn btn-secondary" onclick={prevStep}>
							Back
						</button>
					{/if}
					
					{#if currentStep < steps.length - 1}
						<button class="btn btn-ghost" onclick={skip}>
							Skip
						</button>
						<button class="btn btn-primary" onclick={nextStep}>
							Next
						</button>
					{:else}
						<button class="btn btn-primary" onclick={complete}>
							Get Started 
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.onboarding-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 20px;
		animation: fadeIn 0.3s ease;
	}

	.onboarding-modal {
		background: var(--surface);
		border-radius: 16px;
		max-width: 500px;
		width: 100%;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		animation: slideUp 0.3s ease;
	}

	.onboarding-content {
		padding: 48px 32px;
		text-align: center;
	}

	.step-icon {
		font-size: 64px;
		margin-bottom: 24px;
		animation: bounce 0.6s ease;
	}

	.step-title {
		margin: 0 0 16px 0;
		font-size: 24px;
		font-weight: 700;
		color: var(--text);
	}

	.step-description {
		margin: 0;
		font-size: 16px;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.onboarding-footer {
		padding: 24px 32px;
		background: var(--surface-hover);
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.step-indicators {
		display: flex;
		justify-content: center;
		gap: 8px;
	}

	.indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--border);
		border: none;
		padding: 0;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.indicator.active {
		background: var(--primary);
		width: 24px;
		border-radius: 4px;
	}

	.indicator.completed {
		background: var(--primary);
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: 12px;
	}

	.btn {
		padding: 10px 24px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--primary-hover);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
	}

	.btn-secondary {
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
	}

	.btn-secondary:hover {
		background: var(--border);
	}

	.btn-ghost {
		background: transparent;
		color: var(--text-secondary);
	}

	.btn-ghost:hover {
		color: var(--text);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes bounce {
		0%, 100% {
			transform: translateY(0) scale(1);
		}
		50% {
			transform: translateY(-4px) scale(1.02);
		}
	}

	@media (max-width: 768px) {
		.onboarding-content {
			padding: 32px 24px;
		}

		.step-title {
			font-size: 20px;
		}

		.step-description {
			font-size: 14px;
		}

		.onboarding-footer {
			padding: 20px 24px;
		}

		.actions {
			flex-direction: column-reverse;
		}

		.btn {
			width: 100%;
		}
	}
</style>
