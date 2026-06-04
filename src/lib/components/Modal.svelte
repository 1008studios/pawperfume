<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		title?: string;
		size?: 'small' | 'medium' | 'large' | 'fullscreen';
		closable?: boolean;
		closeOnBackdrop?: boolean;
		closeOnEscape?: boolean;
		children?: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	}

	let { 
		open = $bindable(false),
		title = '',
		size = 'medium',
		closable = true,
		closeOnBackdrop = true,
		closeOnEscape = true,
		children,
		footer,
		onclose
	}: Props = $props();

	function close() {
		if (!closable) return;
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (closeOnBackdrop && e.target === e.currentTarget) {
			close();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (closeOnEscape && e.key === 'Escape' && open) {
			close();
		}
	}

	$effect(() => {
		if (typeof window !== 'undefined') {
			if (open) {
				document.body.style.overflow = 'hidden';
				return () => {
					document.body.style.overflow = '';
				};
			} else {
				document.body.style.overflow = '';
			}
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
		<div class="modal modal-{size}" role="dialog" aria-modal="true">
			{#if title || closable}
				<div class="modal-header">
					{#if title}
						<h2 class="modal-title">{title}</h2>
					{/if}
					
					{#if closable}
						<button 
							class="modal-close"
							onclick={close}
							aria-label="Close modal"
						>
							×
						</button>
					{/if}
				</div>
			{/if}

			<div class="modal-body">
				{@render children?.()}
			</div>

			{#if footer}
				<div class="modal-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 10000;
		animation: fadeIn 0.2s ease-out;
	}

	.modal {
		background: var(--surface);
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		max-height: calc(100vh - 40px);
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease-out;
		overflow: hidden;
	}

	.modal-small {
		width: 100%;
		max-width: 400px;
	}

	.modal-medium {
		width: 100%;
		max-width: 600px;
	}

	.modal-large {
		width: 100%;
		max-width: 900px;
	}

	.modal-fullscreen {
		width: calc(100vw - 40px);
		height: calc(100vh - 40px);
		max-width: none;
		max-height: none;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.modal-title {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text);
	}

	.modal-close {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-hover);
		border: none;
		border-radius: 6px;
		color: var(--text-secondary);
		font-size: 24px;
		line-height: 1;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.modal-close:hover {
		background: var(--border);
		color: var(--text);
	}

	.modal-body {
		flex: 1;
		padding: 24px;
		overflow-y: auto;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px 24px;
		border-top: 1px solid var(--border);
		flex-shrink: 0;
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
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 768px) {
		.modal-backdrop {
			padding: 0;
			align-items: flex-end;
		}

		.modal {
			border-radius: 12px 12px 0 0;
			max-height: 90vh;
			animation: slideUpMobile 0.3s ease-out;
		}

		.modal-small,
		.modal-medium,
		.modal-large {
			max-width: none;
		}

		.modal-fullscreen {
			width: 100vw;
			height: 90vh;
			border-radius: 12px 12px 0 0;
		}

		.modal-header {
			padding: 16px 20px;
		}

		.modal-body {
			padding: 20px;
		}

		.modal-footer {
			padding: 16px 20px;
		}
	}

	@keyframes slideUpMobile {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
