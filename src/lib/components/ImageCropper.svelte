<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		src: string;
		aspectRatio?: number;
		minWidth?: number;
		minHeight?: number;
	}

	let { 
		src, 
		aspectRatio = 1,
		minWidth = 100,
		minHeight = 100
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let image: HTMLImageElement;
	let container: HTMLDivElement;

	let cropX = $state(0);
	let cropY = $state(0);
	let cropWidth = $state(200);
	let cropHeight = $state(200);

	let isDragging = $state(false);
	let isResizing = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let initialCropX = $state(0);
	let initialCropY = $state(0);

	let imageWidth = $state(0);
	let imageHeight = $state(0);

	function handleImageLoad() {
		imageWidth = image.naturalWidth;
		imageHeight = image.naturalHeight;
		
		// Initialize crop area to center
		cropWidth = Math.min(200, imageWidth);
		cropHeight = cropWidth / aspectRatio;
		cropX = (imageWidth - cropWidth) / 2;
		cropY = (imageHeight - cropHeight) / 2;
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		initialCropX = cropX;
		initialCropY = cropY;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging && !isResizing) return;

		const deltaX = e.clientX - dragStartX;
		const deltaY = e.clientY - dragStartY;

		if (isDragging) {
			cropX = Math.max(0, Math.min(initialCropX + deltaX, imageWidth - cropWidth));
			cropY = Math.max(0, Math.min(initialCropY + deltaY, imageHeight - cropHeight));
		}
	}

	function handleMouseUp() {
		isDragging = false;
		isResizing = false;
	}

	function handleResizeMouseDown(e: MouseEvent) {
		e.stopPropagation();
		isResizing = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
	}

	function getCroppedImage(): string {
		const canvas = document.createElement('canvas');
		canvas.width = cropWidth;
		canvas.height = cropHeight;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return '';
		
		ctx.drawImage(
			image,
			cropX, cropY, cropWidth, cropHeight,
			0, 0, cropWidth, cropHeight
		);
		
		return canvas.toDataURL('image/png');
	}

	function handleKeyDown(e: KeyboardEvent) {
		const step = e.shiftKey ? 10 : 2;
		if (e.key === 'ArrowLeft') {
			cropX = Math.max(0, cropX - step);
			e.preventDefault();
		} else if (e.key === 'ArrowRight') {
			cropX = Math.min(imageWidth - cropWidth, cropX + step);
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			cropY = Math.max(0, cropY - step);
			e.preventDefault();
		} else if (e.key === 'ArrowDown') {
			cropY = Math.min(imageHeight - cropHeight, cropY + step);
			e.preventDefault();
		}
	}

	function handleResizeKeyDown(e: KeyboardEvent) {
		const step = e.shiftKey ? 10 : 2;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			const newWidth = Math.max(minWidth, cropWidth - step);
			const newHeight = newWidth / aspectRatio;
			if (cropX + newWidth <= imageWidth && cropY + newHeight <= imageHeight) {
				cropWidth = newWidth;
				cropHeight = newHeight;
			}
			e.preventDefault();
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			const newWidth = Math.min(imageWidth - cropX, cropWidth + step);
			const newHeight = newWidth / aspectRatio;
			if (cropY + newHeight <= imageHeight) {
				cropWidth = newWidth;
				cropHeight = newHeight;
			}
			e.preventDefault();
		}
	}

	function applyCrop() {
		const croppedDataUrl = getCroppedImage();
		dispatch('crop', {
			dataUrl: croppedDataUrl,
			x: cropX,
			y: cropY,
			width: cropWidth,
			height: cropHeight
		});
	}

	function resetCrop() {
		cropWidth = Math.min(200, imageWidth);
		cropHeight = cropWidth / aspectRatio;
		cropX = (imageWidth - cropWidth) / 2;
		cropY = (imageHeight - cropHeight) / 2;
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="image-cropper">
	<div class="crop-container" bind:this={container}>
		<img
			bind:this={image}
			{src}
			alt="Crop preview"
			class="crop-image"
			onload={handleImageLoad}
		/>

		<div class="crop-overlay">
			<div class="crop-area-outside crop-top"></div>
			<div class="crop-area-outside crop-bottom"></div>
			<div class="crop-area-outside crop-left"></div>
			<div class="crop-area-outside crop-right"></div>
		</div>

		<div
			class="crop-area"
			style="left: {cropX}px; top: {cropY}px; width: {cropWidth}px; height: {cropHeight}px;"
			onmousedown={handleMouseDown}
			onkeydown={handleKeyDown}
			role="slider"
			aria-label="Crop area position. Use Arrow keys to move."
			aria-valuenow={cropX}
			aria-valuemin="0"
			aria-valuemax={imageWidth - cropWidth}
			tabindex="0"
		>
			<div class="crop-grid"></div>
			<div 
				class="resize-handle" 
				onmousedown={handleResizeMouseDown}
				onkeydown={handleResizeKeyDown}
				role="slider"
				aria-label="Crop size resize handle. Use Arrow keys to scale."
				aria-valuenow={cropWidth}
				aria-valuemin={minWidth}
				aria-valuemax={imageWidth - cropX}
				tabindex="0"
			></div>
		</div>
	</div>

	<div class="crop-controls">
		<button class="control-button" onclick={resetCrop}>
			 Reset
		</button>
		<button class="control-button primary" onclick={applyCrop}>
			 Apply Crop
		</button>
	</div>
</div>

<style>
	.image-cropper {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.crop-container {
		position: relative;
		display: inline-block;
		max-width: 100%;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: #000;
	}

	.crop-image {
		display: block;
		max-width: 100%;
		height: auto;
		user-select: none;
		-webkit-user-drag: none;
	}

	.crop-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.crop-area-outside {
		position: absolute;
		background: rgba(0, 0, 0, 0.5);
	}

	.crop-area {
		position: absolute;
		border: 2px solid white;
		cursor: move;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
	}

	.crop-grid {
		position: absolute;
		inset: 0;
		background-image: 
			linear-gradient(to right, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 1px, transparent 1px);
		background-size: 33.33% 33.33%;
		pointer-events: none;
	}

	.resize-handle {
		position: absolute;
		bottom: -6px;
		right: -6px;
		width: 12px;
		height: 12px;
		background: white;
		border: 2px solid var(--primary);
		border-radius: 2px;
		cursor: nwse-resize;
	}

	.crop-controls {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.control-button {
		padding: 10px 20px;
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.control-button:hover {
		background: var(--border);
	}

	.control-button.primary {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.control-button.primary:hover {
		background: var(--primary-hover);
	}
</style>
