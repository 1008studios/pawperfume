<script lang="ts">
	interface Props {
		data: Array<{ label: string; value: number }>;
		color?: string;
		height?: number;
	}

	let { data, color = 'var(--primary)', height = 200 }: Props = $props();

	let maxValue = $derived(Math.max(...data.map(d => d.value), 1));
</script>

<div class="bar-chart" style="height: {height}px">
	<div class="bars">
		{#each data as item, i}
			<div class="bar-container">
				<div 
					class="bar"
					style="height: {(item.value / maxValue) * 100}%; background: {color}; animation-delay: {i * 50}ms"
					title="{item.label}: {item.value}"
				></div>
				<span class="bar-label">{item.label}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.bar-chart {
		width: 100%;
		padding: 16px 0;
	}

	.bars {
		display: flex;
		align-items: flex-end;
		justify-content: space-around;
		height: 100%;
		gap: 8px;
	}

	.bar-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		justify-content: flex-end;
		gap: 8px;
	}

	.bar {
		width: 100%;
		max-width: 40px;
		border-radius: 4px 4px 0 0;
		transition: height 0.5s ease;
		animation: grow 0.5s ease forwards;
		opacity: 0.8;
	}

	.bar:hover {
		opacity: 1;
	}

	.bar-label {
		font-size: 11px;
		color: var(--text-secondary);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 60px;
	}

	@keyframes grow {
		from {
			height: 0;
		}
	}
</style>
