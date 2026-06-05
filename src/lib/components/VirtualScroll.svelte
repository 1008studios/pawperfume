<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		items: any[];
		itemHeight: number;
		containerHeight: number;
		overscan?: number; // Number of items to render above/below viewport
		children?: Snippet<[{ item: any; index: number }]>;
	}

	let { 
		items, 
		itemHeight, 
		containerHeight,
		overscan = 5,
		children
	}: Props = $props();

	let container: HTMLDivElement;
	let scrollTop = $state(0);

	const totalHeight = $derived(items.length * itemHeight);
	
	const startIndex = $derived(() => {
		const index = Math.floor(scrollTop / itemHeight) - overscan;
		return Math.max(0, index);
	});

	const endIndex = $derived(() => {
		const visibleCount = Math.ceil(containerHeight / itemHeight);
		const index = startIndex() + visibleCount + (overscan * 2);
		return Math.min(items.length, index);
	});

	const visibleItems = $derived(() => {
		return items.slice(startIndex(), endIndex());
	});

	const offsetY = $derived(() => {
		return startIndex() * itemHeight;
	});

	function handleScroll(e: Event) {
		const target = e.target as HTMLDivElement;
		scrollTop = target.scrollTop;
	}

	onMount(() => {
		if (container) {
			container.addEventListener('scroll', handleScroll, { passive: true });
		}
	});

	onDestroy(() => {
		if (container) {
			container.removeEventListener('scroll', handleScroll);
		}
	});
</script>

<div 
	bind:this={container}
	class="virtual-scroll-container"
	style="height: {containerHeight}px; overflow-y: auto;"
>
	<div class="virtual-scroll-content" style="height: {totalHeight}px; position: relative;">
		<div class="virtual-scroll-viewport" style="transform: translateY({offsetY()}px);">
			{#each visibleItems() as item, i (startIndex() + i)}
				<div class="virtual-scroll-item" style="height: {itemHeight}px;">
					{#if children}
						{@render children({ item, index: startIndex() + i })}
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.virtual-scroll-container {
		position: relative;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.virtual-scroll-content {
		position: relative;
	}

	.virtual-scroll-viewport {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		will-change: transform;
	}

	.virtual-scroll-item {
		box-sizing: border-box;
	}

	/* Smooth scrolling on desktop */
	@media (hover: hover) {
		.virtual-scroll-container {
			scroll-behavior: smooth;
		}
	}
</style>
