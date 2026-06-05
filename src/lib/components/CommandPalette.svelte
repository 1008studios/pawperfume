<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { clearToken } from '$lib/api';

	interface Command {
		id: string;
		label: string;
		icon?: string;
		shortcut?: string;
		handler: () => void;
		category?: string;
	}

	interface Props {
		open: boolean;
		commands?: Command[];
		placeholder?: string;
		onClose?: () => void;
		onToggleTheme?: () => void;
	}

	let { 
		open, 
		commands, 
		placeholder = 'Type a command or search...',
		onClose,
		onToggleTheme
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let searchQuery = $state('');
	let selectedIndex = $state(0);

	const activeCommands = $derived(() => {
		if (commands) return commands;
		return [
			{ id: 'dash', label: 'Go to Dashboard', icon: '🏠', category: 'Navigation', handler: () => goto('/dashboard') },
			{ id: 'chats', label: 'Go to Chats', icon: '💬', category: 'Navigation', handler: () => goto('/chats') },
			{ id: 'orders', label: 'Go to Orders', icon: '📦', category: 'Navigation', handler: () => goto('/orders') },
			{ id: 'finance', label: 'Go to Finance', icon: '💰', category: 'Navigation', handler: () => goto('/finance') },
			{ id: 'faqs', label: 'Go to FAQs', icon: '❓', category: 'Navigation', handler: () => goto('/faqs') },
			{ id: 'quick', label: 'Go to Quick Replies', icon: '⚡', category: 'Navigation', handler: () => goto('/quick-replies') },
			{ id: 'bot', label: 'Go to Bot Flow', icon: '🤖', category: 'Navigation', handler: () => goto('/bot-flow') },
			{ id: 'auto', label: 'Go to Automations', icon: '⚙️', category: 'Navigation', handler: () => goto('/automations') },
			{ id: 'tags', label: 'Go to Tags', icon: '🏷️', category: 'Navigation', handler: () => goto('/tags') },
			{ id: 'media', label: 'Go to Media', icon: '🖼️', category: 'Navigation', handler: () => goto('/media') },
			{ id: 'settings', label: 'Go to Settings', icon: '🛠️', category: 'Navigation', handler: () => goto('/settings') },
			{ id: 'theme', label: 'Toggle Light/Dark Theme', icon: '🌓', category: 'System', handler: () => { if (onToggleTheme) onToggleTheme(); } },
			{ id: 'logout', label: 'Log Out', icon: '🚪', category: 'System', handler: () => { clearToken(); goto('/login'); } }
		];
	});

	const filteredCommands = $derived(() => {
		const cmdList = activeCommands();
		if (!searchQuery) return cmdList;
		
		const query = searchQuery.toLowerCase();
		return cmdList.filter(cmd => 
			cmd.label.toLowerCase().includes(query) ||
			cmd.category?.toLowerCase().includes(query)
		);
	});

	function handleKeydown(e: KeyboardEvent) {
		const filtered = filteredCommands();
		
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
				e.preventDefault();
				if (filtered[selectedIndex]) {
					executeCommand(filtered[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				close();
				break;
		}
	}

	function executeCommand(command: Command) {
		command.handler();
		close();
	}

	function close() {
		searchQuery = '';
		selectedIndex = 0;
		if (onClose) {
			onClose();
		} else {
			dispatch('close');
		}
	}

	let inputEl = $state<HTMLInputElement | null>(null);

	// Reset selection when search changes
	$effect(() => {
		if (searchQuery) {
			selectedIndex = 0;
		}
	});

	$effect(() => {
		if (open) {
			setTimeout(() => {
				inputEl?.focus();
			}, 50);
		}
	});

	// Group commands by category
	const groupedCommands = $derived(() => {
		const groups: Record<string, Command[]> = {};
		filteredCommands().forEach(cmd => {
			const category = cmd.category || 'General';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(cmd);
		});
		return groups;
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="command-palette-overlay" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()} role="button" tabindex="-1" aria-label="Close command palette">
		<div class="command-palette" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-modal="true" aria-label="Command palette">
			<div class="command-palette-header">
				<input
					type="text"
					bind:this={inputEl}
					bind:value={searchQuery}
					onkeydown={handleKeydown}
					{placeholder}
					class="command-palette-input"
				/>
				<kbd class="kbd">ESC</kbd>
			</div>

			<div class="command-palette-body">
				{#if filteredCommands().length === 0}
					<div class="no-results">
						<span class="no-results-icon"></span>
						<p>No commands found</p>
					</div>
				{:else}
					{#each Object.entries(groupedCommands()) as [category, cmds]}
						<div class="command-group">
							<div class="command-group-title">{category}</div>
							{#each cmds as command, i}
								{@const globalIndex = filteredCommands().findIndex(c => c.id === command.id)}
								<button
									class="command-item"
									class:selected={globalIndex === selectedIndex}
									onclick={() => executeCommand(command)}
									onmouseenter={() => selectedIndex = globalIndex}
								>
									{#if command.icon}
										<span class="command-icon">{command.icon}</span>
									{/if}
									<span class="command-label">{command.label}</span>
									{#if command.shortcut}
										<kbd class="command-shortcut">{command.shortcut}</kbd>
									{/if}
								</button>
							{/each}
						</div>
					{/each}
				{/if}
			</div>

			<div class="command-palette-footer">
				<div class="footer-hint">
					<span><kbd class="kbd">↑↓</kbd> Navigate</span>
					<span><kbd class="kbd">↵</kbd> Select</span>
					<span><kbd class="kbd">ESC</kbd> Close</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.command-palette-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
		z-index: 10000;
		animation: fadeIn 0.15s ease-out;
	}

	.command-palette {
		background: var(--surface);
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 600px;
		max-height: 500px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: scaleIn 0.15s ease-out;
	}

	.command-palette-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px;
		border-bottom: 1px solid var(--border);
	}

	.command-palette-input {
		flex: 1;
		background: none;
		border: none;
		font-size: 16px;
		color: var(--text);
		outline: none;
	}

	.command-palette-input::placeholder {
		color: var(--text-tertiary);
	}

	.command-palette-body {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.command-group {
		margin-bottom: 16px;
	}

	.command-group:last-child {
		margin-bottom: 0;
	}

	.command-group-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 8px 12px 4px;
	}

	.command-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 10px 12px;
		background: none;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.15s ease;
		text-align: left;
	}

	.command-item:hover,
	.command-item.selected {
		background: var(--surface-hover);
	}

	.command-icon {
		font-size: 18px;
		flex-shrink: 0;
	}

	.command-label {
		flex: 1;
		font-size: 14px;
		color: var(--text);
	}

	.command-shortcut {
		flex-shrink: 0;
	}

	.command-palette-footer {
		padding: 12px 16px;
		border-top: 1px solid var(--border);
		background: var(--surface-hover);
	}

	.footer-hint {
		display: flex;
		gap: 16px;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
		color: var(--text-tertiary);
	}

	.no-results-icon {
		font-size: 48px;
		margin-bottom: 12px;
		opacity: 0.5;
	}

	.no-results p {
		margin: 0;
		font-size: 14px;
	}

	.kbd {
		display: inline-block;
		padding: 2px 6px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: monospace;
		font-size: 11px;
		color: var(--text-secondary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scaleIn {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		.command-palette-overlay {
			padding: 16px;
			padding-top: 5vh;
			align-items: flex-start;
		}

		.command-palette {
			max-height: 85vh;
			max-height: 85dvh;
			border-radius: 12px;
			width: 100%;
		}

		.command-palette-header {
			padding: 12px 16px;
		}

		.command-palette-input {
			font-size: 16px; /* Prevent iOS zoom */
		}

		.command-palette-body {
			padding: 8px;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
		}

		.command-item {
			padding: 14px 16px;
			min-height: 48px;
		}

		.command-icon {
			font-size: 20px;
		}

		.command-label {
			font-size: 15px;
		}

		.footer-hint {
			flex-wrap: wrap;
			gap: 8px;
			font-size: 11px;
		}

		.kbd {
			padding: 4px 8px;
			font-size: 12px;
		}

		/* Hide keyboard shortcuts on mobile (not relevant) */
		.command-shortcut {
			display: none;
		}

		.no-results {
			padding: 48px 24px;
		}

		.no-results-icon {
			font-size: 56px;
		}

		/* Safe area support */
		@supports (padding-bottom: env(safe-area-inset-bottom)) {
			.command-palette-overlay {
				padding-bottom: calc(16px + env(safe-area-inset-bottom));
			}
		}
	}

	/* Very small screens */
	@media (max-width: 360px) {
		.command-palette-overlay {
			padding: 8px;
			padding-top: 2vh;
		}

		.command-palette {
			max-height: 90vh;
			max-height: 90dvh;
			border-radius: 8px;
		}

		.command-group-title {
			padding: 12px 12px 8px;
			font-size: 11px;
		}

		.command-item {
			padding: 12px;
		}
	}
</style>
