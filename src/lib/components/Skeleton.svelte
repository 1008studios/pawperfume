<script lang="ts">
	interface Props {
		width?: string;
		height?: string;
		borderRadius?: string;
		count?: number;
		circle?: boolean;
	}

	let {
		width = '100%',
		height = '1rem',
		borderRadius = '4px',
		count = 1,
		circle = false
	}: Props = $props();
</script>

{#if circle}
	<div
		class="skeleton skeleton-circle"
		style="width: {width}; height: {width};"
	></div>
{:else}
	{#each Array(count) as _, i}
		<div
			class="skeleton"
			style="width: {width}; height: {height}; border-radius: {borderRadius}; margin-bottom: {i < count - 1 ? '8px' : '0'};"
		></div>
	{/each}
{/if}

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			var(--surface-hover) 25%,
			var(--border) 50%,
			var(--surface-hover) 75%
		);
		background-size: 200% 100%;
		animation: loading 1.5s ease-in-out infinite;
	}

	.skeleton-circle {
		border-radius: 50%;
	}

	@keyframes loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
