<script lang="ts">
	interface Props {
		show?: boolean;
	}

	let { show = true }: Props = $props();
</script>

{#if show}
	<div class="typing-indicator">
		<div class="typing-bubble">
			<span class="dot"></span>
			<span class="dot"></span>
			<span class="dot"></span>
		</div>
	</div>
{/if}

<style>
	.typing-indicator {
		display: flex;
		padding: 8px 0;
	}

	.typing-bubble {
		display: flex;
		gap: 4px;
		padding: 12px 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		border-bottom-left-radius: 4px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--text-tertiary);
		animation: typing 1.4s infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing {
		0%, 60%, 100% {
			transform: translateY(0);
			opacity: 0.7;
		}
		30% {
			transform: translateY(-10px);
			opacity: 1;
		}
	}
</style>
