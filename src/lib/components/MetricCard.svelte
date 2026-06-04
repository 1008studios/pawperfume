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

<div class="metric-card" style="--card-accent-color: {color}">
	<div class="metric-header">
		<span class="metric-icon" style="background: {color}15; color: {color}">
			{#if label === 'Revenue'}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="1" x2="12" y2="23"/>
					<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
				</svg>
			{:else if label === 'Orders'}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
					<line x1="3" y1="6" x2="21" y2="6"/>
					<path d="M16 10a4 4 0 0 1-8 0"/>
				</svg>
			{:else if label === 'Active Chats'}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
				</svg>
			{:else if label === 'Avg Order'}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="2" y="5" width="20" height="14" rx="2" ry="2"/>
					<line x1="2" y1="10" x2="22" y2="10"/>
				</svg>
			{:else if label === 'Net Profit'}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
				</svg>
			{:else if label === 'Conversion'}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"/>
					<circle cx="12" cy="12" r="6"/>
					<circle cx="12" cy="12" r="2"/>
				</svg>
			{:else if icon}
				{icon}
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<circle cx="12" cy="12" r="10"/>
				</svg>
			{/if}
		</span>
		<span class="metric-label">{label}</span>
	</div>
	<div class="metric-value" style="color: {color}">{value}</div>
	{#if change !== undefined}
		<div class="metric-change" class:positive={isPositive} class:negative={!isPositive}>
			{#if isPositive}
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
			{:else}
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
			{/if}
			<span>{Math.abs(change)}%</span>
		</div>
	{/if}
</div>

<style>
	.metric-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
		            border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
		            box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
	}

	.metric-card:hover {
		transform: translateY(-2px);
		border-color: var(--card-accent-color);
		box-shadow: var(--shadow-lg);
	}

	.metric-card::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(80px circle at 90% 20%, var(--card-accent-color) 0%, transparent 100%);
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
		z-index: 1;
	}

	.metric-card:hover::after {
		opacity: 0.08;
	}

	.metric-header {
		display: flex;
		align-items: center;
		gap: 10px;
		z-index: 2;
	}

	.metric-icon {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease;
	}

	.metric-card:hover .metric-icon {
		transform: scale(1.05);
	}

	.metric-label {
		font-size: 11px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.8px;
		font-weight: 600;
	}

	.metric-value {
		font-size: 26px;
		font-weight: 800;
		line-height: 1;
		z-index: 2;
		letter-spacing: -0.5px;
	}

	.metric-change {
		font-size: 11px;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 6px;
		border-radius: 4px;
		align-self: flex-start;
		z-index: 2;
	}

	.metric-change.positive {
		color: var(--green);
		background: var(--green-bg);
	}

	.metric-change.negative {
		color: var(--red);
		background: var(--red-bg);
	}
</style>
