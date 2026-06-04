<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		unreadCount?: number;
	}

	let { unreadCount = 0 }: Props = $props();
</script>

<nav class="bottom-nav" aria-label="Main navigation">
	<a href="/dashboard" class="nav-item" class:active={$page.url.pathname === '/dashboard'} aria-label="Dashboard">
		<span class="nav-icon-wrapper">
			<span class="nav-icon" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
					<polyline points="9 22 9 12 15 12 15 22"></polyline>
				</svg>
			</span>
		</span>
		<span class="nav-label">Dashboard</span>
	</a>
	<a href="/orders" class="nav-item" class:active={$page.url.pathname === '/orders'} aria-label="Orders">
		<span class="nav-icon-wrapper">
			<span class="nav-icon" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
					<line x1="3" y1="6" x2="21" y2="6"></line>
					<path d="M16 10a4 4 0 0 1-8 0"></path>
				</svg>
			</span>
		</span>
		<span class="nav-label">Orders</span>
	</a>
	<a href="/chats" class="nav-item" class:active={$page.url.pathname === '/chats'} aria-label="Chats">
		<span class="nav-icon-wrapper">
			<span class="nav-icon" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
				</svg>
			</span>
		</span>
		<span class="nav-label">Chats</span>
		{#if unreadCount > 0}
			<span class="nav-badge" aria-label="{unreadCount} unread messages">{unreadCount}</span>
		{/if}
	</a>
	<a href="/finance" class="nav-item" class:active={$page.url.pathname === '/finance'} aria-label="Finance">
		<span class="nav-icon-wrapper">
			<span class="nav-icon" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
					<line x1="12" y1="18" x2="12" y2="6"></line>
					<line x1="6" y1="12" x2="18" y2="12"></line>
				</svg>
			</span>
		</span>
		<span class="nav-label">Finance</span>
	</a>
	<a href="/settings" class="nav-item" class:active={$page.url.pathname === '/settings'} aria-label="Settings">
		<span class="nav-icon-wrapper">
			<span class="nav-icon" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="3"></circle>
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
				</svg>
			</span>
		</span>
		<span class="nav-label">Settings</span>
	</a>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: none;
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding: 6px 0;
		z-index: 100;
		-webkit-tap-highlight-color: transparent;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04);
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 6px 4px;
		min-height: 56px;
		text-decoration: none;
		color: var(--text-secondary);
		position: relative;
		transition: color 0.2s ease;
		touch-action: manipulation;
	}

	.nav-item:active {
		opacity: 0.85;
	}

	.nav-icon-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px 16px;
		border-radius: 16px;
		transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
		            transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
		            color 0.2s ease;
	}

	.nav-item.active .nav-icon-wrapper {
		background-color: var(--accent-bg);
		color: var(--accent);
		transform: translateY(-2px);
	}

	.nav-item.active {
		color: var(--text);
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-label {
		font-size: 10px;
		font-weight: 500;
		line-height: 1;
		transition: font-weight 0.2s ease;
	}

	.nav-item.active .nav-label {
		font-weight: 700;
	}

	.nav-badge {
		position: absolute;
		top: 4px;
		right: 50%;
		transform: translateX(20px);
		background: var(--red, #ef4444);
		color: white;
		font-size: 9px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 10px;
		min-width: 18px;
		text-align: center;
		line-height: 1;
		border: 2px solid var(--surface);
		box-shadow: var(--shadow-sm);
	}

	@media (max-width: 768px) {
		.bottom-nav {
			display: flex;
		}
		
		/* Safe area support for notched devices */
		@supports (padding-bottom: env(safe-area-inset-bottom)) {
			.bottom-nav {
				padding-bottom: max(6px, env(safe-area-inset-bottom));
			}
		}
	}
	
	/* Larger phones */
	@media (min-width: 414px) and (max-width: 768px) {
		.nav-label {
			font-size: 11px;
		}
	}
</style>
