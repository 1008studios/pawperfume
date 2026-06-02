<nav class="bottom-nav" aria-label="Main navigation">
	<a href="/dashboard" class="nav-item" class:active={$page.url.pathname === '/dashboard'} aria-label="Dashboard">
		<span class="nav-icon" aria-hidden="true"></span>
		<span class="nav-label">Dashboard</span>
	</a>
	<a href="/orders" class="nav-item" class:active={$page.url.pathname === '/orders'} aria-label="Orders">
		<span class="nav-icon" aria-hidden="true"></span>
		<span class="nav-label">Orders</span>
	</a>
	<a href="/chats" class="nav-item" class:active={$page.url.pathname === '/chats'} aria-label="Chats">
		<span class="nav-icon" aria-hidden="true"></span>
		<span class="nav-label">Chats</span>
		{#if unreadCount > 0}
			<span class="nav-badge" aria-label="{unreadCount} unread messages">{unreadCount}</span>
		{/if}
	</a>
	<a href="/finance" class="nav-item" class:active={$page.url.pathname === '/finance'} aria-label="Finance">
		<span class="nav-icon" aria-hidden="true"></span>
		<span class="nav-label">Finance</span>
	</a>
	<a href="/settings" class="nav-item" class:active={$page.url.pathname === '/settings'} aria-label="Settings">
		<span class="nav-icon" aria-hidden="true"></span>
		<span class="nav-label">Settings</span>
	</a>
</nav>

<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		unreadCount?: number;
	}

	let { unreadCount = 0 }: Props = $props();
</script>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: none;
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding: 8px 0;
		z-index: 100;
		-webkit-tap-highlight-color: transparent;
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 10px 8px;
		min-height: 56px; /* Better touch target */
		text-decoration: none;
		color: var(--text-secondary);
		position: relative;
		transition: color 0.2s ease;
		touch-action: manipulation;
	}

	.nav-item:active {
		background: var(--surface-hover);
		opacity: 0.8;
	}

	.nav-item.active {
		color: var(--primary);
	}

	.nav-icon {
		font-size: 24px;
		line-height: 1;
	}

	.nav-label {
		font-size: 11px;
		font-weight: 500;
		line-height: 1;
	}

	.nav-badge {
		position: absolute;
		top: 6px;
		right: 50%;
		transform: translateX(16px);
		background: var(--red, #ef4444);
		color: white;
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 10px;
		min-width: 18px;
		text-align: center;
		line-height: 1.2;
	}

	@media (max-width: 768px) {
		.bottom-nav {
			display: flex;
		}
		
		/* Safe area support for notched devices */
		@supports (padding-bottom: env(safe-area-inset-bottom)) {
			.bottom-nav {
				padding-bottom: max(8px, env(safe-area-inset-bottom));
			}
		}
	}
	
	/* Larger phones */
	@media (min-width: 414px) and (max-width: 768px) {
		.nav-label {
			font-size: 12px;
		}
	}
</style>
