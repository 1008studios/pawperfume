<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { sidebarCollapsed, theme, toasts } from '$lib/stores';
	import { clearToken, getTokenValue } from '$lib/api';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import MobileBottomNav from '$lib/components/MobileBottomNav.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';

	let { children } = $props();

	const navItems = [
		{ path: '/dashboard', label: 'Dashboard', section: 'Main', badge: false, svg: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" stroke="currentColor" stroke-width="2" fill="none"/>' },
		{ path: '/chats', label: 'Chats', section: 'Main', badge: true, svg: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2" fill="none"/>' },
		{ path: '/orders', label: 'Orders', section: 'Main', badge: true, svg: '<path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' },
		{ path: '/finance', label: 'Finance', section: 'Main', badge: false, svg: '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>' },
		{ path: '/faqs', label: 'FAQs', section: 'Content', badge: false, svg: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
		{ path: '/quick-replies', label: 'Quick Replies', section: 'Content', badge: false, svg: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>' },
		{ path: '/bot-flow', label: 'Bot Flow', section: 'Content', badge: false, svg: '<rect x="9" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="2" y="16" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="16" y="16" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 6v5M12 11H5v5M12 11h7v5" stroke="currentColor" stroke-width="2" fill="none"/>' },
		{ path: '/automations', label: 'Automations', section: 'Content', badge: false, svg: '<path d="M22 12A10 10 0 0 1 12 22M2 12A10 10 0 0 1 12 2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 5V2M12 22v-3M5 12H2M22 12h-3" stroke="currentColor" stroke-width="2"/>' },
		{ path: '/tags', label: 'Tags', section: 'Content', badge: false, svg: '<path d="M9.5 9.5h.01M19 10l-9.5 9.5a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L11 2h7a2 2 0 0 1 2 2v6z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>' },
		{ path: '/media', label: 'Media', section: 'Content', badge: false, svg: '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>' },
		{ path: '/settings', label: 'Settings', section: 'System', badge: false, svg: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/>' }
	];

	const sections = ['Main', 'Content', 'System'];

	let isAuthed = $state(false);
	let unreadChats = $state(0);
	let pendingOrders = $state(0);
	let mobileSidebarOpen = $state(false);
	let commandPaletteOpen = $state(false);

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onMount(() => {
		const saved = localStorage.getItem('pp_theme') as 'light' | 'dark' | null;
		if (saved) theme.set(saved);
		theme.subscribe(t => {
			document.documentElement.setAttribute('data-theme', t);
			localStorage.setItem('pp_theme', t);
		});

		function handleGlobalKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				commandPaletteOpen = !commandPaletteOpen;
			}
		}

		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});

	$effect(() => {
		if (!getTokenValue() && $page.url.pathname !== '/login') {
			goto('/login');
		} else if (getTokenValue() && $page.url.pathname === '/login') {
			goto('/dashboard');
		} else if (getTokenValue()) {
			isAuthed = true;
		}
	});

	function toggleTheme() {
		theme.update(t => t === 'dark' ? 'light' : 'dark');
	}

	function toggleSidebar() {
		sidebarCollapsed.update(v => !v);
	}

	function toggleMobileSidebar() {
		mobileSidebarOpen = !mobileSidebarOpen;
	}

	function closeMobileSidebar() {
		mobileSidebarOpen = false;
	}

	function handleNavClick() {
		if (window.innerWidth <= 768) {
			closeMobileSidebar();
		}
	}

	function logout() {
		clearToken();
		goto('/login');
	}

	function isActive(path: string): boolean {
		return $page.url.pathname === path;
	}
</script>

{#if $page.url.pathname === '/login'}
	{@render children()}
{:else if isAuthed}
	<div class="layout">
		<button class="mobile-menu-btn" onclick={toggleMobileSidebar} aria-label="Open menu">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
		</button>
 
		{#if mobileSidebarOpen}
			<div class="mobile-backdrop" onclick={closeMobileSidebar} onkeydown={(e) => e.key === 'Escape' && closeMobileSidebar()} role="button" tabindex="-1" aria-label="Close sidebar"></div>
		{/if}

		<aside class="sidebar" class:collapsed={$sidebarCollapsed} class:mobile-open={mobileSidebarOpen}>
			<div class="sidebar-header">
				<div class="brand">
					<div class="brand-logo" style="display: flex; align-items: center; justify-content: center; color: var(--accent);">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="brand-svg-logo">
							<rect x="10" y="2" width="4" height="2" rx="0.8" fill="currentColor"/>
							<rect x="9" y="4" width="6" height="2" rx="0.5" fill="currentColor"/>
							<path d="M5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" stroke="currentColor" stroke-width="1.8" fill="none"/>
							<path d="M6 14.5c1.8-0.5 3.5 0.5 5.5 0s3.7-0.5 5.5 0v3.5c0 1.8-1.2 3-3 3H9c-1.8 0-3-1.2-3-3v-3.5z" fill="var(--accent-bg)" opacity="0.6"/>
							<circle cx="12" cy="14" r="2" fill="currentColor"/>
							<circle cx="9" cy="11.5" r="1.1" fill="currentColor"/>
							<circle cx="11.2" cy="10" r="1.1" fill="currentColor"/>
							<circle cx="12.8" cy="10" r="1.1" fill="currentColor"/>
							<circle cx="15" cy="11.5" r="1.1" fill="currentColor"/>
						</svg>
					</div>
					<span class="brand-text">PawPerfume</span>
				</div>
				<button class="collapse-btn" onclick={toggleSidebar} title="Toggle sidebar">
					{#if $sidebarCollapsed}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					{:else}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12l-4-4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					{/if}
				</button>
			</div>

			<nav class="sidebar-nav">
				{#each sections as section}
					<div class="nav-section">{section}</div>
					{#each navItems.filter(i => i.section === section) as item}
						{#if $sidebarCollapsed}
							<Tooltip content={item.label} position="right" delay={100}>
								<a href={item.path} class="nav-item" class:active={isActive(item.path)} onclick={handleNavClick}>
									<span class="nav-icon">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{@html item.svg}</svg>
									</span>
									<span class="nav-label">{item.label}</span>
									{#if item.badge && item.path === '/chats' && unreadChats > 0}
										<span class="nav-badge">{unreadChats}</span>
									{/if}
									{#if item.badge && item.path === '/orders' && pendingOrders > 0}
										<span class="nav-badge">{pendingOrders}</span>
									{/if}
								</a>
							</Tooltip>
						{:else}
							<a href={item.path} class="nav-item" class:active={isActive(item.path)} onclick={handleNavClick}>
								<span class="nav-icon">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{@html item.svg}</svg>
								</span>
								<span class="nav-label">{item.label}</span>
								{#if item.badge && item.path === '/chats' && unreadChats > 0}
									<span class="nav-badge">{unreadChats}</span>
								{/if}
								{#if item.badge && item.path === '/orders' && pendingOrders > 0}
									<span class="nav-badge">{pendingOrders}</span>
								{/if}
							</a>
						{/if}
					{/each}
				{/each}
			</nav>

			<div class="sidebar-footer">
				{#if $sidebarCollapsed}
					<Tooltip content={$theme === 'dark' ? 'Light Mode' : 'Dark Mode'} position="right" delay={100}>
						<button class="nav-item" onclick={toggleTheme}>
							<span class="nav-icon">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
									{#if $theme === 'dark'}
										<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
									{:else}
										<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
									{/if}
								</svg>
							</span>
							<span class="nav-label">{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
						</button>
					</Tooltip>
					<Tooltip content="Logout" position="right" delay={100}>
						<button class="nav-item" onclick={logout}>
							<span class="nav-icon">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><path d="M21 12H9"/></svg>
							</span>
							<span class="nav-label">Logout</span>
						</button>
					</Tooltip>
				{:else}
					<button class="nav-item" onclick={toggleTheme}>
						<span class="nav-icon">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								{#if $theme === 'dark'}
									<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
								{:else}
									<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
								{/if}
							</svg>
						</span>
						<span class="nav-label">{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
					</button>
					<button class="nav-item" onclick={logout}>
						<span class="nav-icon">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><path d="M21 12H9"/></svg>
						</span>
						<span class="nav-label">Logout</span>
					</button>
				{/if}
			</div>
		</aside>

		<main class="main-content">
			{#key $page.url.pathname}
				<div class="page-transition-wrapper">
					{@render children()}
				</div>
			{/key}
		</main>
		<MobileBottomNav unreadCount={unreadChats} />
	</div>

	<div class="toast-container">
		{#each $toasts as toast}
			<div class="toast toast-{toast.type}">
				<span class="toast-icon">
					{#if toast.type === 'success'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
					{:else if toast.type === 'error'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
					{:else}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
					{/if}
				</span>
				<span class="toast-message">{toast.message}</span>
			</div>
		{/each}
	</div>

	<CommandPalette open={commandPaletteOpen} onClose={() => commandPaletteOpen = false} onToggleTheme={toggleTheme} />
{:else}
	<div class="loading">Loading...</div>
{/if}

<style>
	.layout { display: flex; height: 100vh; overflow: hidden; }

	.sidebar {
		width: var(--sidebar-w); background: var(--surface); border-right: 1px solid var(--border);
		display: flex; flex-direction: column; transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; flex-shrink: 0;
	}
	.sidebar.collapsed { width: 52px; }

	.sidebar-header {
		height: var(--topbar-h); display: flex; align-items: center; justify-content: space-between;
		padding: 0 12px; border-bottom: 1px solid var(--border);
	}

	.brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; overflow: hidden; width: 100%; }
	.brand-logo { display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
	.brand-text {
		white-space: nowrap;
		transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		opacity: 1;
		transform: translateX(0);
	}
	.sidebar.collapsed .brand-text {
		opacity: 0;
		transform: translateX(-10px);
		pointer-events: none;
	}

	.collapse-btn {
		background: none; border: none; color: var(--text-secondary); padding: 4px;
		border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;
		transition: background 0.15s;
	}
	.collapse-btn:hover { background: var(--surface-hover); }

	.sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 6px; }

	.nav-section {
		font-size: 11px; font-weight: 600; color: var(--text-tertiary);
		text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 8px 4px;
		transition: opacity 0.15s ease, height 0.15s ease, padding 0.15s ease;
		opacity: 1;
		height: auto;
		overflow: hidden;
		white-space: nowrap;
	}
	.sidebar.collapsed .nav-section {
		opacity: 0;
		height: 0;
		padding: 0;
		pointer-events: none;
	}

	.nav-item {
		display: flex; align-items: center; gap: 10px; padding: 7px 10px;
		border-radius: var(--radius); color: var(--text-secondary); font-size: 13px;
		transition: all 0.15s; text-decoration: none; margin-bottom: 1px;
		border: none; background: none; cursor: pointer; width: 100%;
		position: relative; text-align: left;
	}
	.nav-item:hover { background: var(--surface-hover); color: var(--text); }
	.nav-item.active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }
	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6px;
		bottom: 6px;
		width: 4px;
		background: var(--accent);
		border-radius: 0 4px 4px 0;
	}

	.nav-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
	.nav-label {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		opacity: 1;
		transform: translateX(0);
	}
	.sidebar.collapsed .nav-label {
		opacity: 0;
		transform: translateX(-10px);
		pointer-events: none;
	}

	.nav-badge {
		background: var(--red); color: white; font-size: 11px; font-weight: 600;
		padding: 1px 6px; border-radius: 10px; min-width: 18px; text-align: center;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.sidebar.collapsed .nav-badge {
		position: absolute;
		top: 4px;
		right: 4px;
		transform: scale(0.8);
		font-size: 9px;
		padding: 1px 4px;
		min-width: 14px;
	}

	.sidebar-footer { border-top: 1px solid var(--border); padding: 6px; }

	.main-content { flex: 1; overflow-y: auto; background: var(--bg); min-width: 0; }

	.loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--text-secondary); }

	.toast-container {
		position: fixed; bottom: 20px; right: 20px; z-index: 9999;
		display: flex; flex-direction: column; gap: 8px;
	}
	.toast {
		display: flex; align-items: center; gap: 8px; padding: 12px 16px;
		background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
		box-shadow: var(--shadow-lg); font-size: 14px; animation: slideIn 0.2s ease; min-width: 280px;
	}
	.toast.success { border-left: 3px solid var(--green); }
	.toast.error { border-left: 3px solid var(--red); }
	.toast.info { border-left: 3px solid var(--blue); }
	.toast-icon { display: flex; align-items: center; }
	.toast.success .toast-icon { color: var(--green); }
	.toast.error .toast-icon { color: var(--red); }
	.toast.info .toast-icon { color: var(--blue); }

	.mobile-menu-btn {
		display: none; position: fixed; top: 12px; left: 12px; z-index: 99;
		background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
		padding: 8px; cursor: pointer; color: var(--text); box-shadow: var(--shadow);
	}
	.mobile-menu-btn:hover { background: var(--surface-hover); }

	.mobile-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }

	@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

	@media (max-width: 768px) {
		.mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
		.mobile-backdrop { display: block; }
		.sidebar {
			position: fixed; z-index: 100; width: 260px; transform: translateX(-100%);
			transition: transform 0.2s ease; height: 100vh;
		}
		.sidebar.mobile-open { transform: translateX(0); }
		.sidebar.collapsed { width: 260px; transform: translateX(-100%); }
		.sidebar.collapsed.mobile-open { transform: translateX(0); }
		.main-content { padding-top: 60px; padding-bottom: 80px; }
		.toast-container { bottom: 90px; right: 12px; left: 12px; }
		.toast { min-width: 0; }
	}
	@keyframes page-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.page-transition-wrapper {
		animation: page-in 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: auto;
	}
</style>
