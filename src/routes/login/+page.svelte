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
		background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.08) 90.1%), var(--bg);
		padding: 20px;
		position: relative;
		overflow: hidden;
	}

	/* Glowing backdrop blobs */
	.login-page::before, .login-page::after {
		content: '';
		position: absolute;
		width: 300px;
		height: 300px;
		border-radius: 50%;
		background: radial-gradient(circle, var(--accent-bg) 0%, transparent 70%);
		z-index: 0;
		filter: blur(40px);
		opacity: 0.6;
		pointer-events: none;
	}

	.login-page::before {
		top: 15%;
		left: 20%;
		animation: float-slow 12s infinite alternate ease-in-out;
	}

	.login-page::after {
		bottom: 15%;
		right: 20%;
		animation: float-slow 15s infinite alternate-reverse ease-in-out;
	}

	@keyframes float-slow {
		0% { transform: translate(0, 0) scale(1); }
		100% { transform: translate(30px, -20px) scale(1.1); }
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(20px) saturate(180%);
		-webkit-backdrop-filter: blur(20px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 24px;
		padding: 48px 36px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04), 
		            0 1px 3px rgba(0, 0, 0, 0.02),
		            inset 0 1px 0 rgba(255, 255, 255, 0.6);
		z-index: 1;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
	}

	[data-theme="dark"] .login-card {
		background: rgba(18, 16, 21, 0.75);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 
		            inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	.login-card:hover {
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.08), 
		            0 1px 3px rgba(0, 0, 0, 0.02);
		transform: translateY(-2px);
	}

	[data-theme="dark"] .login-card:hover {
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
	}

	.login-header {
		text-align: center;
		margin-bottom: 36px;
	}

	.login-icon {
		font-size: 54px;
		display: inline-block;
		margin-bottom: 16px;
		filter: drop-shadow(0 8px 16px rgba(124, 58, 237, 0.25));
		animation: float-icon 4s infinite ease-in-out;
	}

	@keyframes float-icon {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		50% { transform: translateY(-8px) rotate(3deg); }
	}

	.login-header h1 {
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.8px;
		margin-bottom: 6px;
		background: linear-gradient(135deg, var(--text) 30%, var(--text-secondary) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.login-header p {
		color: var(--text-secondary);
		font-size: 14px;
		font-weight: 500;
	}

	.form-group {
		margin-bottom: 24px;
	}

	.form-group label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		margin-bottom: 8px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.8px;
	}

	.form-group input {
		width: 100%;
		padding: 12px 16px;
		border: 1.5px solid var(--border);
		border-radius: 14px;
		font-size: 15px;
		background: var(--surface);
		color: var(--text);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: var(--shadow-sm);
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 4px var(--accent-bg);
		background: var(--surface);
	}

	.login-btn {
		width: 100%;
		padding: 14px 20px;
		background: linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%);
		color: white;
		border: none;
		border-radius: 14px;
		font-size: 15px;
		font-weight: 600;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
		cursor: pointer;
	}

	.login-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent) 100%);
		box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
		transform: translateY(-1px);
	}

	.login-btn:active:not(:disabled) {
		transform: translateY(1px);
		box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2);
	}

	.login-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2.5px solid rgba(255, 255, 255, 0.3);
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
		margin-top: 16px;
		padding: 10px 14px;
		background: var(--red-bg);
		color: var(--red);
		border-radius: 12px;
		font-size: 13px;
		text-align: center;
		font-weight: 500;
		border: 1px solid rgba(244, 63, 94, 0.2);
		animation: shake 0.4s ease-in-out;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-4px); }
		75% { transform: translateX(4px); }
	}
</style>
