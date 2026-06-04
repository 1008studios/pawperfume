<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface User {
		id: string;
		name: string;
		email: string;
		role: 'admin' | 'manager' | 'agent';
		status: 'active' | 'inactive';
		lastLogin?: string;
		createdAt: string;
	}

	interface Props {
		open: boolean;
		users: User[];
	}

	let { open, users }: Props = $props();

	const dispatch = createEventDispatcher();

	let editingUser = $state<User | null>(null);

	const ROLE_COLORS = {
		admin: '#ef4444',
		manager: '#f59e0b',
		agent: '#3b82f6'
	};

	function editUser(user: User) {
		editingUser = { ...user };
	}

	function startAddUser() {
		editingUser = {
			id: '',
			name: '',
			email: '',
			role: 'agent',
			status: 'active',
			createdAt: new Date().toISOString()
		};
	}

	function saveUser() {
		if (editingUser) {
			if (editingUser.id) {
				dispatch('update', editingUser);
			} else {
				dispatch('create', editingUser);
			}
		}
		editingUser = null;
	}

	function deleteUser(id: string) {
		if (confirm('Delete this user? This action cannot be undone.')) {
			dispatch('delete', id);
		}
	}

	function toggleStatus(user: User) {
		dispatch('toggleStatus', {
			id: user.id,
			status: user.status === 'active' ? 'inactive' : 'active'
		});
	}

	function formatDate(dateString?: string): string {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
</script>

{#if open}
	<div class="modal-overlay" onclick={handleOverlayClick} role="button" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && dispatch('close')} aria-label="Close user management">
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="user-management-title">
			<div class="modal-header">
				<h2 id="user-management-title">User Management</h2>
				<div class="header-actions">
					<button class="btn btn-primary" onclick={startAddUser}>
						+ Add User
					</button>
					<button class="btn-icon" onclick={() => dispatch('close')} aria-label="Close dialogue" title="Close">&times;</button>
				</div>
			</div>

			<div class="modal-body">
				{#if !editingUser}
					<div class="users-table">
						<table>
							<thead>
								<tr>
									<th>User</th>
									<th>Role</th>
									<th>Status</th>
									<th>Last Login</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each users as user (user.id)}
									<tr>
										<td>
											<div class="user-info">
												<div class="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
												<div class="user-details">
													<div class="user-name">{user.name}</div>
													<div class="user-email">{user.email}</div>
												</div>
											</div>
										</td>
										<td>
											<span class="role-badge" style="background: {ROLE_COLORS[user.role]}20; color: {ROLE_COLORS[user.role]}">
												{user.role}
											</span>
										</td>
										<td>
											<button 
												class="status-toggle"
												class:active={user.status === 'active'}
												onclick={() => toggleStatus(user)}
											>
												<span class="status-dot"></span>
												{user.status}
											</button>
										</td>
										<td class="last-login">{formatDate(user.lastLogin)}</td>
										<td>
											<div class="actions">
												<button class="btn-icon" onclick={() => editUser(user)} title="Edit" aria-label="Edit user">✎</button>
												<button class="btn-icon danger" onclick={() => deleteUser(user.id)} title="Delete" aria-label="Delete user">🗑</button>
											</div>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="5" class="empty">
											<p>No users yet. Add your first user to get started!</p>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<form class="user-form" onsubmit={(e) => { e.preventDefault(); saveUser(); }}>
						<div class="form-group">
							<label for="user-name">Full Name *</label>
							<input 
								id="user-name"
								type="text" 
								bind:value={editingUser.name}
								placeholder="Juan Dela Cruz"
								required
							/>
						</div>

						<div class="form-group">
							<label for="user-email">Email *</label>
							<input 
								id="user-email"
								type="email" 
								bind:value={editingUser.email}
								placeholder="juan@example.com"
								required
							/>
						</div>

						<div class="form-group">
							<label for="user-role">Role *</label>
							<select id="user-role" bind:value={editingUser.role} required>
								<option value="agent">Agent</option>
								<option value="manager">Manager</option>
								<option value="admin">Admin</option>
							</select>
							<p class="form-hint">
								Admin: Full access | Manager: Can manage orders & users | Agent: Can handle chats & orders
							</p>
						</div>

						<div class="form-group">
							<label for="user-status">Status</label>
							<select id="user-status" bind:value={editingUser.status}>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</select>
						</div>

						<div class="form-actions">
							<button 
								type="button" 
								class="btn btn-secondary" 
								onclick={() => { editingUser = null; }}
							>
								Cancel
							</button>
							<button type="submit" class="btn btn-primary">
								{editingUser.id ? 'Update User' : 'Create User'}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.modal {
		background: var(--surface);
		border-radius: 12px;
		max-width: 900px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		border-bottom: 1px solid var(--border);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text);
	}

	.header-actions {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.modal-body {
		padding: 20px;
		overflow-y: auto;
	}

	.users-table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: var(--surface-hover);
	}

	th {
		text-align: left;
		padding: 12px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--border);
	}

	td {
		padding: 16px 12px;
		border-bottom: 1px solid var(--border);
	}

	tr:last-child td {
		border-bottom: none;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--primary);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 16px;
		flex-shrink: 0;
	}

	.user-details {
		flex: 1;
		min-width: 0;
	}

	.user-name {
		font-weight: 600;
		color: var(--text);
		margin-bottom: 2px;
	}

	.user-email {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.role-badge {
		display: inline-block;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 600;
		text-transform: capitalize;
	}

	.status-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
		color: var(--text-secondary);
		transition: all 0.2s ease;
	}

	.status-toggle.active {
		background: var(--success-bg);
		border-color: var(--success);
		color: var(--success);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.last-login {
		font-size: 13px;
		color: var(--text-tertiary);
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.empty {
		text-align: center;
		padding: 40px 20px !important;
		color: var(--text-tertiary);
	}

	.user-form {
		max-width: 500px;
		margin: 0 auto;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		margin-bottom: 6px;
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		background: var(--surface);
		color: var(--text);
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-bg);
	}

	.form-hint {
		margin: 6px 0 0 0;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 24px;
	}

	.btn {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--primary-hover);
	}

	.btn-secondary {
		background: var(--surface-hover);
		color: var(--text);
	}

	.btn-secondary:hover {
		background: var(--border);
	}

	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px;
		font-size: 18px;
		line-height: 1;
		color: var(--text-secondary);
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.btn-icon:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.btn-icon.danger:hover {
		background: var(--danger-bg);
		color: var(--danger);
	}

	@media (max-width: 768px) {
		.users-table {
			font-size: 13px;
		}

		th, td {
			padding: 10px 8px;
		}

		.user-avatar {
			width: 32px;
			height: 32px;
			font-size: 14px;
		}
	}
</style>
