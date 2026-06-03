<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface ExtractedOrder {
		customer_name?: string;
		product?: string;
		quantity?: number;
		price?: number;
		address?: string;
		notes?: string;
		confidence: number;
	}

	interface Props {
		open: boolean;
		messageText: string;
	}

	let { open, messageText }: Props = $props();

	const dispatch = createEventDispatcher();

	let extractedOrder = $state<ExtractedOrder | null>(null);
	let isExtracting = $state(false);

	async function extractOrder() {
		isExtracting = true;
		
		// Simulate AI extraction (in production, call AI API)
		await new Promise(resolve => setTimeout(resolve, 1500));

		const text = messageText.toLowerCase();
		const order: ExtractedOrder = {
			confidence: 0.85
		};

		// Extract customer name (look for patterns like "I'm [name]" or "My name is [name]")
		const nameMatch = messageText.match(/(?:i'm|my name is|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
		if (nameMatch) {
			order.customer_name = nameMatch[1];
		}

		// Extract product (look for perfume-related keywords)
		const products = ['perfume', 'cologne', 'fragrance', 'scent', 'bottle'];
		for (const product of products) {
			if (text.includes(product)) {
				order.product = product;
				break;
			}
		}

		// Extract quantity (look for numbers followed by "bottle", "piece", etc.)
		const quantityMatch = text.match(/(\d+)\s*(?:bottle|piece|pcs|bottles|pieces)/);
		if (quantityMatch) {
			order.quantity = parseInt(quantityMatch[1]);
		}

		// Extract price (look for currency patterns)
		const priceMatch = text.match(/[₱$]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
		if (priceMatch) {
			order.price = parseFloat(priceMatch[1].replace(/,/g, ''));
		}

		// Extract address (look for common address indicators)
		const addressMatch = messageText.match(/(?:address|deliver to|ship to)[:\s]+([^.!]+)/i);
		if (addressMatch) {
			order.address = addressMatch[1].trim();
		}

		extractedOrder = order;
		isExtracting = false;
	}

	function createOrder() {
		if (extractedOrder) {
			dispatch('create', extractedOrder);
		}
	}

	function close() {
		extractedOrder = null;
		dispatch('close');
	}

	// Auto-extract when modal opens
	$effect(() => {
		if (open && messageText) {
			extractOrder();
		}
	});
</script>

{#if open}
	<div class="modal-overlay" onclick={close} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h2>Create Order from Message </h2>
				<button class="btn-icon" onclick={close}></button>
			</div>

			<div class="modal-body">
				{#if isExtracting}
					<div class="loading">
						<div class="spinner"></div>
						<p>AI is analyzing the message...</p>
					</div>
				{:else if extractedOrder}
					<div class="confidence-badge" class:high={extractedOrder.confidence > 0.7}>
						<span class="confidence-label">Confidence:</span>
						<span class="confidence-value">{Math.round(extractedOrder.confidence * 100)}%</span>
					</div>

					<div class="extracted-fields">
						<div class="field">
							<label>Customer Name</label>
							<input 
								type="text" 
								bind:value={extractedOrder.customer_name}
								placeholder="Not detected"
							/>
						</div>

						<div class="field">
							<label>Product</label>
							<input 
								type="text" 
								bind:value={extractedOrder.product}
								placeholder="Not detected"
							/>
						</div>

						<div class="field-row">
							<div class="field">
								<label>Quantity</label>
								<input 
									type="number" 
									bind:value={extractedOrder.quantity}
									placeholder="1"
									min="1"
								/>
							</div>

							<div class="field">
								<label>Price (₱)</label>
								<input 
									type="number" 
									bind:value={extractedOrder.price}
									placeholder="0.00"
									min="0"
									step="0.01"
								/>
							</div>
						</div>

						<div class="field">
							<label>Delivery Address</label>
							<textarea 
								bind:value={extractedOrder.address}
								placeholder="Not detected"
								rows="2"
							></textarea>
						</div>

						<div class="field">
							<label>Notes</label>
							<textarea 
								bind:value={extractedOrder.notes}
								placeholder="Additional notes..."
								rows="2"
							></textarea>
						</div>
					</div>

					<div class="original-message">
						<label>Original Message:</label>
						<p>{messageText}</p>
					</div>
				{/if}
			</div>

			{#if !isExtracting && extractedOrder}
				<div class="modal-footer">
					<button class="btn btn-secondary" onclick={close}>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={createOrder}>
						Create Order 
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.modal {
		background: var(--surface);
		border-radius: 12px;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		border-bottom: 1px solid var(--border);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text);
	}

	.modal-body {
		padding: 20px;
		overflow-y: auto;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px;
		border-top: 1px solid var(--border);
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px;
		gap: 16px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.loading p {
		margin: 0;
		color: var(--text-secondary);
	}

	.confidence-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--surface-hover);
		border-radius: 8px;
		margin-bottom: 20px;
	}

	.confidence-badge.high {
		background: var(--success-bg);
	}

	.confidence-label {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.confidence-value {
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
	}

	.confidence-badge.high .confidence-value {
		color: var(--success);
	}

	.extracted-fields {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 20px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.field input,
	.field textarea {
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		background: var(--surface);
		color: var(--text);
	}

	.field input:focus,
	.field textarea:focus {
		outline: none;
		border-color: var(--primary);
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.original-message {
		padding: 12px;
		background: var(--surface-hover);
		border-radius: 8px;
	}

	.original-message label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.original-message p {
		margin: 0;
		font-size: 14px;
		color: var(--text);
		line-height: 1.5;
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

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--primary-hover);
	}

	.btn-secondary {
		background: var(--surface-hover);
		color: var(--text);
	}

	.btn-secondary:hover {
		background: var(--border);
	}

	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px;
		font-size: 20px;
		color: var(--text-secondary);
		border-radius: 4px;
	}

	.btn-icon:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.field-row {
			grid-template-columns: 1fr;
		}
	}
</style>
