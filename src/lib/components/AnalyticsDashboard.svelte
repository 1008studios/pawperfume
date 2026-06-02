<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface MetricCard {
		id: string;
		title: string;
		value: string | number;
		change?: number;
		changeLabel?: string;
		icon?: string;
		color?: string;
	}

	interface Props {
		metrics: MetricCard[];
		title?: string;
	}

	let { metrics, title = 'Dashboard' }: Props = $props();

	const dispatch = createEventDispatcher();

	function formatValue(value: string | number): string {
		if (typeof value === 'number') {
			if (value >= 1000000) {
				return (value / 1000000).toFixed(1) + 'M';
			}
			if (value >= 1000) {
				return (value / 1000).toFixed(1) + 'K';
			}
			return value.toLocaleString();
		}
		return value;
	}

	function getChangeColor(change?: number): string {
		if (!change) return 'var(--text-tertiary)';
		return change > 0 ? 'var(--success)' : 'var(--danger)';
	}

	function getChangeIcon(change?: number): string {
		if (!change) return '';
		return change > 0 ? '↑' : '↓';
	}
</script>

<div class="analytics-dashboard">
	<div class="dashboard-header">
		<h1 class="dashboard-title">{title}</h1>
		<div class="dashboard-actions">
			<slot name="actions" />
		</div>
	</div>

	<div class="metrics-grid">
		{#each metrics as metric (metric.id)}
			<div class="metric-card" style="--metric-color: {metric.color || 'var(--primary)'}">
				<div class="metric-header">
					{#if metric.icon}
						<div class="metric-icon">{metric.icon}</div>
					{/if}
					<div class="metric-title">{metric.title}</div>
				</div>

				<div class="metric-value">
					{formatValue(metric.value)}
				</div>

				{#if metric.change !== undefined}
					<div class="metric-change" style="color: {getChangeColor(metric.change)}">
						<span class="change-icon">{getChangeIcon(metric.change)}</span>
						<span class="change-value">{Math.abs(metric.change)}%</span>
						{#if metric.changeLabel}
							<span class="change-label">{metric.changeLabel}</span>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="dashboard-content">
		<slot />
	</div>
</div>

<style>
	.analytics-dashboard {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.dashboard-title {
		margin: 0;
		font-size: 28px;
		font-weight: 700;
		color: var(--text);
	}

	.dashboard-actions {
		display: flex;
		gap: 8px;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
	}

	.metric-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 20px;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.metric-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: var(--metric-color);
	}

	.metric-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.metric-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.metric-icon {
		font-size: 20px;
	}

	.metric-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.metric-value {
		font-size: 32px;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 8px;
		line-height: 1;
	}

	.metric-change {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		font-weight: 600;
	}

	.change-icon {
		font-size: 14px;
	}

	.change-value {
		font-weight: 700;
	}

	.change-label {
		color: var(--text-tertiary);
		font-weight: 400;
		margin-left: 4px;
	}

	.dashboard-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	@media (max-width: 768px) {
		.dashboard-title {
			font-size: 22px;
		}

		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.metric-value {
			font-size: 28px;
		}
	}
</style>
