<script lang="ts">
	interface TimelineEvent {
		id: string;
		timestamp: string;
		type: 'created' | 'updated' | 'status_change' | 'note' | 'payment' | 'shipped' | 'delivered';
		title: string;
		description?: string;
		user?: string;
		metadata?: Record<string, any>;
	}

	interface Props {
		events: TimelineEvent[];
	}

	let { events }: Props = $props();

	const EVENT_CONFIG = {
		created: { icon: '', color: '#3b82f6' },
		updated: { icon: '', color: '#8b5cf6' },
		status_change: { icon: '', color: '#f59e0b' },
		note: { icon: '', color: '#10b981' },
		payment: { icon: '', color: '#10b981' },
		shipped: { icon: '', color: '#f59e0b' },
		delivered: { icon: '', color: '#10b981' }
	};

	function formatDate(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
		} else if (days === 1) {
			return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
		} else if (days < 7) {
			return `${days} days ago`;
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		}
	}

	function getEventConfig(type: TimelineEvent['type']) {
		return EVENT_CONFIG[type] || { icon: '', color: '#6b7280' };
	}
</script>

<div class="timeline">
	{#each events as event, i (event.id)}
		{@const config = getEventConfig(event.type)}
		<div class="timeline-item">
			<div class="timeline-marker" style="background: {config.color}">
				<span class="marker-icon">{config.icon}</span>
			</div>
			
			{#if i < events.length - 1}
				<div class="timeline-line" style="background: {config.color}30"></div>
			{/if}

			<div class="timeline-content">
				<div class="timeline-header">
					<h4 class="timeline-title">{event.title}</h4>
					<span class="timeline-date">{formatDate(event.timestamp)}</span>
				</div>

				{#if event.description}
					<p class="timeline-description">{event.description}</p>
				{/if}

				{#if event.user}
					<div class="timeline-user">
						<span class="user-avatar">{event.user.charAt(0).toUpperCase()}</span>
						<span class="user-name">{event.user}</span>
					</div>
				{/if}

				{#if event.metadata && Object.keys(event.metadata).length > 0}
					<div class="timeline-metadata">
						{#each Object.entries(event.metadata) as [key, value]}
							<div class="metadata-item">
								<span class="metadata-key">{key}:</span>
								<span class="metadata-value">{value}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="empty-timeline">
			<span class="empty-icon"></span>
			<p>No activity yet</p>
		</div>
	{/each}
</div>

<style>
	.timeline {
		position: relative;
		padding-left: 32px;
	}

	.timeline-item {
		position: relative;
		padding-bottom: 24px;
	}

	.timeline-item:last-child {
		padding-bottom: 0;
	}

	.timeline-marker {
		position: absolute;
		left: -32px;
		top: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		z-index: 1;
	}

	.marker-icon {
		font-size: 16px;
	}

	.timeline-line {
		position: absolute;
		left: -16px;
		top: 32px;
		bottom: 0;
		width: 2px;
	}

	.timeline-content {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px;
		margin-left: 8px;
	}

	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		margin-bottom: 8px;
		gap: 12px;
	}

	.timeline-title {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
		flex: 1;
	}

	.timeline-date {
		font-size: 12px;
		color: var(--text-tertiary);
		white-space: nowrap;
	}

	.timeline-description {
		margin: 8px 0;
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.timeline-user {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
	}

	.user-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--primary);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
	}

	.user-name {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.timeline-metadata {
		margin-top: 12px;
		padding: 12px;
		background: var(--surface-hover);
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.metadata-item {
		display: flex;
		gap: 8px;
		font-size: 13px;
	}

	.metadata-key {
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 80px;
	}

	.metadata-value {
		color: var(--text);
	}

	.empty-timeline {
		text-align: center;
		padding: 40px 20px;
		color: var(--text-tertiary);
	}

	.empty-icon {
		font-size: 48px;
		display: block;
		margin-bottom: 12px;
	}

	.empty-timeline p {
		margin: 0;
		font-size: 14px;
	}
</style>
