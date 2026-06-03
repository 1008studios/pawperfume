<script lang="ts">
	interface MetricCard {
		label: string;
		value: string | number;
		change?: number;
		icon: string;
		color: string;
	}

	interface Props {
		totalConversations: number;
		totalMessages: number;
		avgResponseTime: number;
		resolutionRate: number;
		escalationRate: number;
		customerSatisfaction: number;
		topQuestions: Array<{ question: string; count: number }>;
		botPerformance: Array<{ flow: string; completions: number; dropoffs: number }>;
	}

	let {
		totalConversations,
		totalMessages,
		avgResponseTime,
		resolutionRate,
		escalationRate,
		customerSatisfaction,
		topQuestions,
		botPerformance
	}: Props = $props();

	const metrics: MetricCard[] = [
		{
			label: 'Total Conversations',
			value: totalConversations,
			icon: '',
			color: '#3b82f6'
		},
		{
			label: 'Messages Exchanged',
			value: totalMessages,
			icon: '',
			color: '#10b981'
		},
		{
			label: 'Avg Response Time',
			value: `${avgResponseTime.toFixed(1)}s`,
			icon: '',
			color: '#f59e0b'
		},
		{
			label: 'Resolution Rate',
			value: `${resolutionRate.toFixed(1)}%`,
			icon: '',
			color: '#10b981'
		},
		{
			label: 'Escalation Rate',
			value: `${escalationRate.toFixed(1)}%`,
			icon: '',
			color: '#ef4444'
		},
		{
			label: 'Customer Satisfaction',
			value: `${customerSatisfaction.toFixed(1)}/5`,
			icon: '',
			color: '#f59e0b'
		}
	];
</script>

<div class="bot-analytics">
	<div class="metrics-grid">
		{#each metrics as metric}
			<div class="metric-card">
				<div class="metric-icon" style="background: {metric.color}20">
					<span>{metric.icon}</span>
				</div>
				<div class="metric-info">
					<div class="metric-value">{metric.value}</div>
					<div class="metric-label">{metric.label}</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="analytics-sections">
		<div class="section">
			<h3>Top Customer Questions</h3>
			<div class="questions-list">
				{#each topQuestions as item, i}
					<div class="question-item">
						<span class="question-rank">#{i + 1}</span>
						<span class="question-text">{item.question}</span>
						<span class="question-count">{item.count}x</span>
					</div>
				{:else}
					<p class="empty">No questions yet</p>
				{/each}
			</div>
		</div>

		<div class="section">
			<h3>Bot Flow Performance</h3>
			<div class="flows-list">
				{#each botPerformance as flow}
					{@const total = flow.completions + flow.dropoffs}
					{@const rate = total > 0 ? (flow.completions / total) * 100 : 0}
					<div class="flow-item">
						<div class="flow-header">
							<span class="flow-name">{flow.flow}</span>
							<div class="flow-stats">
								<span class="flow-stat success"> {flow.completions}</span>
								<span class="flow-stat danger"> {flow.dropoffs}</span>
							</div>
						</div>
						<div class="flow-bar">
							<div class="flow-bar-fill" style="width: {rate}%"></div>
						</div>
						<div class="flow-rate">{rate.toFixed(1)}% completion</div>
					</div>
				{:else}
					<p class="empty">No bot flows configured</p>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.bot-analytics {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}

	.metric-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.metric-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		flex-shrink: 0;
	}

	.metric-info {
		flex: 1;
		min-width: 0;
	}

	.metric-value {
		font-size: 24px;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 4px;
	}

	.metric-label {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.analytics-sections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 24px;
	}

	.section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 20px;
	}

	.section h3 {
		margin: 0 0 16px 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text);
	}

	.questions-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.question-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: var(--surface-hover);
		border-radius: 8px;
	}

	.question-rank {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 24px;
	}

	.question-text {
		flex: 1;
		font-size: 14px;
		color: var(--text);
	}

	.question-count {
		font-size: 13px;
		font-weight: 600;
		color: var(--primary);
	}

	.flows-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.flow-item {
		padding: 12px;
		background: var(--surface-hover);
		border-radius: 8px;
	}

	.flow-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.flow-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.flow-stats {
		display: flex;
		gap: 12px;
	}

	.flow-stat {
		font-size: 13px;
		font-weight: 600;
	}

	.flow-stat.success {
		color: var(--success);
	}

	.flow-stat.danger {
		color: var(--danger);
	}

	.flow-bar {
		height: 8px;
		background: var(--border);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 6px;
	}

	.flow-bar-fill {
		height: 100%;
		background: var(--success);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.flow-rate {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.empty {
		text-align: center;
		padding: 20px;
		color: var(--text-tertiary);
		font-size: 14px;
	}

	@media (max-width: 768px) {
		.analytics-sections {
			grid-template-columns: 1fr;
		}

		.metrics-grid {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		}
	}
</style>
