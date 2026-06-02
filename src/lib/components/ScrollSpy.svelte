<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		selector: string;
		offset?: number;
		smooth?: boolean;
	}

	let { 
		selector,
		offset = 80,
		smooth = true
	}: Props = $props();

	let activeSection = $state('');
	let sections = $state<HTMLElement[]>([]);

	onMount(() => {
		sections = Array.from(document.querySelectorAll(selector));
		
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						activeSection = entry.target.id;
					}
				});
			},
			{
				rootMargin: `-${offset}px 0px -50% 0px`,
				threshold: 0
			}
		);

		sections.forEach(section => observer.observe(section));

		return () => observer.disconnect();
	});

	function scrollToSection(id: string) {
		const element = document.getElementById(id);
		if (!element) return;

		const top = element.offsetTop - offset;
		
		window.scrollTo({
			top,
			behavior: smooth ? 'smooth' : 'auto'
		});
	}

	export function getActiveSection() {
		return activeSection;
	}
</script>

<nav class="scroll-spy">
	<slot {activeSection} {scrollToSection} />
</nav>

<style>
	.scroll-spy {
		position: sticky;
		top: 100px;
		max-height: calc(100vh - 120px);
		overflow-y: auto;
	}

	:global(.scroll-spy-item) {
		display: block;
		padding: 8px 16px;
		color: var(--text-secondary);
		text-decoration: none;
		border-left: 2px solid transparent;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	:global(.scroll-spy-item:hover) {
		color: var(--text);
		background: var(--surface-hover);
	}

	:global(.scroll-spy-item.active) {
		color: var(--primary);
		border-left-color: var(--primary);
		background: var(--primary-bg);
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.scroll-spy {
			position: static;
			max-height: none;
		}
	}
</style>
