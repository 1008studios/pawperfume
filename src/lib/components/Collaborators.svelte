<script lang="ts">
	interface User {
		id: string;
		name: string;
		avatar?: string;
		color?: string;
		cursor?: { x: number; y: number };
	}

	interface Props {
		users: User[];
		maxVisible?: number;
	}

	let { users, maxVisible = 3 }: Props = $props();

	const visibleUsers = $derived(() => users.slice(0, maxVisible));
	const overflowCount = $derived(() => Math.max(0, users.length - maxVisible));

	function getInitials(name: string): string {
		return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
	}

	function getRandomColor(seed: string): string {
		const colors = [
			'#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
			'#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
		];
		const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
		return colors[index];
	}
</script>

<div class="collaborators">
	<div class="avatar-stack">
		{#each visibleUsers() as user, i (user.id)}
			<div 
				class="avatar"
				style="z-index: {maxVisible - i}; background: {user.color || getRandomColor(user.id)}"
				title={user.name}
			>
				{#if user.avatar}
					<img src={user.avatar} alt={user.name} class="avatar-image" />
				{:else}
					<span class="avatar-initials">{getInitials(user.name)}</span>
				{/if}
			</div>
		{/each}

		{#if overflowCount() > 0}
			<div class="avatar avatar-overflow" style="z-index: 0">
				<span class="overflow-count">+{overflowCount()}</span>
			</div>
		{/if}
	</div>

	{#if users.length > 0}
		<div class="collaboration-indicator">
			<span class="pulse-dot"></span>
			<span class="collaboration-text">
				{users.length} {users.length === 1 ? 'person' : 'people'} editing
			</span>
		</div>
	{/if}
</div>

<style>
	.collaborators {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.avatar-stack {
		display: flex;
		align-items: center;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--surface);
		margin-left: -8px;
		position: relative;
		transition: transform 0.2s ease;
	}

	.avatar:first-child {
		margin-left: 0;
	}

	.avatar:hover {
		transform: translateY(-2px);
		z-index: 100 !important;
	}

	.avatar-image {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-initials {
		color: white;
		font-size: 12px;
		font-weight: 600;
	}

	.avatar-overflow {
		background: var(--surface-hover);
		border-color: var(--border);
	}

	.overflow-count {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.collaboration-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--success);
		position: relative;
	}

	.pulse-dot::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: var(--success);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	.collaboration-text {
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.collaborators {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.avatar {
			width: 28px;
			height: 28px;
		}

		.avatar-initials {
			font-size: 10px;
		}
	}
</style>
