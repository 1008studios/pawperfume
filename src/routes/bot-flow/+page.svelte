<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { BotFlowStep } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let steps = $state<BotFlowStep[]>([]);
	let loading = $state(true);
	let selectedStepId = $state<number | null>(null);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);
	let editingStep = $state<BotFlowStep | null>(null);
	let showTemplates = $state(false);
	let showTestMode = $state(false);
	let testStepIndex = $state(0);
	let testInput = $state('');
	let testLog = $state<Array<{ type: 'bot' | 'user' | 'system'; text: string; imageUrl?: string }>>([]);
	let testVariables = $state<Record<string, string>>({});

	let draggedStepId = $state<number | null>(null);
	let dragOverStepId = $state<number | null>(null);
	let dragOverPosition = $state<'above' | 'below' | null>(null);

	let formStepKey = $state('');
	let formLabel = $state('');
	let formType = $state('text_input');
	let formMessage = $state('');
	let formNextStep = $state('');
	let formInputVar = $state('');
	let formSortOrder = $state(0);
	let formButtonChoices = $state<Array<{ label: string; next_step: string }>>([]);
	let formImageUrl = $state('');
	let formCarouselItems = $state<Array<{ title: string; subtitle: string; imageUrl: string; buttonLabel: string; buttonNextStep: string }>>([]);
	let formAiPrompt = $state('');
	let formAiContext = $state('general');
	let formAiModel = $state('');
	let formAiTemperature = $state(0.7);
	let formAiMaxTokens = $state(300);

	let uploadingImage = $state(false);
	let imageFileInput = $state<HTMLInputElement>();

	let undoStack = $state<string[]>([]);
	let redoStack = $state<string[]>([]);

	let hasUnsavedChanges = $state(false);
	let showNewStepForm = $state(false);
	let searchQuery = $state('');
	let showPhonePreview = $state(true);
	let previewFollowSelected = $state(false);

	function markDirty() { hasUnsavedChanges = true; }

	function snapshotForm(): string {
		return JSON.stringify({
			id: editingStep?.id, step_key: formStepKey, step_label: formLabel,
			step_type: formType, prompt_message: formMessage, next_step: formNextStep,
			input_variable: formInputVar, button_choices: formButtonChoices, sort_order: formSortOrder,
			image_url: formImageUrl, carousel_items: formCarouselItems,
			ai_prompt: formAiPrompt, ai_context: formAiContext, ai_model: formAiModel, ai_temperature: formAiTemperature, ai_max_tokens: formAiMaxTokens
		});
	}

	onMount(async () => {
		await loadSteps();
		window.addEventListener('keydown', handleGlobalKeys);
	});

	function handleGlobalKeys(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			if (editingStep || showNewStepForm) saveStep();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && editingStep) {
			e.preventDefault();
			undoForm();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'y' && editingStep) {
			e.preventDefault();
			redoForm();
		}
	}

	async function loadSteps() {
		loading = true;
		try { steps = await api.botFlow() as BotFlowStep[]; }
		catch { showToast('Could not load bot flow.', 'error'); }
		finally { loading = false; }
	}

	let sortedSteps = $derived([...steps].sort((a, b) => a.sort_order - b.sort_order));
	let stepMap = $derived(new Map(sortedSteps.map(s => [s.step_key, s])));
	let panelOpen = $derived(selectedStepId !== null || showNewStepForm || (sortedSteps.length === 0 && !loading));

	let filteredSteps = $derived(
		searchQuery ? sortedSteps.filter(s =>
			(s.step_label || '').toLowerCase().includes(searchQuery) ||
			s.step_key.toLowerCase().includes(searchQuery) ||
			(s.prompt_message || '').toLowerCase().includes(searchQuery)
		) : sortedSteps
	);

	let selectedStep = $derived(sortedSteps.find(s => s.id === selectedStepId) || null);

	let flowHealthWarnings = $derived(
		sortedSteps.filter(s => {
			if (!s.next_step) return false;
			return !stepMap.has(s.next_step);
		}).map(s => ({
			stepId: s.id,
			stepLabel: s.step_label || s.step_key,
			missingKey: s.next_step
		}))
	);

	let hasBranching = $derived(sortedSteps.some(s => s.step_type === 'button_choice' && (s.button_choices || []).length > 1));

	function getNextStepName(step: BotFlowStep): string {
		if (step.next_step) {
			const next = stepMap.get(step.next_step);
			return next?.step_label || step.next_step;
		}
		return '';
	}

	function getStepTypeLabel(t: string) {
		const labels: Record<string, string> = {
			text_input: 'Text Input',
			button_choice: 'Button Choice',
			auto: 'Auto',
			image: 'Image',
			carousel: 'Carousel',
			ai_decision: 'AI Decision'
		};
		return labels[t] || t;
	}

	function selectStep(step: BotFlowStep) {
		if (hasUnsavedChanges && (!editingStep || editingStep.id !== step.id)) {
			if (!confirm('You have unsaved changes. Discard them?')) return;
		}
		saveUndoSnapshot();
		selectedStepId = step.id;
		editingStep = step;
		formStepKey = step.step_key;
		formLabel = step.step_label || '';
		formType = step.step_type;
		formMessage = step.prompt_message || '';
		formNextStep = step.next_step || '';
		formInputVar = step.input_variable || '';
		formSortOrder = step.sort_order;
		formButtonChoices = step.button_choices ? [...step.button_choices] : [];
		formImageUrl = step.image_url || '';
		formCarouselItems = (step.carousel_items as any[]) ? [...(step.carousel_items as any[])] : [];
		formAiPrompt = (step as any).ai_prompt || '';
		formAiContext = (step as any).ai_context || 'general';
		formAiModel = (step as any).ai_model || '';
		formAiTemperature = (step as any).ai_temperature ?? 0.7;
		formAiMaxTokens = (step as any).ai_max_tokens ?? 300;
		hasUnsavedChanges = false;
	}

	function deselectStep() {
		if (hasUnsavedChanges) {
			if (!confirm('You have unsaved changes. Discard them?')) return;
		}
		selectedStepId = null;
		editingStep = null;
		showNewStepForm = false;
		hasUnsavedChanges = false;
		undoStack = [];
		redoStack = [];
	}

	function createNewStep() {
		if (hasUnsavedChanges) {
			if (!confirm('You have unsaved changes. Discard them?')) return;
		}
		saveUndoSnapshot();
		editingStep = null;
		selectedStepId = null;
		showNewStepForm = true;
		formStepKey = '';
		formLabel = '';
		formType = 'text_input';
		formMessage = '';
		formNextStep = '';
		formInputVar = '';
		formSortOrder = sortedSteps.length;
		formButtonChoices = [];
		formImageUrl = '';
		formCarouselItems = [];
		formAiPrompt = '';
		formAiContext = 'general';
		formAiModel = '';
		formAiTemperature = 0.7;
		formAiMaxTokens = 300;
		hasUnsavedChanges = false;
		undoStack = [];
		redoStack = [];
	}

	function saveUndoSnapshot() {
		if (!editingStep) return;
		undoStack = [...undoStack.slice(-20), snapshotForm()];
		redoStack = [];
	}

	function undoForm() {
		if (undoStack.length === 0) return;
		const last = JSON.parse(undoStack.pop()!);
		redoStack = [...redoStack, snapshotForm()];
		restoreFormState(last);
		markDirty();
	}

	function redoForm() {
		if (redoStack.length === 0) return;
		const next = JSON.parse(redoStack.pop()!);
		undoStack = [...undoStack, snapshotForm()];
		restoreFormState(next);
		markDirty();
	}

	function restoreFormState(state: any) {
		selectedStepId = state.id;
		formStepKey = state.step_key;
		formLabel = state.step_label;
		formType = state.step_type;
		formMessage = state.prompt_message;
		formNextStep = state.next_step;
		formInputVar = state.input_variable;
		formSortOrder = state.sort_order;
		formButtonChoices = state.button_choices || [];
		formImageUrl = state.image_url || '';
		formCarouselItems = state.carousel_items || [];
		formAiPrompt = state.ai_prompt || '';
		formAiContext = state.ai_context || 'general';
		formAiModel = state.ai_model || '';
		formAiTemperature = state.ai_temperature ?? 0.7;
		formAiMaxTokens = state.ai_max_tokens ?? 300;
	}

	function autoGenerateKey() {
		if (!formStepKey && formLabel) {
			formStepKey = formLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 40);
		}
	}

	async function saveStep() {
		autoGenerateKey();
		if (!formStepKey) { showToast('Step key is required.', 'error'); return; }

		const payload: Record<string, any> = {
			step_key: formStepKey,
			step_label: formLabel,
			step_type: formType,
			prompt_message: formMessage,
			next_step: formNextStep || null,
			input_variable: formInputVar || null,
			sort_order: formSortOrder,
			button_choices: formButtonChoices,
			image_url: formImageUrl,
			carousel_items: formCarouselItems,
			ai_prompt: formAiPrompt || null,
			ai_context: formAiContext,
			ai_model: formAiModel || null,
			ai_temperature: formAiTemperature,
			ai_max_tokens: formAiMaxTokens
		};

		try {
			if (editingStep) {
				await api.updateBotFlowStep(editingStep.id, payload);
				showToast('Step updated.', 'success');
				hasUnsavedChanges = false;
			} else {
				payload.sortOrder = sortedSteps.length;
				await api.createBotFlowStep(payload);
				showToast('Step added.', 'success');
				showNewStepForm = false;
				hasUnsavedChanges = false;
				undoStack = [];
				redoStack = [];
			}
			await loadSteps();
		} catch {
			showToast('Could not save step.', 'error');
		}
	}

	async function duplicateStep(step: BotFlowStep) {
		try {
			const dupKey = step.step_key + '_copy';
			await api.createBotFlowStep({
				step_key: dupKey,
				step_label: (step.step_label || step.step_key) + ' (Copy)',
				step_type: step.step_type,
				prompt_message: step.prompt_message,
				next_step: step.next_step,
				input_variable: step.input_variable,
				button_choices: step.button_choices,
				image_url: step.image_url,
				carousel_items: step.carousel_items,
				sortOrder: step.sort_order + 1
			});
			showToast('Step duplicated.', 'success');
			await loadSteps();
		} catch { showToast('Could not duplicate step.', 'error'); }
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteStep() {
		if (!deletingId) return;
		try {
			await api.deleteBotFlowStep(deletingId);
			if (selectedStepId === deletingId) deselectStep();
			showToast('Step deleted.', 'success');
			await loadSteps();
		} catch { showToast('Could not delete step.', 'error'); }
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
			await api.updateBotFlowStep(step.id, { sort_order: step.sort_order });
			await api.updateBotFlowStep(other.id, { sort_order: other.sort_order });
			await loadSteps();
		} catch { showToast('Could not reorder.', 'error'); }
	}

	function handleDragStart(e: DragEvent, id: number) {
		draggedStepId = id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(id));
		}
	}

	function handleDragOver(e: DragEvent, id: number) {
		e.preventDefault();
		dragOverStepId = id;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		dragOverPosition = y < rect.height / 2 ? 'above' : 'below';
	}

	async function handleStepDrop(e: DragEvent, targetId: number) {
		e.preventDefault();
		if (draggedStepId === null || draggedStepId === targetId) return;
		dragOverStepId = null;
		dragOverPosition = null;

		const draggedIdx = sortedSteps.findIndex(s => s.id === draggedStepId);
		const targetIdx = sortedSteps.findIndex(s => s.id === targetId);
		if (draggedIdx === -1 || targetIdx === -1) return;

		const newSteps = [...sortedSteps];
		const [draggedItem] = newSteps.splice(draggedIdx, 1);
		const insertAt = dragOverPosition === 'above' ? targetIdx : targetIdx + 1;
		newSteps.splice(insertAt > draggedIdx ? insertAt - 1 : insertAt, 0, draggedItem);

		const updates = newSteps.map((s, i) =>
			api.updateBotFlowStep(s.id, { sort_order: i })
		);
		try {
			await Promise.all(updates);
			await loadSteps();
		} catch { showToast('Failed to save order.', 'error'); }
	}

	function handleDragEnd() {
		draggedStepId = null;
		dragOverStepId = null;
		dragOverPosition = null;
	}

	function handleCardKeyDown(e: KeyboardEvent, step: BotFlowStep) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			selectStep(step);
		}
	}

	async function updateStepField(id: number, fields: Partial<BotFlowStep>) {
		try {
			await api.updateBotFlowStep(id, fields);
			await loadSteps();
		} catch {
			showToast('Failed to update.', 'error');
		}
	}

	// ── Image upload ────────────────────────────────────────
	async function uploadImage(file: File) {
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
			formImageUrl = data.url;
			showToast('Image uploaded.', 'success');
		} catch {
			showToast('Upload failed.', 'error');
		} finally { uploadingImage = false; }
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

	function handleImageDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/')) uploadImage(file);
	}

	// ── Carousel ─────────────────────────────────────────────
	function addCarouselItem() {
		formCarouselItems = [...formCarouselItems, { title: '', subtitle: '', imageUrl: '', buttonLabel: '', buttonNextStep: '' }];
	}
	function removeCarouselItem(i: number) {
		formCarouselItems = formCarouselItems.filter((_, idx) => idx !== i);
	}

	// ── Button choices ───────────────────────────────────────
	function addChoice() { formButtonChoices = [...formButtonChoices, { label: '', next_step: '' }]; }
	function removeChoice(i: number) { formButtonChoices = formButtonChoices.filter((_, idx) => idx !== i); }

	// ── Export / Templates ───────────────────────────────────
	function exportFlow() {
		const data = sortedSteps.map(s => ({
			step_key: s.step_key, step_label: s.step_label, step_type: s.step_type,
			prompt_message: s.prompt_message, next_step: s.next_step,
			input_variable: s.input_variable, button_choices: s.button_choices,
			image_url: s.image_url, carousel_items: s.carousel_items
		}));
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'bot-flow.json';
		a.click();
	}

	async function applyTemplate(templateSteps: any[]) {
		if (sortedSteps.length > 0) {
			if (!confirm('Loading a template will replace your current flow. Continue?')) return;
			for (const s of sortedSteps) {
				await api.deleteBotFlowStep(s.id);
			}
		}
		for (let i = 0; i < templateSteps.length; i++) {
			await api.createBotFlowStep({ ...templateSteps[i], sortOrder: i });
		}
		showToast('Template loaded.', 'success');
		showTemplates = false;
		await loadSteps();
	}

	const templates = [
		{
			name: 'Product Order Flow',
			desc: 'Name → Scent → Size → Address → Confirm',
			steps: [
				{ step_key: 'greet', step_label: 'Welcome', step_type: 'auto', prompt_message: 'Welcome to PawPerfume! Let me help you find your perfect scent.', next_step: 'ask_name' },
				{ step_key: 'ask_name', step_label: 'Ask Name', step_type: 'text_input', prompt_message: 'What is your name?', next_step: 'ask_scent', input_variable: 'customer_name' },
				{ step_key: 'ask_scent', step_label: 'Scent', step_type: 'button_choice', prompt_message: 'What type of scent?', next_step: 'ask_size', input_variable: 'scent_preference', button_choices: [{ label: 'Floral', next_step: 'ask_size' }, { label: 'Woody', next_step: 'ask_size' }, { label: 'Fresh', next_step: 'ask_size' }] },
				{ step_key: 'ask_size', step_label: 'Size', step_type: 'button_choice', prompt_message: 'Which size?', next_step: 'ask_address', input_variable: 'bottle_size', button_choices: [{ label: '30ml - ₱599', next_step: 'ask_address' }, { label: '50ml - ₱899', next_step: 'ask_address' }] },
				{ step_key: 'ask_address', step_label: 'Address', step_type: 'text_input', prompt_message: 'Delivery address?', next_step: 'confirm', input_variable: 'delivery_address' },
				{ step_key: 'confirm', step_label: 'Done', step_type: 'auto', prompt_message: 'Thank you! We will confirm your order shortly.' }
			]
		},
		{
			name: 'AI FAQ Bot',
			desc: 'Smart FAQ answering with AI fallback',
			steps: [
				{ step_key: 'intro', step_label: 'Greeting', step_type: 'auto', prompt_message: 'Hi! Ask me anything about our products, pricing, or delivery.', next_step: 'ai_faq' },
				{ step_key: 'ai_faq', step_label: 'AI FAQ', step_type: 'ai_decision', prompt_message: 'Let me check that for you...', next_step: 'intro', input_variable: 'faq_answer', ai_prompt: 'Search the FAQ database for the best answer.', ai_context: 'faq' }
			]
		},
		{
			name: 'Lead Capture',
			desc: 'Collect name, contact, and interest',
			steps: [
				{ step_key: 'greet_lead', step_label: 'Welcome', step_type: 'auto', prompt_message: 'Hi! Get a special offer — just answer a few questions.', next_step: 'ask_name' },
				{ step_key: 'ask_name', step_label: 'Name', step_type: 'text_input', prompt_message: 'Your name?', next_step: 'ask_contact', input_variable: 'customer_name' },
				{ step_key: 'ask_contact', step_label: 'Contact', step_type: 'text_input', prompt_message: 'Mobile number or email?', next_step: 'ask_interest', input_variable: 'contact_info' },
				{ step_key: 'ask_interest', step_label: 'Interest', step_type: 'button_choice', prompt_message: 'What interests you?', input_variable: 'interest', button_choices: [{ label: 'Floral', next_step: 'thanks' }, { label: 'Woody', next_step: 'thanks' }, { label: 'Gift Sets', next_step: 'thanks' }] },
				{ step_key: 'thanks', step_label: 'Done', step_type: 'auto', prompt_message: 'Got it! We will send you an offer soon.' }
			]
		}
	];

	// ── Test Mode (with real AI for ai_decision steps) ──────
	let aiTesting = $state(false);

	function startTest() { startTestFrom(0); }
	function startTestFrom(index: number) {
		if (index < 0 || index >= sortedSteps.length) return;
		testStepIndex = index;
		testInput = '';
		testLog = [];
		testVariables = {};
		aiTesting = false;
		showTestMode = true;
		const firstStep = sortedSteps[index];
		if (firstStep.prompt_message) {
			testLog.push({ type: 'bot', text: firstStep.prompt_message, imageUrl: firstStep.image_url || undefined });
		}
		if (firstStep.step_type === 'auto') {
			setTimeout(() => executeTestTransition(firstStep, ''), 800);
		}
	}

	async function executeTestTransition(currentStep: BotFlowStep, userInput: string) {
		if (currentStep.input_variable && userInput) {
			testVariables[currentStep.input_variable] = userInput;
		}
		let nextStepKey: string | null = null;

		if (currentStep.step_type === 'button_choice') {
			const choices = currentStep.button_choices || [];
			const match = choices.find(c => c.label.toLowerCase() === userInput.toLowerCase());
			nextStepKey = match ? match.next_step : currentStep.next_step;
		} else if (currentStep.step_type === 'ai_decision') {
			// Use real AI to classify and generate a persona-driven response
			aiTesting = true;
			testLog = [...testLog];
			try {
				const token = localStorage.getItem('pp_token') || '';
				const res = await fetch('/api/admin/test-bot', {
					method: 'POST',
					headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: userInput,
						systemPrompt: currentStep.ai_prompt || (currentStep as any).ai_prompt || 'You are a helpful assistant.',
						aiContext: (currentStep as any).ai_context || 'general',
						aiModel: (currentStep as any).ai_model || null,
						aiTemperature: (currentStep as any).ai_temperature ?? null
					})
				});
				const data = await res.json();
				if (data.reply) {
					testLog.push({ type: 'bot', text: data.reply });
					testLog = [...testLog];
				}
				nextStepKey = data.nextStep || currentStep.next_step;
			} catch (err) {
				console.error('AI test error:', err);
				nextStepKey = currentStep.next_step;
			} finally {
				aiTesting = false;
			}
		} else {
			nextStepKey = currentStep.next_step;
		}

		if (nextStepKey) {
			const nextIdx = sortedSteps.findIndex(s => s.step_key === nextStepKey);
			if (nextIdx >= 0) {
				testStepIndex = nextIdx;
				const nextStep = sortedSteps[nextIdx];
				setTimeout(() => {
					if (currentStep.step_type !== 'ai_decision' && nextStep.prompt_message) {
						testLog.push({ type: 'bot', text: nextStep.prompt_message, imageUrl: nextStep.image_url || undefined });
					}
					testLog = [...testLog];
					if (nextStep.step_type === 'auto') {
						setTimeout(() => executeTestTransition(nextStep, ''), 800);
					}
				}, 500);
			} else {
				testLog.push({ type: 'system', text: `Step "${nextStepKey}" not found.` });
				testLog = [...testLog];
			}
		} else {
			testLog.push({ type: 'system', text: 'Flow complete. An order would be created here.' });
			testLog = [...testLog];
		}
	}

	function submitTestInput() {
		const currentStep = sortedSteps[testStepIndex];
		if (!currentStep) return;
		const text = testInput.trim();
		if (!text) return;
		testLog.push({ type: 'user', text });
		testInput = '';
		testLog = [...testLog];
		executeTestTransition(currentStep, text);
	}

	function selectTestChoice(choice: { label: string; next_step: string }) {
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
						setTimeout(() => executeTestTransition(nextStep, ''), 800);
					}
				}, 500);
			} else {
				testLog.push({ type: 'system', text: `Step "${nextStepKey}" not found.` });
				testLog = [...testLog];
			}
		} else {
			testLog.push({ type: 'system', text: 'Flow complete.' });
			testLog = [...testLog];
		}
	}
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete Step?"
	message="This permanently removes the step from your flow."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteStep}
/>

<div class="page">
	<header class="page-header">
		<div class="header-left">
			<h1>Bot Flow</h1>
			<span class="step-badge">{sortedSteps.length} steps</span>
			{#if flowHealthWarnings.length > 0}
				<span class="health-warning" title="Broken step references detected">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
					{flowHealthWarnings.length}
				</span>
			{/if}
		</div>
		<div class="header-actions">
			{#if sortedSteps.length > 0}
				<button class="btn btn-ghost" onclick={startTest}>Test</button>
				<button class="btn btn-ghost" onclick={exportFlow}>Export</button>
			{/if}
			<button class="btn btn-ghost" onclick={() => showTemplates = !showTemplates}>Templates</button>
			<button class="btn btn-primary" onclick={createNewStep}>+ Add Step</button>
		</div>
	</header>

	{#if showTemplates}
		<div class="templates-panel">
			<h3>Flow Templates</h3>
			{#each templates as tmpl}
				<button class="template-card" onclick={() => applyTemplate(tmpl.steps)}>
					<span class="template-name">{tmpl.name}</span>
					<span class="template-desc">{tmpl.desc}</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="flow-layout">
		<!-- Flow Canvas -->
		<div class="flow-canvas">
			{#if loading}
				<div class="flow-list">
					{#each Array(3) as _, i}
						<div class="flow-card skeleton">
							<div class="card-grip"><Skeleton width="16px" height="16px" /></div>
							<div class="card-body"><Skeleton width="60%" height="18px" /><Skeleton width="100%" height="36px" borderRadius="8px" /></div>
						</div>
					{/each}
				</div>
			{:else if sortedSteps.length === 0}
				<EmptyState
					title="Build Your Bot Flow"
					description="Create a step-by-step conversation that guides customers through ordering. Use templates to get started quickly."
					iconType="automation"
					actionText="Create First Step"
					onAction={createNewStep}
				/>
			{:else}
				<div class="flow-list">
					{#each sortedSteps as step, i}
						<div
							class="flow-card"
							class:selected={selectedStepId === step.id}
							class:has-warning={flowHealthWarnings.some(w => w.stepId === step.id)}
							class:dragging={draggedStepId === step.id}
							class:drag-over-above={dragOverStepId === step.id && dragOverPosition === 'above'}
							class:drag-over-below={dragOverStepId === step.id && dragOverPosition === 'below'}
							class:step-auto={step.step_type === 'auto'}
							class:step-button={step.step_type === 'button_choice'}
							class:step-text={step.step_type === 'text_input'}
							class:step-image={step.step_type === 'image'}
							class:step-carousel={step.step_type === 'carousel'}
							class:step-ai={step.step_type === 'ai_decision'}
							draggable="true"
							ondragstart={(e) => handleDragStart(e, step.id)}
							ondragover={(e) => handleDragOver(e, step.id)}
							ondragend={handleDragEnd}
							ondrop={(e) => handleStepDrop(e, step.id)}
							onclick={() => selectStep(step)}
							onkeydown={(e) => handleCardKeyDown(e, step)}
							tabindex="0"
							role="button"
						>
							<div class="card-grip" title="Drag to reorder">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
							</div>
							<div class="card-number">{i + 1}</div>
							<div class="card-body">
								<div class="card-header">
									<span class="card-label">{step.step_label || step.step_key}</span>
									<div class="card-badges">
										<span class="type-badge badge-{step.step_type}">{getStepTypeLabel(step.step_type)}</span>
										{#if step.input_variable}
											<span class="var-badge">{step.input_variable}</span>
										{/if}
									</div>
								</div>
								{#if step.prompt_message}
									<div class="card-preview">{step.prompt_message}</div>
								{/if}
								<div class="card-footer">
									{#if getNextStepName(step)}
										<span class="card-next">→ {getNextStepName(step)}</span>
									{:else}
										<span class="card-end">End (create order)</span>
									{/if}
									{#if flowHealthWarnings.some(w => w.stepId === step.id)}
										<span class="card-warning">Missing: {step.next_step}</span>
									{/if}
								</div>
							</div>
							<div class="card-actions">
								<button class="btn-icon" onclick={(e) => { e.stopPropagation(); startTestFrom(i); }} title="Test from here">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
								</button>
								<button class="btn-icon" onclick={(e) => { e.stopPropagation(); selectStep(step); }} title="Edit">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
								</button>
								<button class="btn-icon" onclick={(e) => { e.stopPropagation(); duplicateStep(step); }} title="Duplicate">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
								</button>
								<button class="btn-icon danger" onclick={(e) => { e.stopPropagation(); promptDelete(step.id); }} title="Delete">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
								</button>
							</div>
						</div>
						{#if step.step_type === 'button_choice' && (step.button_choices || []).length > 0}
							<div class="branch-lines">
								{#each (step.button_choices || []) as choice}
									<div class="branch-line">
										<span class="branch-label">{choice.label || '?'}</span>
										<span class="branch-arrow">→ {choice.next_step ? (stepMap.get(choice.next_step)?.step_label || choice.next_step) : 'end'}</span>
									</div>
								{/each}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- Side Panel Editor -->
		<div class="side-panel" class:open={panelOpen}>
			<div class="panel-header">
				<h3>{editingStep ? 'Edit Step' : 'New Step'}</h3>
				<div class="panel-header-actions">
					{#if editingStep}
						<button class="btn-icon" onclick={undoForm} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">↩</button>
						<button class="btn-icon" onclick={redoForm} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)">↪</button>
					{/if}
					<button class="btn-icon" onclick={deselectStep} title="Close">×</button>
				</div>
			</div>
			<div class="panel-body">
				<form onsubmit={(e) => { e.preventDefault(); saveStep(); }}>
					<div class="form-row">
						<div class="form-group" style="flex:1">
							<label for="bf-label">Label</label>
							<input id="bf-label" type="text" bind:value={formLabel} placeholder="Ask for Name" onblur={autoGenerateKey} />
						</div>
						<div class="form-group" style="flex:1">
							<label for="bf-key">Key <span class="form-hint">auto</span></label>
							<input id="bf-key" type="text" bind:value={formStepKey} placeholder="ask_name" />
						</div>
					</div>
					<div class="form-row">
						<div class="form-group" style="flex:1">
							<label for="bf-type">Type</label>
							<select id="bf-type" bind:value={formType}>
								<option value="text_input">Text Input</option>
								<option value="button_choice">Button Choice</option>
								<option value="auto">Auto (no input)</option>
								<option value="image">Image</option>
								<option value="carousel">Carousel</option>
								<option value="ai_decision">AI Decision</option>
							</select>
						</div>
						<div class="form-group" style="flex:1">
							<label for="bf-var">Variable</label>
							<input id="bf-var" type="text" bind:value={formInputVar} placeholder="customer_name" />
						</div>
					</div>
					<div class="form-group">
						<label for="bf-msg">Bot Message</label>
						<textarea id="bf-msg" bind:value={formMessage} placeholder="What should the bot say at this step?" rows="2"></textarea>
					</div>

					<!-- AI Decision fields -->
					{#if formType === 'ai_decision'}
						<div class="form-group">
							<label for="bf-ai-prompt">AI Prompt</label>
							<textarea id="bf-ai-prompt" bind:value={formAiPrompt} placeholder="Instructions for the AI router..." rows="2"></textarea>
						</div>
						<div class="form-row">
							<div class="form-group" style="flex:1">
								<label for="bf-ai-ctx">AI Context</label>
								<select id="bf-ai-ctx" bind:value={formAiContext}>
									<option value="general">General Router</option>
									<option value="faq">FAQ Search (RAG)</option>
									<option value="order">Order Help</option>
								</select>
							</div>
							<div class="form-group" style="flex:1">
								<label for="bf-ai-model">Model <span class="form-hint">optional</span></label>
								<select id="bf-ai-model" bind:value={formAiModel}>
									<option value="">— Use default —</option>
									<option value="deepseek/deepseek-chat">DeepSeek Chat</option>
									<option value="openai/gpt-4o-mini">GPT-4o Mini</option>
									<option value="openai/gpt-4o">GPT-4o</option>
									<option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
									<option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
									<option value="meta-llama/llama-4-maverick">Llama 4 Maverick</option>
								</select>
							</div>
						</div>
						<div class="form-row">
							<div class="form-group" style="flex:1">
								<label for="bf-ai-temp">Temperature: {formAiTemperature}</label>
								<input id="bf-ai-temp" type="range" min="0" max="1" step="0.05" bind:value={formAiTemperature} />
							</div>
							<div class="form-group" style="flex:1">
								<label for="bf-ai-max">Max Tokens</label>
								<select id="bf-ai-max" bind:value={formAiMaxTokens}>
									<option value={100}>Short (100)</option>
									<option value={300}>Medium (300)</option>
									<option value={500}>Long (500)</option>
								</select>
							</div>
						</div>
					{/if}

					<!-- Image upload -->
					{#if formType === 'image'}
						<div class="form-group">
							<span class="form-label">Image</span>
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="image-drop" class:has-image={formImageUrl} ondragover={(e) => e.preventDefault()} ondrop={handleImageDrop} onclick={() => imageFileInput?.click()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && imageFileInput?.click()} role="button" tabindex="0">
								{#if uploadingImage}
									<span class="spinner-sm"></span> Uploading...
								{:else if formImageUrl}
									<img src={formImageUrl} alt="Preview" />
									<span class="drop-hint">Click to replace</span>
								{:else}
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
									<span class="drop-hint">Drop image or click to upload</span>
								{/if}
							</div>
							<input type="file" accept="image/*" bind:this={imageFileInput} onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadImage(f); }} style="display:none" />
						</div>
					{/if}

					<!-- Carousel -->
					{#if formType === 'carousel'}
						<div class="form-group">
							<span class="form-label">Carousel Cards</span>
							{#each formCarouselItems as item, ci}
								<div class="carousel-card-editor">
									<div class="carousel-card-header">
										<span>Card {ci + 1}</span>
										<button type="button" class="btn-icon danger" onclick={() => removeCarouselItem(ci)}>×</button>
									</div>
									<input type="text" bind:value={item.title} placeholder="Title" />
									<input type="text" bind:value={item.subtitle} placeholder="Subtitle" />
									<input type="text" bind:value={item.buttonLabel} placeholder="Button label" />
									<input type="text" bind:value={item.buttonNextStep} placeholder="Next step key" />
								</div>
							{/each}
							<button type="button" class="btn btn-ghost btn-sm" onclick={addCarouselItem}>+ Add Card</button>
						</div>
					{/if}

					<!-- Button Choices -->
					{#if formType === 'button_choice'}
						<div class="form-group">
							<span class="form-label">Button Choices</span>
							{#each formButtonChoices as choice, ci}
								<div class="choice-row">
									<input type="text" bind:value={choice.label} placeholder="Button text" />
									<select bind:value={choice.next_step} style="flex:1">
										<option value="">— end —</option>
										{#each sortedSteps.filter(s => editingStep ? s.id !== editingStep.id : true) as s}
											<option value={s.step_key}>{s.step_label || s.step_key}</option>
										{/each}
									</select>
									<button type="button" class="btn-icon danger" onclick={() => removeChoice(ci)}>×</button>
								</div>
							{/each}
							<button type="button" class="btn btn-ghost btn-sm" onclick={addChoice}>+ Add Choice</button>
						</div>
					{/if}

					<div class="form-group">
						<label for="bf-next">Next Step</label>
						<select id="bf-next" bind:value={formNextStep}>
							<option value="">— End of flow (create order) —</option>
							{#each sortedSteps.filter(s => editingStep ? s.id !== editingStep.id : true) as s}
								<option value={s.step_key}>{s.step_label || s.step_key}</option>
							{/each}
						</select>
					</div>

					<div class="form-actions">
						<button type="button" class="btn btn-ghost" onclick={deselectStep}>Cancel</button>
						<button type="submit" class="btn btn-primary">{editingStep ? 'Save Changes' : 'Create Step'}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Phone Preview -->
		{#if sortedSteps.length > 0}
			<div class="phone-preview">
				<div class="phone-frame">
					<div class="phone-header">
						<span class="phone-title">PawPerfume Bot</span>
					</div>
					<div class="phone-chat">
						{#each sortedSteps.slice(0, 6) as step}
							<div class="phone-msg bot">
								<div class="phone-bubble">{step.prompt_message || '(no message)'}</div>
							</div>
							{#if step.step_type === 'button_choice' && (step.button_choices || []).length > 0}
								<div class="phone-msg bot">
									<div class="phone-choices">
										{#each (step.button_choices || []).slice(0, 3) as choice}
											<span class="phone-choice">{choice.label || '?'}</span>
										{/each}
									</div>
								</div>
							{/if}
						{/each}
						<div class="phone-msg bot">
							<div class="phone-typing"><span></span><span></span><span></span></div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Test Mode Modal -->
{#if showTestMode}
	<div class="modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) showTestMode = false; }} role="presentation">
		<div class="modal test-modal">
			<div class="modal-header">
				<h3>Test Flow</h3>
				<button class="btn-icon" onclick={() => showTestMode = false}>×</button>
			</div>
			<div class="test-body">
				<div class="test-chat">
					{#each testLog as entry}
						<div class="test-msg test-{entry.type}">
							{#if entry.type !== 'system'}<span class="test-sender">{entry.type === 'bot' ? 'Bot' : 'You'}</span>{/if}
							<div class="test-bubble">{entry.text}</div>
						</div>
					{/each}
				</div>
				<div class="test-vars">
					<h4>Variables</h4>
					{#each Object.entries(testVariables) as [key, val]}
						<div class="test-var"><code>{key}</code> = {val}</div>
					{/each}
				</div>
			</div>
			{#if sortedSteps[testStepIndex]?.step_type === 'button_choice'}
				<div class="test-choices">
					{#each sortedSteps[testStepIndex].button_choices || [] as choice}
						<button class="btn btn-sm" onclick={() => selectTestChoice(choice)}>{choice.label}</button>
					{/each}
				</div>
			{/if}
			<div class="test-input-row">
				<input type="text" bind:value={testInput} placeholder="Type a response..." onkeydown={(e) => e.key === 'Enter' && submitTestInput()} />
				<button class="btn btn-primary btn-sm" onclick={submitTestInput}>Send</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page { display: flex; flex-direction: column; height: 100%; }
	.page-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
	.header-left { display: flex; align-items: center; gap: 10px; }
	.header-left h1 { font-size: 20px; font-weight: 700; }
	.step-badge { font-size: 12px; color: var(--text-secondary); background: var(--surface-hover); padding: 2px 10px; border-radius: 10px; }
	.health-warning { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 10px; background: var(--warning-bg); color: var(--warning); font-size: 12px; font-weight: 600; }
	.header-actions { display: flex; gap: 6px; }

	.templates-panel { padding: 16px 24px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
	.templates-panel h3 { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-right: 8px; }
	.template-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; cursor: pointer; text-align: left; transition: all 0.15s; display: flex; flex-direction: column; gap: 2px; min-width: 180px; }
	.template-card:hover { border-color: var(--accent); background: var(--accent-bg); }
	.template-name { font-weight: 600; font-size: 13px; }
	.template-desc { font-size: 11px; color: var(--text-secondary); }

	.flow-layout { display: flex; flex: 1; overflow: hidden; }
	.flow-canvas { flex: 1; overflow-y: auto; padding: 20px; min-width: 0; }
	.flow-list { display: flex; flex-direction: column; gap: 2px; max-width: 600px; }

	.flow-card { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); cursor: pointer; transition: all 0.18s cubic-bezier(0.16,1,0.3,1); position: relative; border-left-width: 4px; border-left-color: var(--border); }
	.flow-card:hover { transform: translateX(2px); border-color: var(--accent); box-shadow: var(--shadow); }
	.flow-card.selected { border-color: var(--accent); background: var(--accent-bg); box-shadow: var(--shadow); }
	.flow-card.has-warning { border-left-color: var(--warning); }
	.flow-card.dragging { opacity: 0.35; }
	.flow-card.drag-over-above { border-top: 2px solid var(--accent); border-top-left-radius: 0; border-top-right-radius: 0; }
	.flow-card.drag-over-below { border-bottom: 2px solid var(--accent); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
	.flow-card.step-auto { border-left-color: #06b6d4; }
	.flow-card.step-button { border-left-color: #f59e0b; }
	.flow-card.step-text { border-left-color: var(--accent); }
	.flow-card.step-image { border-left-color: #a855f7; }
	.flow-card.step-carousel { border-left-color: #ec4899; }
	.flow-card.step-ai { border-left-color: #10b981; }

	.card-grip { display: flex; align-items: center; padding-top: 2px; color: var(--text-tertiary); cursor: grab; flex-shrink: 0; }
	.card-grip:active { cursor: grabbing; }
	.card-number { width: 24px; height: 24px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
	.card-body { flex: 1; min-width: 0; }
	.card-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
	.card-label { font-weight: 600; font-size: 14px; }
	.card-badges { display: flex; gap: 4px; }
	.type-badge { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
	.badge-text_input { background: var(--accent-bg); color: var(--accent); }
	.badge-button_choice { background: var(--warning-bg); color: var(--warning); }
	.badge-auto { background: var(--cyan-bg); color: var(--cyan); }
	.badge-image { background: rgba(168,85,247,0.12); color: #a855f7; }
	.badge-carousel { background: rgba(236,72,153,0.12); color: #ec4899; }
	.badge-ai_decision { background: var(--green-bg); color: var(--green); }
	.var-badge { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; background: var(--surface-hover); color: var(--text-secondary); font-family: monospace; }
	.card-preview { font-size: 13px; color: var(--text-secondary); margin: 6px 0; padding: 8px 10px; background: var(--bg); border-radius: 6px; line-height: 1.4; }
	.card-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px; }
	.card-next { font-size: 11px; color: var(--text-secondary); }
	.card-end { font-size: 11px; color: var(--green); font-weight: 500; }
	.card-warning { font-size: 10px; color: var(--warning); background: var(--warning-bg); padding: 1px 6px; border-radius: 4px; }
	.card-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
	.flow-card:hover .card-actions { opacity: 1; }

	.branch-lines { padding: 0 0 0 52px; display: flex; flex-direction: column; gap: 2px; }
	.branch-line { display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 4px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; border-left: 2px solid var(--warning); }
	.branch-label { font-weight: 600; color: var(--text); }
	.branch-arrow { color: var(--text-secondary); }

	/* Side Panel */
	.side-panel { width: 0; overflow: hidden; border-left: 1px solid var(--border); background: var(--surface); transition: width 0.25s cubic-bezier(0.4,0,0.2,1); flex-shrink: 0; display: flex; flex-direction: column; }
	.side-panel.open { width: 380px; }
	.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border); }
	.panel-header h3 { font-size: 15px; font-weight: 600; }
	.panel-header-actions { display: flex; gap: 4px; }
	.panel-body { flex: 1; overflow-y: auto; padding: 18px; }
	.form-row { display: flex; gap: 10px; }
	.form-group { margin-bottom: 14px; }
	.form-group label, .form-group .form-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
	.form-hint { text-transform: none; font-weight: 400; color: var(--text-tertiary); font-size: 10px; }
	.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; background: var(--bg); color: var(--text); font-family: var(--font); box-sizing: border-box; }
	.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
	.form-actions button { min-width: 100px; }

	.image-drop { border: 2px dashed var(--border); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-tertiary); font-size: 12px; }
	.image-drop:hover { border-color: var(--accent); background: var(--accent-bg); }
	.image-drop.has-image { padding: 8px; }
	.image-drop img { max-height: 80px; border-radius: 6px; }
	.drop-hint { font-size: 11px; }
	.spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(124,58,237,0.3); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.carousel-card-editor { border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-bottom: 8px; background: var(--bg); }
	.carousel-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px; font-weight: 600; }
	.carousel-card-editor input { margin-bottom: 6px; width: 100%; padding: 5px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px; background: var(--surface); color: var(--text); font-family: var(--font); }
	.carousel-card-editor input:last-child { margin-bottom: 0; }
	.choice-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
	.choice-row input, .choice-row select { flex: 1; padding: 6px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px; background: var(--bg); color: var(--text); }

	/* Phone Preview */
	.phone-preview { width: 300px; flex-shrink: 0; overflow-y: auto; padding: 20px; display: flex; justify-content: center; background: var(--bg); border-left: 1px solid var(--border); }
	.phone-frame { width: 260px; background: var(--surface); border: 2px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-lg); }
	.phone-header { padding: 10px 14px; background: var(--accent); color: white; text-align: center; font-size: 12px; font-weight: 600; }
	.phone-chat { padding: 10px; display: flex; flex-direction: column; gap: 8px; min-height: 300px; background: var(--bg); }
	.phone-msg { display: flex; }
	.phone-msg.bot { justify-content: flex-start; }
	.phone-bubble { padding: 6px 10px; border-radius: 12px 12px 12px 4px; font-size: 11px; background: var(--surface); border: 1px solid var(--border); color: var(--text); max-width: 85%; line-height: 1.4; }
	.phone-choices { display: flex; flex-wrap: wrap; gap: 4px; max-width: 85%; }
	.phone-choice { padding: 4px 8px; border: 1px solid var(--accent); border-radius: 12px; font-size: 10px; color: var(--accent); background: var(--accent-bg); }
	.phone-typing { display: flex; gap: 3px; padding: 8px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px 12px 12px 4px; }
	.phone-typing span { width: 5px; height: 5px; background: var(--text-tertiary); border-radius: 50%; animation: phoneTyping 1.4s infinite ease-in-out; }
	.phone-typing span:nth-child(2) { animation-delay: 0.2s; }
	.phone-typing span:nth-child(3) { animation-delay: 0.4s; }
	@keyframes phoneTyping { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }

	/* Test Modal */
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; width: 700px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column; box-shadow: var(--shadow-xl); }
	.test-modal { width: 500px; height: 550px; }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border); }
	.modal-header h3 { font-size: 16px; font-weight: 600; }
	.test-body { flex: 1; display: flex; overflow: hidden; }
	.test-chat { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
	.test-msg { max-width: 85%; }
	.test-bot { align-self: flex-start; }
	.test-user { align-self: flex-end; }
	.test-system { align-self: center; }
	.test-sender { font-size: 10px; font-weight: 600; color: var(--text-tertiary); display: block; margin-bottom: 2px; }
	.test-bubble { padding: 7px 11px; border-radius: 10px; font-size: 12px; line-height: 1.4; }
	.test-bot .test-bubble { background: var(--accent); color: white; }
	.test-user .test-bubble { background: var(--surface); border: 1px solid var(--border); }
	.test-system .test-bubble { background: var(--surface-hover); color: var(--text-secondary); font-size: 11px; }
	.test-vars { width: 200px; border-left: 1px solid var(--border); padding: 14px; overflow-y: auto; }
	.test-vars h4 { font-size: 10px; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 8px; }
	.test-var { font-size: 11px; padding: 4px 0; border-bottom: 1px solid var(--border); }
	.test-var code { color: var(--accent); font-size: 10px; }
	.test-choices { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--border); flex-wrap: wrap; }
	.test-input-row { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border); }
	.test-input-row input { flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg); color: var(--text); }
	.test-input-row input:focus { outline: none; border-color: var(--accent); }

	.btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: var(--font); }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); color: var(--text); }
	.btn-sm { padding: 4px 10px; font-size: 12px; }
	.btn-icon { display: inline-flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 5px; color: var(--text-secondary); border-radius: var(--radius-sm); transition: all 0.15s; font-size: 16px; min-width: 30px; min-height: 30px; }
	.btn-icon:hover { background: var(--surface-hover); color: var(--text); }
	.btn-icon.danger:hover { background: var(--red-bg); color: var(--red); }
	.btn-icon:disabled { opacity: 0.3; cursor: default; }

	@media (max-width: 1200px) {
		.phone-preview { display: none; }
		.side-panel.open { width: 340px; }
	}
	@media (max-width: 768px) {
		.page-header { flex-wrap: wrap; gap: 10px; padding: 12px 16px; }
		.header-actions { width: 100%; justify-content: flex-end; }
		.flow-layout { flex-direction: column; }
		.side-panel { width: 0; border-left: none; border-top: 1px solid var(--border); transition: none; }
		.side-panel.open { width: 100%; max-height: 60vh; }
		.flow-canvas { padding: 12px; }
	}
</style>
