<script lang="ts">
	interface Props {
		content: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		delay?: number;
	}

	let { 
		content, 
		position = 'top',
		delay = 200
	}: Props = $props();

	let visible = $state(false);
	let timeout: ReturnType<typeof setTimeout>;

	function show() {
		timeout = setTimeout(() => {
			visible = true;
		}, delay);
	}

	function hide() {
		clearTimeout(timeout);
		visible = false;
	}
</script>

<div 
	class="tooltip-wrapper"
	onmouseenter={show}
	onmouseleave={hide}
	onfocus={show}
	onblur={hide}
>
	<slot />
	
	{#if visible}
		<div class="tooltip tooltip-{position}" role="tooltip">
			<div class="tooltip-content">
				{content}
			</div>
			<div class="tooltip-arrow"></div>
		</div>
	{/if}
</div>

<style>
	.tooltip-wrapper {
		position: relative;
		display: inline-block;
	}

	.tooltip {
		position: absolute;
		z-index: 10000;
		pointer-events: none;
		animation: fadeIn 0.15s ease-out;
	}

	.tooltip-content {
		background: var(--text);
		color: var(--surface);
		padding: 6px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.tooltip-arrow {
		position: absolute;
		width: 0;
		height: 0;
		border: 5px solid transparent;
	}

	/* Top position */
	.tooltip-top {
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-top .tooltip-arrow {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-top-color: var(--text);
	}

	/* Bottom position */
	.tooltip-bottom {
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-bottom .tooltip-arrow {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-bottom-color: var(--text);
	}

	/* Left position */
	.tooltip-left {
		right: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-left .tooltip-arrow {
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-left-color: var(--text);
	}

	/* Right position */
	.tooltip-right {
		left: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-right .tooltip-arrow {
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-right-color: var(--text);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
