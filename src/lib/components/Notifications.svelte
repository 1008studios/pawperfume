<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { writable } from 'svelte/store';

	interface Notification {
		id: string;
		type: 'success' | 'error' | 'warning' | 'info';
		title: string;
		message?: string;
		duration?: number;
		action?: {
			label: string;
			handler: () => void;
		};
	}

	const notifications = writable<Notification[]>([]);

	export function notify(notification: Omit<Notification, 'id'>): string {
		const id = Math.random().toString(36).substring(7);
		const newNotification: Notification = { ...notification, id };

		notifications.update(n => [...n, newNotification]);

		// Auto-remove after duration
		const duration = notification.duration || 5000;
		setTimeout(() => {
			dismiss(id);
		}, duration);

		return id;
	}

	export function dismiss(id: string): void {
		notifications.update(n => n.filter(notification => notification.id !== id));
	}

	export function success(title: string, message?: string): string {
		return notify({ type: 'success', title, message });
	}

	export function error(title: string, message?: string): string {
		return notify({ type: 'error', title, message, duration: 8000 });
	}

	export function warning(title: string, message?: string): string {
		return notify({ type: 'warning', title, message });
	}

	export function info(title: string, message?: string): string {
		return notify({ type: 'info', title, message });
	}
</script>

<div class="notifications-container">
	{#each $notifications as notification (notification.id)}
		<div 
			class="notification notification-{notification.type}"
			role="alert"
			aria-live="polite"
		>
			<div class="notification-icon">
				{#if notification.type === 'success'}
					<span></span>
				{:else if notification.type === 'error'}
					<span></span>
				{:else if notification.type === 'warning'}
					<span></span>
				{:else}
					<span>ℹ</span>
				{/if}
			</div>

			<div class="notification-content">
				<div class="notification-title">{notification.title}</div>
				{#if notification.message}
					<div class="notification-message">{notification.message}</div>
				{/if}
				{#if notification.action}
					<button 
						class="notification-action"
						onclick={notification.action.handler}
					>
						{notification.action.label}
					</button>
				{/if}
			</div>

			<button 
				class="notification-close"
				onclick={() => dismiss(notification.id)}
				aria-label="Close notification"
			>
				
			</button>
		</div>
	{/each}
</div>

<style>
	.notifications-container {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 10000;
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 400px;
		pointer-events: none;
	}

	.notification {
		display: flex;
		gap: 12px;
		padding: 16px;
		background: var(--surface);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-left: 4px solid;
		pointer-events: auto;
		animation: slideIn 0.3s ease-out;
	}

	.notification-success {
		border-left-color: var(--success);
	}

	.notification-error {
		border-left-color: var(--danger);
	}

	.notification-warning {
		border-left-color: var(--warning);
	}

	.notification-info {
		border-left-color: var(--primary);
	}

	.notification-icon {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-weight: bold;
	}

	.notification-success .notification-icon {
		background: var(--success-bg);
		color: var(--success);
	}

	.notification-error .notification-icon {
		background: var(--danger-bg);
		color: var(--danger);
	}

	.notification-warning .notification-icon {
		background: var(--warning-bg);
		color: var(--warning);
	}

	.notification-info .notification-icon {
		background: var(--primary-bg);
		color: var(--primary);
	}

	.notification-content {
		flex: 1;
		min-width: 0;
	}

	.notification-title {
		font-weight: 600;
		color: var(--text);
		margin-bottom: 4px;
	}

	.notification-message {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.notification-action {
		margin-top: 8px;
		padding: 6px 12px;
		background: var(--primary);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.notification-action:hover {
		background: var(--primary-hover);
	}

	.notification-close {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.notification-close:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	@keyframes slideIn {
		from {
			transform: translateX(400px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		.notifications-container {
			top: 10px;
			right: 10px;
			left: 10px;
			max-width: none;
		}
	}
</style>
