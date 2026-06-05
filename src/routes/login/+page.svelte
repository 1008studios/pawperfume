<script lang="ts">
	import { goto } from '$app/navigation';
	import { api, showToast, setToken } from '$lib/api';

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
				showToast('Signed in successfully', 'success');
				goto('/dashboard');
			} else {
				error = 'Incorrect password. Please try again.';
			}
		} catch (err) {
			error = 'Unable to connect. Check your connection and try again.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-page">
	<div class="login-card">
		<div class="login-header">
			<div class="brand-mark">PP</div>
			<h1>PawPerfume</h1>
			<p>Sign in to manage your store</p>
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
					Signing in...
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

<style>
	.login-page {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		padding: 24px;
	}

	.login-card {
		width: 100%;
		max-width: 380px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 40px 32px;
		box-shadow: var(--shadow);
	}

	.login-header {
		text-align: center;
		margin-bottom: 32px;
	}

	.brand-mark {
		width: 48px;
		height: 48px;
		margin: 0 auto 16px;
		border-radius: 12px;
		background: var(--accent);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.5px;
	}

	.login-header h1 {
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.4px;
		margin-bottom: 4px;
		color: var(--text);
	}

	.login-header p {
		color: var(--text-secondary);
		font-size: 14px;
		font-weight: 450;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		margin-bottom: 6px;
		color: var(--text-secondary);
	}

	.form-group input {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 14px;
		background: var(--surface);
		color: var(--text);
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-bg);
	}

	.login-btn {
		width: 100%;
		padding: 10px 16px;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius-sm);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: background 0.15s ease;
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
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error {
		margin-top: 14px;
		padding: 10px 14px;
		background: var(--red-bg);
		color: var(--red);
		border-radius: var(--radius-sm);
		font-size: 13px;
		text-align: center;
		font-weight: 500;
	}
</style>
