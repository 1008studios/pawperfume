<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface AutomationNode {
		id: string;
		type: 'trigger' | 'action' | 'condition' | 'delay';
		label: string;
		config: Record<string, any>;
		x: number;
		y: number;
	}

	interface AutomationConnection {
		id: string;
		from: string;
		to: string;
		condition?: string;
	}

	interface Props {
		open: boolean;
		initialNodes?: AutomationNode[];
		initialConnections?: AutomationConnection[];
	}

	let { open, initialNodes = [], initialConnections = [] }: Props = $props();

	const dispatch = createEventDispatcher();

	let nodes = $state<AutomationNode[]>([]);
	let connections = $state<AutomationConnection[]>([]);

	let selectedNode = $state<AutomationNode | null>(null);
	let configString = $state('');

	$effect(() => {
		if (open) {
			nodes = [...initialNodes];
			connections = [...initialConnections];
			selectedNode = null;
		}
	});

	$effect(() => {
		if (selectedNode) {
			configString = JSON.stringify(selectedNode.config, null, 2);
		}
	});

	function handleConfigInput() {
		try {
			if (selectedNode) {
				selectedNode.config = JSON.parse(configString);
				nodes = [...nodes];
			}
		} catch {}
	}

	let draggingNode = $state<AutomationNode | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });

	let connectingFrom = $state<string | null>(null);

	const NODE_TYPES = {
		trigger: { label: 'Trigger', color: '#3b82f6', icon: '' },
		action: { label: 'Action', color: '#10b981', icon: '' },
		condition: { label: 'Condition', color: '#f59e0b', icon: '' },
		delay: { label: 'Delay', color: '#8b5cf6', icon: '' }
	};

	function addNode(type: keyof typeof NODE_TYPES) {
		const newNode: AutomationNode = {
			id: `node_${Date.now()}`,
			type,
			label: `${NODE_TYPES[type].label} ${nodes.length + 1}`,
			config: {},
			x: 100 + (nodes.length * 50),
			y: 100 + (nodes.length * 50)
		};
		nodes = [...nodes, newNode];
	}

	function deleteNode(id: string) {
		nodes = nodes.filter(n => n.id !== id);
		connections = connections.filter(c => c.from !== id && c.to !== id);
		if (selectedNode?.id === id) selectedNode = null;
	}

	function handleNodeDragStart(e: MouseEvent, node: AutomationNode) {
		draggingNode = node;
		dragOffset = {
			x: e.clientX - node.x,
			y: e.clientY - node.y
		};
	}

	function handleCanvasMouseMove(e: MouseEvent) {
		if (!draggingNode) return;

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		draggingNode.x = e.clientX - rect.left - dragOffset.x;
		draggingNode.y = e.clientY - rect.top - dragOffset.y;
		nodes = [...nodes]; // Trigger reactivity
	}

	function handleCanvasMouseUp() {
		draggingNode = null;
	}

	function startConnection(fromId: string) {
		connectingFrom = fromId;
	}

	function completeConnection(toId: string) {
		if (!connectingFrom || connectingFrom === toId) return;

		const newConnection: AutomationConnection = {
			id: `conn_${Date.now()}`,
			from: connectingFrom,
			to: toId
		};

		connections = [...connections, newConnection];
		connectingFrom = null;
	}

	function deleteConnection(id: string) {
		connections = connections.filter(c => c.id !== id);
	}

	function save() {
		dispatch('save', { nodes, connections });
	}
</script>

{#if open}
	<div class="automation-builder">
		<div class="builder-header">
			<h2>Automation Builder</h2>
			<div class="builder-actions">
				<button class="btn btn-secondary" onclick={() => dispatch('close')}>Cancel</button>
				<button class="btn btn-primary" onclick={save}>Save Automation</button>
			</div>
		</div>

		<div class="builder-content">
			<div class="node-palette">
				<h3>Add Node</h3>
				{#each Object.entries(NODE_TYPES) as [type, config]}
					<button 
						class="palette-item"
						onclick={() => addNode(type as keyof typeof NODE_TYPES)}
					>
						<span class="palette-icon">{config.icon}</span>
						<span class="palette-label">{config.label}</span>
					</button>
				{/each}
			</div>

			<div 
				class="canvas"
				onmousemove={handleCanvasMouseMove}
				onmouseup={handleCanvasMouseUp}
				onmouseleave={handleCanvasMouseUp}
				role="region"
				aria-label="Automation Canvas"
			>
				<svg class="connections-layer">
					{#each connections as connection (connection.id)}
						{@const from = nodes.find(n => n.id === connection.from)}
						{@const to = nodes.find(n => n.id === connection.to)}
						{#if from && to}
							<line
								x1={from.x + 100}
								y1={from.y + 40}
								x2={to.x + 100}
								y2={to.y + 40}
								stroke="var(--border-strong)"
								stroke-width="2"
								marker-end="url(#arrowhead)"
							/>
							<circle
								cx={(from.x + 100 + to.x + 100) / 2}
								cy={(from.y + 40 + to.y + 40) / 2}
								r="8"
								fill="var(--danger)"
								role="button"
								tabindex="0"
								aria-label="Delete connection"
								onclick={() => deleteConnection(connection.id)}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && deleteConnection(connection.id)}
								style="cursor: pointer;"
							/>
						{/if}
					{/each}
					<defs>
						<marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
							<polygon points="0 0, 10 3, 0 6" fill="var(--border-strong)" />
						</marker>
					</defs>
				</svg>

				{#each nodes as node (node.id)}
					{@const config = NODE_TYPES[node.type]}
					<div
						class="node"
						class:selected={selectedNode?.id === node.id}
						style="left: {node.x}px; top: {node.y}px; border-color: {config.color};"
						onmousedown={(e) => handleNodeDragStart(e, node)}
						onclick={() => selectedNode = node}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selectedNode = node)}
						role="button"
						tabindex="0"
						aria-label="Select node {node.label}"
					>
						<div class="node-header" style="background: {config.color}">
							<span class="node-icon">{config.icon}</span>
							<span class="node-label">{node.label}</span>
							<button 
								class="node-delete"
								onclick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
								aria-label="Delete node"
								title="Delete node"
							>
								
							</button>
						</div>
						<div class="node-body">
							<p class="node-type">{config.label}</p>
						</div>
						<div class="node-ports">
							<button 
								class="port port-in"
								onclick={(e) => { e.stopPropagation(); completeConnection(node.id); }}
								aria-label="Input Connection Port"
								title="Input Connection Port"
							></button>
							<button 
								class="port port-out"
								onclick={(e) => { e.stopPropagation(); startConnection(node.id); }}
								aria-label="Output Connection Port"
								title="Output Connection Port"
							></button>
						</div>
					</div>
				{/each}
			</div>

			{#if selectedNode}
				<div class="node-editor">
					<h3>Edit Node</h3>
					<div class="form-group">
						<label for="node-label-input">Label</label>
						<input 
							id="node-label-input"
							type="text" 
							bind:value={selectedNode.label}
							oninput={() => nodes = [...nodes]}
						/>
					</div>
					<div class="form-group">
						<label for="node-config-input">Configuration</label>
						<textarea 
							id="node-config-input"
							bind:value={configString}
							oninput={handleConfigInput}
							rows="10"
						></textarea>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.automation-builder {
		position: fixed;
		inset: 0;
		background: var(--surface);
		z-index: 1000;
		display: flex;
		flex-direction: column;
	}

	.builder-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		border-bottom: 1px solid var(--border);
	}

	.builder-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text);
	}

	.builder-actions {
		display: flex;
		gap: 12px;
	}

	.builder-content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.node-palette {
		width: 200px;
		padding: 16px;
		border-right: 1px solid var(--border);
		background: var(--surface-hover);
	}

	.node-palette h3 {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.palette-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		margin-bottom: 8px;
		transition: all 0.2s ease;
	}

	.palette-item:hover {
		border-color: var(--primary);
		background: var(--primary-bg);
	}

	.palette-icon {
		font-size: 18px;
	}

	.palette-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
	}

	.canvas {
		flex: 1;
		position: relative;
		overflow: auto;
		background: var(--bg);
		background-image: 
			radial-gradient(circle, var(--border) 1px, transparent 1px);
		background-size: 20px 20px;
	}

	.connections-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.connections-layer line,
	.connections-layer circle {
		pointer-events: auto;
	}

	.node {
		position: absolute;
		width: 200px;
		background: var(--surface);
		border: 2px solid var(--border);
		border-radius: 8px;
		cursor: move;
		user-select: none;
		box-shadow: var(--shadow);
		transition: box-shadow 0.2s ease;
	}

	.node.selected {
		box-shadow: 0 0 0 3px var(--primary);
	}

	.node-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		color: white;
		font-weight: 600;
		font-size: 13px;
	}

	.node-icon {
		font-size: 16px;
	}

	.node-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.node-delete {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		width: 20px;
		height: 20px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.node-delete:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.node-body {
		padding: 12px;
	}

	.node-type {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.node-ports {
		position: absolute;
		top: 40px;
		left: -8px;
		right: -8px;
		display: flex;
		justify-content: space-between;
		pointer-events: none;
	}

	.port {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--surface);
		border: 2px solid var(--border-strong);
		cursor: pointer;
		pointer-events: auto;
		transition: all 0.2s ease;
	}

	.port:hover {
		transform: scale(1.15);
		border-color: var(--primary);
		background: var(--primary);
	}

	.node-editor {
		width: 300px;
		padding: 16px;
		border-left: 1px solid var(--border);
		background: var(--surface-hover);
		overflow-y: auto;
	}

	.node-editor h3 {
		margin: 0 0 16px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		background: var(--surface);
		color: var(--text);
		font-family: monospace;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--primary);
	}

	.btn {
		padding: 8px 16px;
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
</style>
