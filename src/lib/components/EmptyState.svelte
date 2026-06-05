<script lang="ts">
	interface Props {
		title: string;
		description: string;
		actionText?: string;
		iconType?: 'order' | 'chat' | 'finance' | 'faq' | 'automation' | 'media' | 'tag' | 'reply' | 'default';
		onAction?: () => void;
	}

	let {
		title,
		description,
		actionText = '',
		iconType = 'default',
		onAction = () => {}
	}: Props = $props();
</script>

<div class="empty-state-container animate-fade-in">
	<div class="illustration-wrapper">
		<div class="blob-bg"></div>
		<div class="icon-pulse">
			{#if iconType === 'order'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
					<line x1="3" y1="6" x2="21" y2="6"/>
					<path d="M16 10a4 4 0 0 1-8 0"/>
				</svg>
			{:else if iconType === 'chat'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
				</svg>
			{:else if iconType === 'finance'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="1" x2="12" y2="23"/>
					<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
				</svg>
			{:else if iconType === 'faq'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"/>
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
					<line x1="12" y1="17" x2="12.01" y2="17"/>
				</svg>
			{:else if iconType === 'automation'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
					<polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
					<line x1="12" y1="22.08" x2="12" y2="12"/>
				</svg>
			{:else if iconType === 'media'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
					<circle cx="8.5" cy="8.5" r="1.5"/>
					<polyline points="21 15 16 10 5 21"/>
				</svg>
			{:else if iconType === 'tag'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
					<line x1="7" y1="7" x2="7.01" y2="7"/>
				</svg>
			{:else if iconType === 'reply'}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 17H7A5 5 0 0 1 7 7h2m6 10h2a5 5 0 0 0 0-10h-2"/>
					<line x1="8" y1="12" x2="16" y2="12"/>
				</svg>
			{:else}
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"/>
					<line x1="12" y1="8" x2="12" y2="12"/>
					<line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
			{/if}
		</div>
	</div>
	
	<h3 class="empty-title">{title}</h3>
	<p class="empty-description">{description}</p>
	
	{#if actionText}
		<button class="btn btn-primary action-btn" onclick={onAction}>
			<span>{actionText}</span>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="5" y1="12" x2="19" y2="12"/>
				<polyline points="12 5 19 12 12 19"/>
			</svg>
		</button>
	{/if}
</div>

<style>
	.empty-state-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		text-align: center;
		max-width: 440px;
		margin: 0 auto;
	}

	.illustration-wrapper {
		position: relative;
		width: 100px;
		height: 100px;
		margin-bottom: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.blob-bg {
		position: absolute;
		width: 80px;
		height: 80px;
		background: var(--accent-bg);
		border-radius: 40% 60% 70% 30% / 40% 50% 65% 55%;
		animation: morph 8s ease-in-out infinite;
		opacity: 0.8;
	}

	.icon-pulse {
		position: relative;
		z-index: 2;
		color: var(--accent);
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		animation: float 4s ease-in-out infinite;
	}

	.empty-state-container:hover .icon-pulse {
		transform: scale(1.1) rotate(4deg);
	}

	.empty-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
		margin: 0 0 8px 0;
		letter-spacing: -0.2px;
	}

	.empty-description {
		font-size: 13px;
		color: var(--text-secondary);
		margin: 0 0 24px 0;
		line-height: 1.5;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		font-size: 13px;
		font-weight: 600;
		box-shadow: 0 4px 12px var(--accent-bg);
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px var(--accent-bg);
	}

	@keyframes morph {
		0% {
			border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
		}
		50% {
			border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%;
		}
		100% {
			border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
		}
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}
</style>
