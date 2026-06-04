<script lang="ts">
	interface Props {
		data: Array<{ label: string; value: number; color: string }>;
		size?: number;
	}

	let { data, size = 160 }: Props = $props();

	let total = $derived(data.reduce((sum, d) => sum + d.value, 0));
	let segments = $derived(() => {
		let currentAngle = 0;
		if (total === 0) return [];
		return data.map(item => {
			const angle = (item.value / total) * 360;
			const startAngle = currentAngle;
			currentAngle += angle;
			return { ...item, startAngle, angle };
		});
	});

	function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
		const rad = ((angle - 90) * Math.PI) / 180;
		return {
			x: cx + r * Math.cos(rad),
			y: cy + r * Math.sin(rad)
		};
	}

	function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
		const start = polarToCartesian(cx, cy, r, endAngle);
		const end = polarToCartesian(cx, cy, r, startAngle);
		const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
		return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
	}
</script>

<div class="donut-chart">
	<svg width={size} height={size} viewBox="0 0 100 100">
		{#each segments() as segment}
			<path
				d={describeArc(50, 50, 40, segment.startAngle, segment.startAngle + segment.angle)}
				fill="none"
				stroke={segment.color}
				stroke-width="20"
				stroke-linecap="round"
			/>
		{/each}
		<circle cx="50" cy="50" r="30" fill="var(--surface)" />
		<text x="50" y="45" text-anchor="middle" class="total-value">{total}</text>
		<text x="50" y="58" text-anchor="middle" class="total-label">Total</text>
	</svg>

	<div class="legend">
		{#each data as item}
			<div class="legend-item">
				<span class="legend-color" style="background: {item.color}"></span>
				<span class="legend-label">{item.label}</span>
				<span class="legend-value">{item.value}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.donut-chart {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.total-value {
		font-size: 16px;
		font-weight: 700;
		fill: var(--text);
	}

	.total-label {
		font-size: 10px;
		fill: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.legend-label {
		flex: 1;
		color: var(--text-secondary);
	}

	.legend-value {
		font-weight: 600;
		color: var(--text);
	}
</style>
