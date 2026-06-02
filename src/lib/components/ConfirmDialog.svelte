<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'info';
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let { 
		open = $bindable(false), 
		title, 
		message, 
		confirmText = 'Confirm', 
		cancelText = 'Cancel',
		variant = 'warning',
		onConfirm,
		onCancel
	}: Props = $props();

	function handleConfirm() {
		onConfirm?.();
		open = false;
	}

	function handleCancel() {
		onCancel?.();
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="modal-backdrop" onclick={handleCancel}>
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<div class="modal-header">
				<h2>{title}</h2>
			</div>
			<div class="modal-body">
				<p>{message}</p>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={handleCancel}>
					{cancelText}
				</button>
				<button class="btn btn-{variant}" onclick={handleConfirm}>
					{confirmText}
				</button>
			</div>
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
		z-index: 1000;
		animation: fadeIn 0.2s ease;
	}

	.modal {
		background: var(--surface);
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		max-width: 500px;
		width: 90%;
		animation: slideUp 0.3s ease;
	}

	.modal-header {
		padding: 24px 24px 16px;
		border-bottom: 1px solid var(--border);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text);
	}

	.modal-body {
		padding: 24px;
	}

	.modal-body p {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.modal-footer {
		padding: 16px 24px 24px;
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.btn {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-secondary {
		background: var(--surface-hover);
		color: var(--text);
	}

	.btn-secondary:hover {
		background: var(--border);
	}

	.btn-danger {
		background: var(--red);
		color: white;
	}

	.btn-danger:hover {
		filter: brightness(1.1);
	}

	.btn-warning {
		background: var(--orange);
		color: white;
	}

	.btn-warning:hover {
		filter: brightness(1.1);
	}

	.btn-info {
		background: var(--primary);
		color: white;
	}

	.btn-info:hover {
		filter: brightness(1.1);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}
</style>
