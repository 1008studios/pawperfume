<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		change?: number;
		icon?: string;
		color?: string;
	}

	let { label, value, change, icon, color = 'var(--primary)' }: Props = $props();

	let isPositive = $derived(change !== undefined && change >= 0);
</script>

<div class="metric-card">
	<div class="metric-header">
		{#if icon}
			<span class="metric-icon" style="background: {color}20; color: {color}">{icon}</span>
		{/if}
		<span class="metric-label">{label}</span>
	</div>
	<div class="metric-value" style="color: {color}">{value}</div>
	{#if change !== undefined}
		<div class="metric-change" class:positive={isPositive} class:negative={!isPositive}>
			{isPositive ? '↑' : '↓'} {Math.abs(change)}%
		</div>
	{/if}
</div>

<style>
	.metric-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition: all 0.2s ease;
	}

	.metric-card:hover {
		border-color: var(--border-strong);
		box-shadow: var(--shadow);
	}

	.metric-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.metric-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
	}

	.metric-label {
		font-size: 13px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 500;
	}

	.metric-value {
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
	}

	.metric-change {
		font-size: 12px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.metric-change.positive {
		color: var(--success);
	}

	.metric-change.negative {
		color: var(--danger);
	}
</style>
