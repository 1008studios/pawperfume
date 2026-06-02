<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { sidebarCollapsed, theme, toasts } from '$lib/stores';
	import { clearToken, getTokenValue } from '$lib/api';
	import CommandPalette from '$lib/components/CommandPalette.svelte';

	let { children } = $props();

	const navItems = [
		{ path: '/dashboard', label: 'Dashboard', section: 'Main', badge: false, svg: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/>' },
		{ path: '/chats', label: 'Chats', section: 'Main', badge: true, svg: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>' },
		{ path: '/orders', label: 'Orders', section: 'Main', badge: true, svg: '<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>' },
		{ path: '/finance', label: 'Finance', section: 'Main', badge: false, svg: '<path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
		{ path: '/faqs', label: 'FAQs', section: 'Content', badge: false, svg: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>' },
		{ path: '/quick-replies', label: 'Quick Replies', section: 'Content', badge: false, svg: '<path d="M13 10V3L4 14h7v7l9-11h-7z"/>' },
		{ path: '/bot-flow', label: 'Bot Flow', section: 'Content', badge: false, svg: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="16" cy="10" r="1"/>' },
		{ path: '/automations', label: 'Automations', section: 'Content', badge: false, svg: '<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>' },
		{ path: '/tags', label: 'Tags', section: 'Content', badge: false, svg: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/>' },
		{ path: '/media', label: 'Media', section: 'Content', badge: false, svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>' },
		{ path: '/settings', label: 'Settings', section: 'System', badge: false, svg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>' }
	];

	const sections = ['Main', 'Content', 'System'];

	let isAuthed = $state(false);
	let unreadChats = $state(0);
	let pendingOrders = $state(0);
	let mobileSidebarOpen = $state(false);
	let commandPaletteOpen = $state(false);

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
				{#if !$sidebarCollapsed}
					<div class="brand">
						<div class="brand-logo">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0114 0v2"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
						</div>
						<span class="brand-text">PawPerfume</span>
					</div>
				{:else}
					<div class="brand-logo-only">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0114 0v2"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
					</div>
				{/if}
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
					{#if !$sidebarCollapsed}
						<div class="nav-section">{section}</div>
					{/if}
					{#each navItems.filter(i => i.section === section) as item}
						<a href={item.path} class="nav-item" class:active={isActive(item.path)} title={item.label} onclick={handleNavClick}>
							<span class="nav-icon">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{@html item.svg}</svg>
							</span>
							{#if !$sidebarCollapsed}
								<span class="nav-label">{item.label}</span>
								{#if item.badge && item.path === '/chats' && unreadChats > 0}
									<span class="nav-badge">{unreadChats}</span>
								{/if}
								{#if item.badge && item.path === '/orders' && pendingOrders > 0}
									<span class="nav-badge">{pendingOrders}</span>
								{/if}
							{/if}
						</a>
					{/each}
				{/each}
			</nav>

			<div class="sidebar-footer">
				<button class="nav-item" onclick={toggleTheme} title="Toggle theme">
					<span class="nav-icon">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
					</span>
					{#if !$sidebarCollapsed}
						<span class="nav-label">{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
					{/if}
				</button>
				<button class="nav-item" onclick={logout} title="Logout">
					<span class="nav-icon">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><path d="M21 12H9"/></svg>
					</span>
					{#if !$sidebarCollapsed}
						<span class="nav-label">Logout</span>
					{/if}
				</button>
			</div>
		</aside>

		<main class="main-content">
			{@render children()}
		</main>
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
		display: flex; flex-direction: column; transition: width 0.2s ease; overflow: hidden; flex-shrink: 0;
	}
	.sidebar.collapsed { width: 52px; }

	.sidebar-header {
		height: var(--topbar-h); display: flex; align-items: center; justify-content: space-between;
		padding: 0 12px; border-bottom: 1px solid var(--border);
	}

	.brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
	.brand-logo { display: flex; align-items: center; justify-content: center; color: var(--accent); }
	.brand-text { white-space: nowrap; }
	.brand-logo-only { display: flex; align-items: center; justify-content: center; width: 100%; color: var(--accent); }

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
	}

	.nav-item {
		display: flex; align-items: center; gap: 10px; padding: 7px 10px;
		border-radius: var(--radius); color: var(--text-secondary); font-size: 13px;
		transition: all 0.15s; text-decoration: none; margin-bottom: 1px;
		border: none; background: none; cursor: pointer; width: 100%;
	}
	.nav-item:hover { background: var(--surface-hover); color: var(--text); }
	.nav-item.active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }

	.nav-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
	.nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.nav-badge {
		background: var(--red); color: white; font-size: 11px; font-weight: 600;
		padding: 1px 6px; border-radius: 10px; min-width: 18px; text-align: center;
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
		.main-content { padding-top: 60px; }
	}
</style>
