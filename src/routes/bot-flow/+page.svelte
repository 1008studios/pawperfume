<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { BotFlowStep } from '$lib/types';

	let steps = $state<BotFlowStep[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let editingStep = $state<BotFlowStep | null>(null);
	let showTestMode = $state(false);
	let testStepIndex = $state(0);
	let testInput = $state('');
	let testLog = $state<Array<{ type: 'bot' | 'user' | 'system'; text: string; imageUrl?: string; carousel?: CarouselItem[] }>>([]);
	let testVariables = $state<Record<string, string>>({});

	// Image / carousel upload state
	let uploadingImage = $state(false);
	let imageDropActive = $state(false);
	let imageFileInput: HTMLInputElement;

	interface CarouselItem {
		title: string;
		subtitle: string;
		imageUrl: string;
		buttonLabel: string;
		buttonNextStep: string;
	}

	let newStep = $state({
		stepKey: '',
		stepLabel: '',
		stepType: 'text_input',
		promptMessage: '',
		nextStep: '',
		inputVariable: '',
		buttonChoices: [] as Array<{ label: string; next_step: string }>,
		sortOrder: 0,
		imageUrl: '',
		carouselItems: [] as CarouselItem[]
	});

	onMount(async () => { await loadSteps(); });

	async function loadSteps() {
		loading = true;
		try { steps = await api.botFlow() as BotFlowStep[]; }
		catch { showToast('Could not load bot flow. Please try again.', 'error'); }
		finally { loading = false; }
	}

	let sortedSteps = $derived(
		[...steps].sort((a, b) => a.sort_order - b.sort_order)
	);

	let stepMap = $derived(
		new Map(sortedSteps.map(s => [s.step_key, s]))
	);

	function getNextStepName(step: BotFlowStep): string {
		if (step.next_step) {
			const next = stepMap.get(step.next_step);
			return next?.step_label || step.next_step;
		}
		return '';
	}

	async function addStep() {
		try {
			const payload = {
				step_key: newStep.stepKey,
				step_label: newStep.stepLabel,
				step_type: newStep.stepType,
				prompt_message: newStep.promptMessage,
				next_step: newStep.nextStep,
				input_variable: newStep.inputVariable,
				button_choices: newStep.buttonChoices,
				image_url: newStep.imageUrl,
				carousel_items: newStep.carouselItems
			};
			if (editingStep) {
				await api.generic(`/bot-flow/${editingStep.id}`, 'PUT', payload);
				showToast('Step updated.', 'success');
			} else {
				await api.createBotFlowStep({ ...payload, sortOrder: newStep.sortOrder });
				showToast('Step added.', 'success');
			}
			showForm = false;
			editingStep = null;
			resetForm();
			await loadSteps();
		} catch { showToast('Could not save step. Please try again.', 'error'); }
	}

	function editStep(step: BotFlowStep) {
		editingStep = step;
		newStep = {
			stepKey: step.step_key,
			stepLabel: step.step_label || '',
			stepType: step.step_type,
			promptMessage: step.prompt_message || '',
			nextStep: step.next_step || '',
			inputVariable: step.input_variable || '',
			buttonChoices: step.button_choices || [],
			sortOrder: step.sort_order,
			imageUrl: step.image_url || '',
			carouselItems: (step.carousel_items as CarouselItem[]) || []
		};
		showForm = true;
	}

	function handleCardKeyDown(e: KeyboardEvent, step: BotFlowStep) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			editStep(step);
		}
	}

	function resetForm() {
		newStep = { stepKey: '', stepLabel: '', stepType: 'text_input', promptMessage: '', nextStep: '', inputVariable: '', buttonChoices: [], sortOrder: sortedSteps.length, imageUrl: '', carouselItems: [] };
	}

	function openNewStep() {
		editingStep = null;
		resetForm();
		newStep.sortOrder = sortedSteps.length;
		showForm = true;
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteStep() {
		if (!deletingId) return;
		try {
			await api.generic(`/bot-flow/${deletingId}`, 'DELETE');
			showToast('Step deleted.', 'success');
			await loadSteps();
		} catch { showToast('Could not delete. Please try again.', 'error'); }
		finally { showDeleteConfirm = false; deletingId = null; }
	}

	async function moveStep(step: BotFlowStep, direction: -1 | 1) {
		const idx = sortedSteps.findIndex(s => s.id === step.id);
		const newIdx = idx + direction;
		if (newIdx < 0 || newIdx >= sortedSteps.length) return;
		const other = sortedSteps[newIdx];
		const tmpOrder = step.sort_order;
		step.sort_order = other.sort_order;
		other.sort_order = tmpOrder;
		try {
			await api.generic(`/bot-flow/${step.id}`, 'PUT', { sort_order: step.sort_order });
			await api.generic(`/bot-flow/${other.id}`, 'PUT', { sort_order: other.sort_order });
			await loadSteps();
		} catch { showToast('Could not reorder. Please try again.', 'error'); }
	}

	// ── Image upload ──────────────────────────────────────────────
	async function uploadImage(file: File) {
		// Convert PNG to JPEG if needed
		let uploadFile = file;
		if (file.type === 'image/png') {
			uploadFile = await convertToJpeg(file);
		}
		uploadingImage = true;
		try {
			const formData = new FormData();
			formData.append('file', uploadFile);
			const token = localStorage.getItem('pp_token') || '';
			const res = await fetch('/api/admin/upload-blob', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` },
				body: formData
			});
			if (!res.ok) throw new Error('Upload failed');
			const data = await res.json() as { url: string };
			newStep.imageUrl = data.url;
			showToast('Image uploaded.', 'success');
		} catch {
			showToast('Image upload failed. Check Vercel Blob config.', 'error');
		} finally {
			uploadingImage = false;
		}
	}

	function convertToJpeg(file: File): Promise<File> {
		return new Promise((resolve) => {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext('2d')!;
				ctx.fillStyle = '#fff';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
				URL.revokeObjectURL(url);
				canvas.toBlob(blob => {
					resolve(new File([blob!], file.name.replace(/\.png$/i, '.jpg'), { type: 'image/jpeg' }));
				}, 'image/jpeg', 0.92);
			};
			img.src = url;
		});
	}

	function handleImageFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) uploadImage(input.files[0]);
	}

	function handleImageDrop(e: DragEvent) {
		e.preventDefault();
		imageDropActive = false;
		const file = e.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/')) uploadImage(file);
	}

	// ── Carousel helpers ──────────────────────────────────────────
	function addCarouselItem() {
		newStep.carouselItems = [...newStep.carouselItems, { title: '', subtitle: '', imageUrl: '', buttonLabel: '', buttonNextStep: '' }];
	}
	function removeCarouselItem(i: number) {
		newStep.carouselItems = newStep.carouselItems.filter((_, idx) => idx !== i);
	}
	async function uploadCarouselImage(file: File, index: number) {
		let uploadFile = file;
		if (file.type === 'image/png') uploadFile = await convertToJpeg(file);
		uploadingImage = true;
		try {
			const formData = new FormData();
			formData.append('file', uploadFile);
			const token = localStorage.getItem('pp_token') || '';
			const res = await fetch('/api/admin/upload-blob', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` },
				body: formData
			});
			if (!res.ok) throw new Error('Upload failed');
			const data = await res.json() as { url: string };
			newStep.carouselItems[index].imageUrl = data.url;
			showToast('Image uploaded.', 'success');
		} catch {
			showToast('Image upload failed.', 'error');
		} finally {
			uploadingImage = false;
		}
	}

	// ── Test mode ─────────────────────────────────────────────────
	function startTest() {
		testStepIndex = 0;
		testInput = '';
		testLog = [];
		testVariables = {};
		showTestMode = true;
		if (sortedSteps.length > 0) {
			const firstStep = sortedSteps[0];
			if (firstStep.prompt_message) {
				testLog.push({ type: 'bot', text: firstStep.prompt_message });
			}
			if (firstStep.step_type === 'auto') {
				testLog.push({ type: 'system', text: '(Auto step)' });
				setTimeout(() => { executeStepTransition(firstStep, ''); }, 1000);
			}
		}
	}

	function executeStepTransition(currentStep: BotFlowStep, userInput: string) {
		if (currentStep.input_variable) {
			testVariables[currentStep.input_variable] = userInput;
			testLog.push({ type: 'system', text: `Captured variable {${currentStep.input_variable}} = "${userInput}"` });
		}

		let nextStepKey: string | null = null;
		if (currentStep.step_type === 'button_choice') {
			const choices = currentStep.button_choices || [];
			const match = choices.find(c => c.label.toLowerCase() === userInput.toLowerCase());
			nextStepKey = match ? match.next_step : currentStep.next_step;
		} else {
			nextStepKey = currentStep.next_step;
		}

		if (nextStepKey) {
			const nextIdx = sortedSteps.findIndex(s => s.step_key === nextStepKey);
			if (nextIdx >= 0) {
				testStepIndex = nextIdx;
				const nextStep = sortedSteps[nextIdx];
				setTimeout(() => {
					if (nextStep.prompt_message) {
						testLog.push({ type: 'bot', text: nextStep.prompt_message, imageUrl: nextStep.image_url || undefined });
					}
					testLog = [...testLog];
					if (nextStep.step_type === 'auto') {
						testLog.push({ type: 'system', text: '(Auto step)' });
						setTimeout(() => { executeStepTransition(nextStep, ''); }, 1000);
					}
				}, 600);
			} else {
				testLog.push({ type: 'system', text: `Flow ended: step "${nextStepKey}" not found.` });
			}
		} else {
			testLog.push({ type: 'system', text: 'Flow complete! An order would be created here.' });
		}
		testLog = [...testLog];
	}

	function submitTestInput() {
		const currentStep = sortedSteps[testStepIndex];
		if (!currentStep) return;
		const text = testInput.trim();
		if (!text && currentStep.step_type !== 'auto') return;
		if (text) testLog.push({ type: 'user', text });
		testInput = '';
		testLog = [...testLog];
		executeStepTransition(currentStep, text);
	}

	function selectButtonChoice(choice: { label: string; next_step: string }) {
		testLog.push({ type: 'user', text: choice.label });
		testLog = [...testLog];
		const currentStep = sortedSteps[testStepIndex];
		if (!currentStep) return;
		if (currentStep.input_variable) {
			testVariables[currentStep.input_variable] = choice.label;
		}
		const nextStepKey = choice.next_step || currentStep.next_step;
		if (nextStepKey) {
			const nextIdx = sortedSteps.findIndex(s => s.step_key === nextStepKey);
			if (nextIdx >= 0) {
				testStepIndex = nextIdx;
				const nextStep = sortedSteps[nextIdx];
				setTimeout(() => {
					if (nextStep.prompt_message) {
						testLog.push({ type: 'bot', text: nextStep.prompt_message, imageUrl: nextStep.image_url || undefined });
					}
					testLog = [...testLog];
					if (nextStep.step_type === 'auto') {
						testLog.push({ type: 'system', text: '(Auto step)' });
						setTimeout(() => { executeStepTransition(nextStep, ''); }, 1000);
					}
				}, 600);
			} else {
				testLog.push({ type: 'system', text: `Flow ended: step "${nextStepKey}" not found.` });
			}
		} else {
			testLog.push({ type: 'system', text: 'Flow complete! An order would be created here.' });
		}
		testLog = [...testLog];
	}

	function exportFlow() {
		const data = sortedSteps.map(s => ({
				step_key: s.step_key,
				step_label: s.step_label,
				step_type: s.step_type,
				prompt_message: s.prompt_message,
				next_step: s.next_step,
				input_variable: s.input_variable,
				button_choices: s.button_choices,
				image_url: s.image_url,
				carousel_items: s.carousel_items
		}));
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'bot-flow.json';
		a.click();
		showToast('Flow exported.', 'success');
	}

	function addButtonChoice() {
		newStep.buttonChoices = [...newStep.buttonChoices, { label: '', next_step: '' }];
	}
	function removeButtonChoice(index: number) {
		newStep.buttonChoices = newStep.buttonChoices.filter((_, i) => i !== index);
	}

	function getStepTypeLabel(t: string) {
		const labels: Record<string, string> = {
			text_input: 'Text Input',
			button_choice: 'Button Choice',
			auto: 'Auto',
			image: 'Image',
			carousel: 'Carousel'
		};
		return labels[t] || t;
	}
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This Bot Flow Step?"
	message="This will remove the step from your bot flow. If another step links to this, it may disrupt the conversation flow."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteStep}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Bot Flow</h1>
			<span class="step-count">{sortedSteps.length} steps</span>
		</div>
		<div class="page-actions">
			{#if sortedSteps.length > 0}
				<button class="btn btn-ghost" onclick={startTest}>Test Flow</button>
				<button class="btn btn-ghost" onclick={exportFlow}>Export</button>
			{/if}
			<button class="btn btn-primary" onclick={openNewStep}>+ Add Step</button>
		</div>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else if sortedSteps.length === 0}
		<div class="empty-hero">
			<div class="empty-icon"></div>
			<h2>Build Your Bot Flow</h2>
			<p>Create a step-by-step conversation flow that guides customers through ordering, collecting information, and more.</p>
			<button class="btn btn-primary" onclick={openNewStep}>+ Create First Step</button>
		</div>
	{:else}
		<div class="flow-visualizer">
			{#each sortedSteps as step, i}
				<div 
					class="flow-step clickable-card" 
					class:step-auto={step.step_type === 'auto'} 
					class:step-button={step.step_type === 'button_choice'}
					class:step-text={step.step_type === 'text_input'}
					class:step-image={step.step_type === 'image'}
					class:step-carousel={step.step_type === 'carousel'}
					onclick={() => editStep(step)}
					onkeydown={(e) => handleCardKeyDown(e, step)}
					tabindex="0"
					role="button"
					aria-label="Edit step: {step.step_label || step.step_key}"
				>
					<div class="step-left">
						<button class="step-move" onclick={(e) => { e.stopPropagation(); moveStep(step, -1); }} disabled={i === 0} title="Move up" aria-label="Move step up">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
						</button>
						<button class="step-move" onclick={(e) => { e.stopPropagation(); moveStep(step, 1); }} disabled={i === sortedSteps.length - 1} title="Move down" aria-label="Move step down">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
						</button>
					</div>
					<div class="step-number">{i + 1}</div>
					<div class="step-content">
						<div class="step-header">
							<span class="step-label">{step.step_label || step.step_key}</span>
							<div class="step-badges">
								<span class="step-type-badge badge-{step.step_type}">{getStepTypeLabel(step.step_type)}</span>
								{#if step.input_variable}
									<span class="step-var-badge"> {step.input_variable}</span>
								{/if}
							</div>
						</div>
						{#if step.prompt_message}
							<div class="step-preview">
								<div class="preview-bubble bot">{step.prompt_message}</div>
							</div>
						{/if}
						{#if step.step_type === 'image'}
							{#if step.image_url}
								<div class="step-image-preview">
									<img src={step.image_url} alt="Step image" />
								</div>
							{:else}
								<div class="step-image-placeholder">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
									No image set
								</div>
							{/if}
						{/if}
						{#if step.step_type === 'carousel'}
							{@const items = step.carousel_items || []}
							{#if items.length}
								<div class="step-carousel-preview">
									{#each items.slice(0, 3) as item}
										<div class="carousel-thumb">
											{#if item.imageUrl}
												<img src={item.imageUrl} alt={item.title} />
											{:else}
												<div class="carousel-thumb-placeholder">
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
												</div>
											{/if}
											<span class="carousel-thumb-title">{item.title || '(untitled)'}</span>
										</div>
									{/each}
									{#if items.length > 3}<span class="carousel-more">+{items.length - 3} more</span>{/if}
								</div>
							{:else}
								<div class="step-image-placeholder">No carousel items yet</div>
							{/if}
						{/if}
						{#if step.step_type === 'button_choice' && step.button_choices?.length}
							<div class="step-choices">
								{#each step.button_choices as choice}
									<span class="choice-chip">{choice.label || '?'}</span>
								{/each}
							</div>
						{/if}
						<div class="step-footer">
							{#if getNextStepName(step)}
								<span class="step-next">→ {getNextStepName(step)}</span>
							{:else}
								<span class="step-end"> End (create order)</span>
							{/if}
						</div>
					</div>
					<div class="step-actions">
						<button class="btn-icon" onclick={(e) => { e.stopPropagation(); editStep(step); }} title="Edit" aria-label="Edit step">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
						</button>
						<button class="btn-icon danger" onclick={(e) => { e.stopPropagation(); promptDelete(step.id); }} title="Delete" aria-label="Delete step">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								<line x1="10" y1="11" x2="10" y2="17"></line>
								<line x1="14" y1="11" x2="14" y2="17"></line>
							</svg>
						</button>
					</div>
				</div>
				{#if i < sortedSteps.length - 1}
					<div class="flow-connector-line"></div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<!-- ── Test Modal ──────────────────────────────────────────────── -->
{#if showTestMode}
	<div class="modal-overlay" onclick={() => showTestMode = false} role="presentation">
		<div class="modal modal-test" style="width: 760px; max-width: 95vw; height: 600px; display: flex; flex-direction: column;">
			<div class="modal-header">
				<h3>Test Bot Flow</h3>
				<button class="btn-icon" onclick={() => showTestMode = false} style="font-size: 20px; font-weight: 600; line-height: 1;">×</button>
			</div>
			
			<div class="test-container" style="display: flex; flex: 1; overflow: hidden; background: var(--bg);">
				<!-- Chat Section -->
				<div style="display: flex; flex-direction: column; flex: 1; min-width: 0; height: 100%;">
					<div class="test-log" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
						{#each testLog as entry}
							<div class="test-msg test-{entry.type}" style="max-width: 85%; display: flex; flex-direction: column; align-self: {entry.type === 'user' ? 'flex-end' : entry.type === 'system' ? 'center' : 'flex-start'};">
								<span class="test-sender" style="font-size: 10px; font-weight: 600; color: var(--text-tertiary); margin-bottom: 2px; align-self: {entry.type === 'user' ? 'flex-end' : 'flex-start'};">
									{entry.type === 'bot' ? 'Bot' : entry.type === 'user' ? 'Customer' : 'System'}
								</span>
								<div class="test-text" style="padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.4; background: {entry.type === 'user' ? 'var(--accent)' : entry.type === 'system' ? 'var(--surface-hover)' : 'var(--surface)'}; color: {entry.type === 'user' ? 'white' : 'var(--text)'}; border: {entry.type !== 'user' ? '1px solid var(--border)' : 'none'};">
									{entry.text}
									{#if entry.imageUrl}
										<img src={entry.imageUrl} alt="Bot image" style="display: block; margin-top: 8px; max-width: 200px; border-radius: 8px;" />
									{/if}
								</div>
							</div>
						{:else}
							<div class="test-empty" style="text-align: center; padding: 20px; color: var(--text-tertiary);">Starting flow simulation...</div>
						{/each}
					</div>
					
					{#if sortedSteps[testStepIndex]?.step_type === 'button_choice'}
						<div class="test-choices-container" style="display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px; border-top: 1px solid var(--border); justify-content: center; background: var(--surface);">
							{#each sortedSteps[testStepIndex]?.button_choices || [] as choice}
								<button class="btn btn-ghost" onclick={() => selectButtonChoice(choice)} style="border: 1px solid var(--accent); color: var(--accent); border-radius: 16px; background: var(--accent-bg); padding: 4px 12px; font-size: 12px;">
									{choice.label}
								</button>
							{/each}
						</div>
					{/if}

					<div class="test-input" style="display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); background: var(--surface);">
						<input type="text" bind:value={testInput} placeholder={sortedSteps[testStepIndex]?.step_type === 'button_choice' ? 'Select a choice above or type here...' : 'Type your reply...'} onkeydown={(e) => e.key === 'Enter' && submitTestInput()} style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg); color: var(--text);" />
						<button class="btn btn-primary btn-sm" onclick={submitTestInput}>Send</button>
					</div>
				</div>
				
				<!-- Live Variables Sidebar -->
				<div style="width: 240px; border-left: 1px solid var(--border); background: var(--surface); padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto;">
					<h4 style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 4px; letter-spacing: 0.5px;">Live Flow Variables</h4>
					<div style="display: flex; flex-direction: column; gap: 8px;">
						{#each sortedSteps.filter(s => s.input_variable) as step}
							<div style="background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 12px;">
								<div style="margin-bottom: 6px; margin-top: 2px;">
									<span style="font-family: monospace; color: var(--accent); background: var(--accent-bg); padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
										{step.input_variable}
									</span>
								</div>
								<div style="color: var(--text-tertiary); font-size: 10px; margin-bottom: 4px; font-style: italic;">From: {step.step_label || step.step_key}</div>
								<div style="font-weight: 500; color: var(--text); min-height: 16px; background: var(--surface); padding: 2px 6px; border-radius: 4px; word-break: break-all;">
									{testVariables[step.input_variable || ''] || '—'}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ── Add/Edit Step Modal ──────────────────────────────────────── -->
{#if showForm}
	<div class="modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) { showForm = false; editingStep = null; } }} role="presentation">
		<div class="modal" style="max-height: 90vh; overflow-y: auto;">
			<div class="modal-header">
				<h3>{editingStep ? 'Edit Step' : 'Add Step'}</h3>
				<button class="btn-icon" onclick={() => { showForm = false; editingStep = null }}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form onsubmit={e => { e.preventDefault(); addStep(); }}>
				<div class="form-grid">
					<div class="form-group">
						<label for="bf-key">Step Key</label>
						<input id="bf-key" type="text" bind:value={newStep.stepKey} placeholder="ask_name" required />
					</div>
					<div class="form-group">
						<label for="bf-label">Label</label>
						<input id="bf-label" type="text" bind:value={newStep.stepLabel} placeholder="Ask for Name" />
					</div>
				</div>
				<div class="form-grid">
					<div class="form-group">
						<label for="bf-type">Type</label>
						<select id="bf-type" bind:value={newStep.stepType}>
							<option value="text_input">Text Input</option>
							<option value="button_choice">Button Choice</option>
							<option value="auto">Auto (no input)</option>
							<option value="image">Image</option>
							<option value="carousel">Carousel</option>
						</select>
					</div>
					<div class="form-group">
						<label for="bf-var">Input Variable</label>
						<input id="bf-var" type="text" bind:value={newStep.inputVariable} placeholder="customer_name" />
					</div>
				</div>
				<div class="form-group">
					<label for="bf-msg">Prompt Message</label>
					<textarea id="bf-msg" bind:value={newStep.promptMessage} placeholder="What should the bot say?" rows="3"></textarea>
				</div>

				<!-- Image Upload (for image & carousel steps) -->
				{#if newStep.stepType === 'image'}
					<div class="form-group">
						<label>Step Image</label>
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="image-drop-zone"
							class:active={imageDropActive}
							ondragover={(e) => { e.preventDefault(); imageDropActive = true; }}
							ondragleave={() => imageDropActive = false}
							ondrop={handleImageDrop}
							onclick={() => imageFileInput?.click()}
						>
							{#if uploadingImage}
								<span class="spinner-sm"></span> Uploading...
							{:else if newStep.imageUrl}
								<img src={newStep.imageUrl} alt="Preview" class="image-preview-thumb" />
								<span class="image-drop-hint">Click or drag to replace</span>
							{:else}
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
								<span class="image-drop-hint">Drag & drop or click to upload<br /><small>PNG (auto-converted to JPEG) or JPEG</small></span>
							{/if}
						</div>
						<input type="file" accept="image/*" bind:this={imageFileInput} onchange={handleImageFileSelect} style="display:none" />
						{#if newStep.imageUrl}
							<div class="form-group" style="margin-top: 8px;">
								<label for="bf-img-url">Image URL</label>
								<input id="bf-img-url" type="text" bind:value={newStep.imageUrl} placeholder="https://..." />
							</div>
						{/if}
					</div>
				{/if}

				<!-- Carousel items -->
				{#if newStep.stepType === 'carousel'}
					<div class="form-group">
						<label>Carousel Items</label>
						{#each newStep.carouselItems as item, ci}
							<div class="carousel-item-editor">
								<div class="carousel-item-header">
									<span class="carousel-item-num">Card {ci + 1}</span>
									<button type="button" class="btn-icon danger" onclick={() => removeCarouselItem(ci)} aria-label="Remove card">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
									</button>
								</div>
								<div class="carousel-fields">
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="carousel-img-zone"
										ondragover={(e) => { e.preventDefault(); }}
										ondrop={async (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) await uploadCarouselImage(f, ci); }}
										onclick={() => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.onchange = async (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) await uploadCarouselImage(f, ci); }; fi.click(); }}
									>
										{#if item.imageUrl}
											<img src={item.imageUrl} alt="Card {ci + 1}" />
										{:else}
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
										{/if}
									</div>
									<div class="carousel-text-fields">
										<input type="text" bind:value={item.title} placeholder="Title" />
										<input type="text" bind:value={item.subtitle} placeholder="Subtitle" />
										<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;">
											<input type="text" bind:value={item.buttonLabel} placeholder="Button label" />
											<input type="text" bind:value={item.buttonNextStep} placeholder="Next step key" />
										</div>
									</div>
								</div>
							</div>
						{/each}
						<button type="button" class="btn btn-ghost btn-sm" onclick={addCarouselItem} style="margin-top: 8px;">+ Add Card</button>
					</div>
				{/if}

				{#if newStep.stepType === 'button_choice'}
					<div class="form-group">
						<label>Button Choices</label>
						{#each newStep.buttonChoices as choice, ci}
							<div class="choice-row">
								<input type="text" bind:value={choice.label} placeholder="Button label" />
								<input type="text" bind:value={choice.next_step} placeholder="Next step key" />
								<button type="button" class="btn-icon danger" onclick={() => removeButtonChoice(ci)} aria-label="Remove choice">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
								</button>
							</div>
						{/each}
						<button type="button" class="btn btn-ghost btn-sm" onclick={addButtonChoice}>+ Add Choice</button>
					</div>
				{/if}

				<div class="form-group">
					<label for="bf-next">Next Step Key</label>
					<input id="bf-next" type="text" bind:value={newStep.nextStep} placeholder="ask_scent (leave empty for end)" />
					<span class="form-hint">Leave empty to end the flow and create an order</span>
				</div>

				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => { showForm = false; editingStep = null }}>Cancel</button>
					<button type="submit" class="btn btn-primary">{editingStep ? 'Save Changes' : 'Add Step'}</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page { padding: 24px 32px; max-width: 900px; margin: 0 auto; }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }
	.step-count { font-size: 13px; color: var(--text-secondary); background: var(--surface-hover); padding: 2px 8px; border-radius: 10px; }
	.page-actions { display: flex; gap: 8px; }

	.empty-hero { text-align: center; padding: 64px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
	.empty-hero .empty-icon { font-size: 56px; margin-bottom: 16px; }
	.empty-hero h2 { font-size: 20px; margin-bottom: 8px; }
	.empty-hero p { color: var(--text-secondary); max-width: 400px; margin: 0 auto 20px; line-height: 1.5; }

	.flow-visualizer { display: flex; flex-direction: column; align-items: center; }
	.flow-connector-line { width: 2px; height: 20px; background: var(--border); }

	.flow-step {
		width: 100%; background: var(--surface); border: 1px solid var(--border);
		border-radius: 10px; padding: 16px 20px; display: flex; gap: 12px;
		align-items: flex-start; cursor: pointer;
		transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease;
	}
	.flow-step:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: var(--shadow-lg);
	}
	.flow-step:active { transform: translateY(0); }
	.flow-step.step-auto { border-left: 4px solid var(--cyan, #06b6d4); }
	.flow-step.step-button { border-left: 4px solid var(--warning, #f59e0b); }
	.flow-step.step-text { border-left: 4px solid var(--accent, #3b82f6); }
	.flow-step.step-image { border-left: 4px solid #a855f7; }
	.flow-step.step-carousel { border-left: 4px solid #ec4899; }

	.step-left { display: flex; flex-direction: column; gap: 2px; }
	.step-move { display: inline-flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 4px; border-radius: var(--radius-sm); transition: all 0.15s; }
	.step-move:hover:not(:disabled) { background: var(--surface-hover); color: var(--text); }
	.step-move:disabled { opacity: 0.2; cursor: default; }

	.step-number { width: 32px; height: 32px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; flex-shrink: 0; }
	.step-content { flex: 1; min-width: 0; }
	.step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px; }
	.step-label { font-weight: 600; font-size: 14px; }
	.step-badges { display: flex; gap: 6px; }
	.step-type-badge {
		padding: 2px 8px; border-radius: 4px; font-size: 11px;
		font-weight: 600; text-transform: capitalize; transition: all 0.15s ease;
	}
	.step-type-badge.badge-text_input { background: var(--accent-bg); color: var(--accent); }
	.step-type-badge.badge-auto { background: var(--cyan-bg); color: var(--cyan); }
	.step-type-badge.badge-button_choice { background: var(--warning-bg); color: var(--warning); }
	.step-type-badge.badge-image { background: rgba(168, 85, 247, 0.12); color: #a855f7; }
	.step-type-badge.badge-carousel { background: rgba(236, 72, 153, 0.12); color: #ec4899; }
	.step-var-badge { background: var(--accent-bg); color: var(--accent); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; }

	.step-preview { margin-bottom: 8px; }
	.preview-bubble { padding: 8px 12px; border-radius: 10px; font-size: 13px; max-width: 80%; line-height: 1.4; }
	.preview-bubble.bot {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%);
		border: 1px solid rgba(59, 130, 246, 0.25);
		color: var(--text);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		border-top-left-radius: 4px;
		padding: 10px 14px;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.step-image-preview { margin-bottom: 8px; }
	.step-image-preview img { max-height: 80px; border-radius: 6px; object-fit: cover; }
	.step-image-placeholder { display: flex; align-items: center; gap: 6px; color: var(--text-tertiary); font-size: 12px; padding: 6px 0; margin-bottom: 4px; }

	.step-carousel-preview { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
	.carousel-thumb { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 70px; }
	.carousel-thumb img { width: 70px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border); }
	.carousel-thumb-placeholder { width: 70px; height: 50px; border-radius: 6px; border: 1px dashed var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); }
	.carousel-thumb-title { font-size: 10px; color: var(--text-secondary); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
	.carousel-more { font-size: 11px; color: var(--text-tertiary); align-self: center; }

	.step-choices { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
	.choice-chip { padding: 4px 10px; border: 1px solid var(--border); border-radius: 16px; font-size: 12px; background: var(--bg); }

	.step-footer { display: flex; align-items: center; gap: 8px; }
	.step-next { font-size: 12px; color: var(--text-secondary); }
	.step-end { font-size: 12px; color: var(--green, #16a34a); font-weight: 500; }
	.step-actions { display: flex; gap: 4px; flex-shrink: 0; }

	/* Image upload zone */
	.image-drop-zone {
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
		border: 2px dashed var(--border); border-radius: 8px; padding: 20px;
		cursor: pointer; transition: all 0.2s; color: var(--text-tertiary); text-align: center;
		min-height: 100px;
	}
	.image-drop-zone:hover, .image-drop-zone.active {
		border-color: var(--accent); background: var(--accent-bg); color: var(--accent);
	}
	.image-drop-hint { font-size: 13px; }
	.image-drop-hint small { font-size: 11px; color: var(--text-tertiary); }
	.image-preview-thumb { max-height: 80px; border-radius: 6px; object-fit: cover; }

	/* Carousel item editor */
	.carousel-item-editor {
		border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 10px;
		background: var(--bg);
	}
	.carousel-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
	.carousel-item-num { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
	.carousel-fields { display: flex; gap: 10px; align-items: flex-start; }
	.carousel-img-zone {
		width: 80px; height: 80px; border: 2px dashed var(--border); border-radius: 8px; flex-shrink: 0;
		display: flex; align-items: center; justify-content: center; cursor: pointer;
		overflow: hidden; transition: border-color 0.15s; color: var(--text-tertiary);
	}
	.carousel-img-zone:hover { border-color: var(--accent); }
	.carousel-img-zone img { width: 100%; height: 100%; object-fit: cover; }
	.carousel-text-fields { flex: 1; display: flex; flex-direction: column; gap: 6px; }
	.carousel-text-fields input { width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; background: var(--surface); color: var(--text); font-family: var(--font); }
	.carousel-text-fields input:focus { outline: none; border-color: var(--accent); }

	/* Spinner */
	.spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(59,130,246,0.3); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Test mode */
	.modal-test { width: 500px; height: 600px; display: flex; flex-direction: column; }
	.test-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
	.test-log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
	.test-msg { max-width: 80%; }
	.test-bot { align-self: flex-start; }
	.test-user { align-self: flex-end; }
	.test-system { align-self: center; font-size: 12px; color: var(--text-tertiary); }
	.test-sender { font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 2px; }
	.test-text { padding: 8px 12px; border-radius: 10px; font-size: 13px; line-height: 1.4; }
	.test-bot .test-text { background: var(--accent); color: white; }
	.test-user .test-text { background: var(--surface); border: 1px solid var(--border); }
	.test-system .test-text { background: var(--surface-hover); color: var(--text-secondary); }
	.test-empty { text-align: center; padding: 20px; color: var(--text-tertiary); font-size: 13px; }
	.test-input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); }
	.test-input input { flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg); color: var(--text); }
	.test-input input:focus { outline: none; border-color: var(--accent); }

	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }

	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); color: var(--text); }
	.btn-sm { padding: 5px 12px; font-size: 13px; }
	.btn-icon {
		display: inline-flex; align-items: center; justify-content: center;
		background: none; border: none; cursor: pointer; padding: 6px;
		color: var(--text-secondary); flex-shrink: 0; border-radius: var(--radius-sm);
		transition: all 0.15s ease;
	}
	.btn-icon:hover { background: var(--surface-hover); color: var(--text); }
	.btn-icon.danger:hover { background: var(--red-bg); color: var(--red); }

	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 560px; max-width: 95vw; box-shadow: var(--shadow-lg); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
	.modal-header h3 { font-size: 16px; font-weight: 600; }

	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 20px; }
	.form-group { padding: 0 20px; margin-bottom: 12px; }
	.form-grid .form-group { padding: 0; }
	.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; }
	.form-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
	.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg); color: var(--text); font-family: var(--font); }
	.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--accent); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border); }

	.choice-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
	.choice-row input { flex: 1; }

	@media (max-width: 768px) {
		.page { padding: 16px; }
		.flow-step { flex-wrap: wrap; }
	}
</style>
