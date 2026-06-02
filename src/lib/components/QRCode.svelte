<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value: string;
		size?: number;
		errorCorrection?: 'L' | 'M' | 'Q' | 'H';
		downloadable?: boolean;
	}

	let { 
		value, 
		size = 200,
		errorCorrection = 'M',
		downloadable = true
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let canvas: HTMLCanvasElement;

	// Simple QR code generation (simplified version)
	// In production, use a library like 'qrcode'
	const qrData = $derived(() => {
		return generateQRMatrix(value, errorCorrection);
	});

	function generateQRMatrix(text: string, ecLevel: string): boolean[][] {
		// This is a simplified placeholder
		// In production, use a proper QR code library
		const size = 21; // Minimum QR code size
		const matrix: boolean[][] = [];
		
		for (let i = 0; i < size; i++) {
			matrix[i] = [];
			for (let j = 0; j < size; j++) {
				// Simple pattern based on text hash
				matrix[i][j] = (i + j + text.charCodeAt((i * size + j) % text.length || 0)) % 2 === 0;
			}
		}
		
		// Add finder patterns
		addFinderPattern(matrix, 0, 0);
		addFinderPattern(matrix, size - 7, 0);
		addFinderPattern(matrix, 0, size - 7);
		
		return matrix;
	}

	function addFinderPattern(matrix: boolean[][], x: number, y: number) {
		for (let i = 0; i < 7; i++) {
			for (let j = 0; j < 7; j++) {
				if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
					matrix[y + i][x + j] = true;
				} else {
					matrix[y + i][x + j] = false;
				}
			}
		}
	}

	function downloadQR() {
		if (!canvas) return;
		
		const link = document.createElement('a');
		link.download = `qr-code-${Date.now()}.png`;
		link.href = canvas.toDataURL('image/png');
		link.click();
		
		dispatch('download');
	}
</script>

<div class="qr-code">
	<canvas
		bind:this={canvas}
		width={size}
		height={size}
		class="qr-canvas"
	></canvas>

	{#if downloadable}
		<button class="download-button" onclick={downloadQR}>
			 Download QR Code
		</button>
	{/if}
</div>

<style>
	.qr-code {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.qr-canvas {
		border: 1px solid var(--border);
		border-radius: 8px;
		background: white;
	}

	.download-button {
		padding: 10px 20px;
		background: var(--primary);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.download-button:hover {
		background: var(--primary-hover);
	}

	.download-button:active {
		transform: scale(0.98);
	}
</style>
