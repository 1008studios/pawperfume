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
		{ path: '/dashboard', label: 'Dashboard', section: 'Main', badge: false, emoji: '🏠' },
		{ path: '/chats', label: 'Chats', section: 'Main', badge: true, emoji: '💬' },
		{ path: '/orders', label: 'Orders', section: 'Main', badge: true, emoji: '📦' },
		{ path: '/finance', label: 'Finance', section: 'Main', badge: false, emoji: '💰' },
		{ path: '/faqs', label: 'FAQs', section: 'Content', badge: false, emoji: '❓' },
		{ path: '/quick-replies', label: 'Quick Replies', section: 'Content', badge: false, emoji: '⚡' },
		{ path: '/bot-flow', label: 'Bot Flow', section: 'Content', badge: false, emoji: '🤖' },
		{ path: '/automations', label: 'Automations', section: 'Content', badge: false, emoji: '⚙️' },
		{ path: '/tags', label: 'Tags', section: 'Content', badge: false, emoji: '🏷️' },
		{ path: '/media', label: 'Media', section: 'Content', badge: false, emoji: '🖼️' },
		{ path: '/settings', label: 'Settings', section: 'System', badge: false, emoji: '🛠️' }
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
						<span class="brand-logo" style="font-size: 18px;">🧴</span>
						<span class="brand-text">PawPerfume</span>
					</div>
				{:else}
					<div class="brand-logo-only" style="font-size: 16px;">🧴</div>
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
							<span class="nav-icon" style="font-size: 16px;">{item.emoji}</span>
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
					<span class="nav-icon" style="font-size: 16px;">{$theme === 'dark' ? '☀️' : '🌙'}</span>
					{#if !$sidebarCollapsed}
						<span class="nav-label">{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
					{/if}
				</button>
				<button class="nav-item" onclick={logout} title="Logout">
					<span class="nav-icon" style="font-size: 16px;">🚪</span>
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
