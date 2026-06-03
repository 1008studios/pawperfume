<div class="login-page">
	<div class="login-card">
		<div class="login-header">
			<span class="login-icon">🧴</span>
			<h1>PawPerfume</h1>
			<p>Welcome back to your dashboard</p>
		</div>
		<form onsubmit={handleLogin}>
			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="Enter your password"
					autocomplete="current-password"
					required
				/>
			</div>
			<button type="submit" class="login-btn" disabled={loading}>
				{#if loading}
					<span class="spinner"></span>
				{:else}
					Sign in
				{/if}
			</button>
			{#if error}
				<p class="error">{error}</p>
			{/if}
		</form>
	</div>
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { api, setToken } from '$lib/api';
	import { showToast } from '$lib/stores';

	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			const res = await api.login(password);
			if (res.ok && res.token) {
				setToken(res.token);
				showToast('Welcome back!', 'success');
				goto('/dashboard');
			} else {
				error = 'Invalid password. Please try again.';
			}
		} catch (err) {
			error = 'Could not connect. Check your internet and try again.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		padding: 20px;
	}

	.login-card {
		width: 100%;
		max-width: 360px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 40px 32px;
	}

	.login-header {
		text-align: center;
		margin-bottom: 32px;
	}

	.login-icon {
		font-size: 48px;
		display: block;
		margin-bottom: 12px;
	}

	.login-header h1 {
		font-size: 24px;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.login-header p {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 6px;
		color: var(--text);
	}

	.form-group input {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 14px;
		background: var(--bg);
		color: var(--text);
		transition: border-color 0.15s;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent-bg);
	}

	.login-btn {
		width: 100%;
		padding: 10px 16px;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: var(--radius);
		font-size: 14px;
		font-weight: 500;
		transition: background 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.login-btn:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.login-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		margin-top: 12px;
		padding: 8px 12px;
		background: var(--red-bg);
		color: var(--red);
		border-radius: var(--radius);
		font-size: 13px;
		text-align: center;
	}
</style>
