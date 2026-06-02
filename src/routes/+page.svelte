<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getTokenValue } from '$lib/api';

	onMount(() => {
		if (getTokenValue()) {
			goto('/dashboard');
		} else {
			goto('/login');
		}
	});
</script>

<div class="redirect-page">
	<div class="loader"></div>
	<p>Redirecting...</p>
</div>

<style>
	.redirect-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		color: var(--text-secondary);
	}

	.loader {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		margin-bottom: 12px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
