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
	let showPhonePreview = $state(false);
	let showAdvanced = $state(false);

	// Test mode state
	let testStepIndex = $state(0);
	let testInput = $state('');
	let testLog = $state<Array<{ type: 'bot' | 'user' | 'system'; text: string; imageUrl?: string }>>([]);
	let testVariables = $state<Record<string, string>>({});
	let aiTesting = $state(false);

	// Drag state
	let draggedStepId = $state<number | null>(null);
	let dragOverStepId = $state<number | null>(null);
	let dragOverPosition = $state<'above' | 'below' | null>(null);

	// Form state
	let f_key = $state('');
	let f_label = $state('');
	let f_type = $state('text_input');
	let f_msg = $state('');
	let f_next = $state('');
	let f_var = $state('');
	let f_choices = $state<Array<{ label: string; next_step: string }>>([]);
	let f_img = $state('');
	let f_carousel = $state<Array<{ title: string; subtitle: string; imageUrl: string; buttonLabel: string; buttonNextStep: string }>>([]);
	let f_ai_prompt = $state('');
	let f_ai_ctx = $state('general');
	let f_ai_model = $state('');
	let f_ai_temp = $state(0.7);
	let f_ai_tokens = $state(300);

	let uploadingImage = $state(false);
	let imageFileInput = $state<HTMLInputElement>();
	let hasUnsavedChanges = $state(false);
	let showNewStepForm = $state(false);
	let searchQuery = $state('');

	function markDirty() { hasUnsavedChanges = true; }

	onMount(async () => {
		await loadSteps();
		window.addEventListener('keydown', (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (editingStep || showNewStepForm) saveStep(); }
		});
	});

	async function loadSteps() {
		loading = true;
		try { steps = await api.botFlow() as BotFlowStep[]; }
		catch { showToast('Could not load bot flow.', 'error'); }
		finally { loading = false; }
	}

	let sortedSteps = $derived([...steps].sort((a, b) => a.sort_order - b.sort_order));
	let stepMap = $derived(new Map(sortedSteps.map(s => [s.step_key, s])));
	let panelOpen = $derived(selectedStepId !== null || showNewStepForm || (sortedSteps.length === 0 && !loading));

	let flowWarnings = $derived(
		sortedSteps.filter(s => s.next_step && !stepMap.has(s.next_step)).map(s => ({
			id: s.id, label: s.step_label || s.step_key, missing: s.next_step
		}))
	);

	function nextStepName(s: BotFlowStep) { return s.next_step ? (stepMap.get(s.next_step)?.step_label || s.next_step) : ''; }
	function typeLabel(t: string) { return { text_input:'Text', button_choice:'Buttons', auto:'Auto', image:'Image', carousel:'Carousel', ai_decision:'AI' }[t] || t; }

	function selectStep(step: BotFlowStep) {
		if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard?')) return;
		selectedStepId = step.id; editingStep = step;
		f_key = step.step_key; f_label = step.step_label || ''; f_type = step.step_type;
		f_msg = step.prompt_message || ''; f_next = step.next_step || ''; f_var = step.input_variable || '';
		f_choices = step.button_choices ? [...step.button_choices] : [];
		f_img = step.image_url || ''; f_carousel = (step.carousel_items as any[]) ? [...(step.carousel_items as any[])] : [];
		f_ai_prompt = (step as any).ai_prompt || ''; f_ai_ctx = (step as any).ai_context || 'general';
		f_ai_model = (step as any).ai_model || ''; f_ai_temp = (step as any).ai_temperature ?? 0.7;
		f_ai_tokens = (step as any).ai_max_tokens ?? 300;
		hasUnsavedChanges = false;
	}

	function closePanel() {
		if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard?')) return;
		selectedStepId = null; editingStep = null; showNewStepForm = false; hasUnsavedChanges = false;
	}

	function newStep() {
		if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard?')) return;
		editingStep = null; selectedStepId = null; showNewStepForm = true;
		f_key = ''; f_label = ''; f_type = 'text_input'; f_msg = ''; f_next = ''; f_var = '';
		f_choices = []; f_img = ''; f_carousel = [];
		f_ai_prompt = ''; f_ai_ctx = 'general'; f_ai_model = ''; f_ai_temp = 0.7; f_ai_tokens = 300;
		hasUnsavedChanges = false;
	}

	function autoKey() { if (!f_key && f_label) { f_key = f_label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').substring(0,40); } }

	async function saveStep() {
		autoKey(); if (!f_key) { showToast('Step key is required.', 'error'); return; }
		const p: any = { step_key: f_key, step_label: f_label, step_type: f_type, prompt_message: f_msg, next_step: f_next || null, input_variable: f_var || null, sort_order: editingStep ? editingStep.sort_order : sortedSteps.length, button_choices: f_choices, image_url: f_img, carousel_items: f_carousel, ai_prompt: f_ai_prompt || null, ai_context: f_ai_ctx, ai_model: f_ai_model || null, ai_temperature: f_ai_temp, ai_max_tokens: f_ai_tokens };
		try {
			if (editingStep) { await api.updateBotFlowStep(editingStep.id, p); showToast('Step updated.', 'success'); }
			else { await api.createBotFlowStep(p); showToast('Step added.', 'success'); showNewStepForm = false; }
			hasUnsavedChanges = false; await loadSteps();
		} catch { showToast('Could not save step.', 'error'); }
	}

	async function duplicateStep(step: BotFlowStep) {
		try {
			await api.createBotFlowStep({ step_key: step.step_key + '_copy', step_label: (step.step_label || step.step_key) + ' (Copy)', step_type: step.step_type, prompt_message: step.prompt_message, next_step: step.next_step, input_variable: step.input_variable, button_choices: step.button_choices, image_url: step.image_url, carousel_items: step.carousel_items, sortOrder: step.sort_order + 1 });
			showToast('Duplicated.', 'success'); await loadSteps();
		} catch { showToast('Could not duplicate.', 'error'); }
	}

	function promptDelete(id: number) { deletingId = id; showDeleteConfirm = true; }

	async function confirmDeleteStep() {
		if (!deletingId) return;
		try { await api.deleteBotFlowStep(deletingId); if (selectedStepId === deletingId) closePanel(); showToast('Deleted.', 'success'); await loadSteps(); }
		catch { showToast('Could not delete.', 'error'); }
		finally { showDeleteConfirm = false; deletingId = null; }
	}

	// ── Drag & Drop ────────────────────────────────────────
	function dragStart(e: DragEvent, id: number) { draggedStepId = id; e.dataTransfer!.effectAllowed = 'move'; }
	function dragOver(e: DragEvent, id: number) { e.preventDefault(); dragOverStepId = id; dragOverPosition = (e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top) < 30 ? 'above' : 'below'; }

	async function drop(e: DragEvent, targetId: number) {
		e.preventDefault();
		if (!draggedStepId || draggedStepId === targetId) return;
		const di = sortedSteps.findIndex(s => s.id === draggedStepId);
		const ti = sortedSteps.findIndex(s => s.id === targetId);
		if (di < 0 || ti < 0) return;
		const arr = [...sortedSteps]; const [item] = arr.splice(di, 1);
		arr.splice(dragOverPosition === 'above' ? ti : ti + 1, 0, item);
		try { await Promise.all(arr.map((s, i) => api.updateBotFlowStep(s.id, { sort_order: i }))); await loadSteps(); }
		catch { showToast('Reorder failed.', 'error'); }
		draggedStepId = null; dragOverStepId = null; dragOverPosition = null;
	}
	function dragEnd() { draggedStepId = null; dragOverStepId = null; dragOverPosition = null; }

	// ── Image upload ────────────────────────────────────────
	async function uploadImage(file: File) {
		uploadingImage = true;
		try {
			const fd = new FormData(); fd.append('file', file.type === 'image/png' ? await toJpeg(file) : file);
			const r = await fetch('/api/admin/upload-blob', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('pp_token')}` }, body: fd });
			const d = await r.json() as { url: string };
			if (!r.ok) throw new Error('Upload failed');
			f_img = d.url; showToast('Image uploaded.', 'success');
		} catch { showToast('Upload failed.', 'error'); }
		finally { uploadingImage = false; }
	}
	function toJpeg(file: File): Promise<File> {
		return new Promise(resolve => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d')!.drawImage(img, 0, 0); c.toBlob(b => resolve(new File([b!], file.name.replace(/\.png$/i,'.jpg'), { type: 'image/jpeg' })), 'image/jpeg', 0.92); }; img.src = URL.createObjectURL(file); });
	}

	// ── Choices / Carousel helpers ───────────────────────────
	function addChoice() { f_choices = [...f_choices, { label: '', next_step: '' }]; markDirty(); }
	function rmChoice(i: number) { f_choices = f_choices.filter((_, n) => n !== i); markDirty(); }
	function addCarousel() { f_carousel = [...f_carousel, { title: '', subtitle: '', imageUrl: '', buttonLabel: '', buttonNextStep: '' }]; markDirty(); }
	function rmCarousel(i: number) { f_carousel = f_carousel.filter((_, n) => n !== i); markDirty(); }

	// ── Export / Templates ───────────────────────────────────
	function exportFlow() {
		const json = JSON.stringify(sortedSteps.map(s => ({ step_key: s.step_key, step_label: s.step_label, step_type: s.step_type, prompt_message: s.prompt_message, next_step: s.next_step, input_variable: s.input_variable, button_choices: s.button_choices, image_url: s.image_url, carousel_items: s.carousel_items })), null, 2);
		const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = 'bot-flow.json'; a.click();
	}

	async function applyTemplate(tpl: any[]) {
		if (sortedSteps.length > 0 && !confirm('Replace current flow?')) return;
		for (const s of sortedSteps) await api.deleteBotFlowStep(s.id);
		for (let i = 0; i < tpl.length; i++) await api.createBotFlowStep({ ...tpl[i], sortOrder: i });
		showToast('Template loaded.', 'success'); showTemplates = false; await loadSteps();
	}

	const templates = [
		{ name: 'Product Order Flow', desc: 'Name → Scent → Size → Address → Confirm', steps: [{ step_key:'greet', step_label:'Welcome', step_type:'auto', prompt_message:'Welcome to PawPerfume! Let me help you find your perfect scent.', next_step:'ask_name' },{ step_key:'ask_name', step_label:'Ask Name', step_type:'text_input', prompt_message:'What is your name?', next_step:'ask_scent', input_variable:'customer_name' },{ step_key:'ask_scent', step_label:'Scent', step_type:'button_choice', prompt_message:'What type of scent?', next_step:'ask_size', input_variable:'scent_preference', button_choices:[{ label:'Floral',next_step:'ask_size' },{ label:'Woody',next_step:'ask_size' },{ label:'Fresh',next_step:'ask_size' }] },{ step_key:'ask_size', step_label:'Size', step_type:'button_choice', prompt_message:'Which size?', next_step:'ask_address', input_variable:'bottle_size', button_choices:[{ label:'30ml - ₱599',next_step:'ask_address' },{ label:'50ml - ₱899',next_step:'ask_address' }] },{ step_key:'ask_address', step_label:'Address', step_type:'text_input', prompt_message:'Delivery address?', next_step:'confirm', input_variable:'delivery_address' },{ step_key:'confirm', step_label:'Done', step_type:'auto', prompt_message:'Thank you!' }] },
		{ name: 'AI FAQ Bot', desc: 'Smart FAQ answering', steps: [{ step_key:'intro', step_label:'Greeting', step_type:'auto', prompt_message:'Hi! Ask me anything about our products.', next_step:'ai_faq' },{ step_key:'ai_faq', step_label:'AI FAQ', step_type:'ai_decision', prompt_message:'Let me check...', next_step:'intro', input_variable:'faq_answer', ai_prompt:'Search FAQ for best answer.', ai_context:'faq' }] },
		{ name: 'Lead Capture', desc: 'Collect name, contact, interest', steps: [{ step_key:'greet', step_label:'Welcome', step_type:'auto', prompt_message:'Hi! Answer a few questions for a special offer.', next_step:'ask_name' },{ step_key:'ask_name', step_label:'Name', step_type:'text_input', prompt_message:'Your name?', next_step:'ask_contact', input_variable:'customer_name' },{ step_key:'ask_contact', step_label:'Contact', step_type:'text_input', prompt_message:'Mobile number or email?', next_step:'ask_interest', input_variable:'contact_info' },{ step_key:'ask_interest', step_label:'Interest', step_type:'button_choice', prompt_message:'What interests you?', input_variable:'interest', button_choices:[{ label:'Floral',next_step:'thanks' },{ label:'Woody',next_step:'thanks' },{ label:'Gift Sets',next_step:'thanks' }] },{ step_key:'thanks', step_label:'Done', step_type:'auto', prompt_message:'Got it! We\'ll send you an offer soon.' }] }
	];

	// ── Test Mode ────────────────────────────────────────────
	function startTest(i = 0) {
		if (i < 0 || i >= sortedSteps.length) return;
		testStepIndex = i; testInput = ''; testLog = []; testVariables = {}; aiTesting = false; showTestMode = true;
		const s = sortedSteps[i];
		if (s.prompt_message) testLog.push({ type:'bot', text:s.prompt_message, imageUrl:s.image_url || undefined });
		if (s.step_type === 'auto') setTimeout(() => transition(s, ''), 800);
	}

	async function transition(cur: BotFlowStep, input: string) {
		if (cur.input_variable && input) testVariables[cur.input_variable] = input;
		let nk: string | null = null;
		if (cur.step_type === 'button_choice') { const m = (cur.button_choices || []).find(c => c.label.toLowerCase() === input.toLowerCase()); nk = m?.next_step || cur.next_step; }
		else if (cur.step_type === 'ai_decision') {
			aiTesting = true; testLog = [...testLog];
			try {
				const r = await fetch('/api/admin/test-bot', { method:'POST', headers:{ 'Authorization':`Bearer ${localStorage.getItem('pp_token')}`, 'Content-Type':'application/json' }, body: JSON.stringify({ message:input, systemPrompt:cur.ai_prompt || (cur as any).ai_prompt || 'You are helpful.', aiModel:(cur as any).ai_model || null, aiTemperature:(cur as any).ai_temperature ?? null }) });
				const d = await r.json();
				if (d.reply) { testLog.push({ type:'bot', text:d.reply }); testLog = [...testLog]; }
				nk = d.nextStep || cur.next_step;
			} catch { nk = cur.next_step; } finally { aiTesting = false; }
		} else nk = cur.next_step;
		if (nk) {
			const ni = sortedSteps.findIndex(s => s.step_key === nk);
			if (ni >= 0) { testStepIndex = ni; const ns = sortedSteps[ni]; setTimeout(() => { if (cur.step_type !== 'ai_decision' && ns.prompt_message) { testLog.push({ type:'bot', text:ns.prompt_message, imageUrl:ns.image_url || undefined }); testLog = [...testLog]; } if (ns.step_type === 'auto') setTimeout(() => transition(ns, ''), 800); }, 500); }
			else { testLog.push({ type:'system', text:`Step "${nk}" not found.` }); testLog = [...testLog]; }
		} else { testLog.push({ type:'system', text:'Flow complete.' }); testLog = [...testLog]; }
	}

	function sendTest() { const cur = sortedSteps[testStepIndex]; if (!cur || !testInput.trim()) return; testLog.push({ type:'user', text:testInput.trim() }); testInput = ''; testLog = [...testLog]; transition(cur, testInput.trim()); }

	function pickChoice(c: { label: string; next_step: string }) { testLog.push({ type:'user', text:c.label }); testLog = [...testLog]; const cur = sortedSteps[testStepIndex]; if (cur?.input_variable) testVariables[cur.input_variable] = c.label; const nk = c.next_step || cur?.next_step; if (nk) { const ni = sortedSteps.findIndex(s => s.step_key === nk); if (ni >= 0) { testStepIndex = ni; const ns = sortedSteps[ni]; setTimeout(() => { if (ns.prompt_message) { testLog.push({ type:'bot', text:ns.prompt_message }); testLog = [...testLog]; } if (ns.step_type === 'auto') setTimeout(() => transition(ns, ''), 800); }, 500); } else { testLog.push({ type:'system', text:`Step "${nk}" not found.` }); testLog = [...testLog]; } } else { testLog.push({ type:'system', text:'Flow complete.' }); testLog = [...testLog]; } }
</script>

<ConfirmDialog bind:open={showDeleteConfirm} title="Delete Step?" message="This permanently removes the step from your flow." confirmText="Yes, Delete" cancelText="Cancel" variant="danger" onConfirm={confirmDeleteStep} />

<div class="page">
	<header class="bar">
		<div class="bar-left">
			<h1>Bot Flow</h1>
			<span class="chip">{sortedSteps.length} steps</span>
			{#if flowWarnings.length > 0}
				<span class="chip warn" title={flowWarnings.map(w => w.label).join(', ')}>⚠ {flowWarnings.length} broken</span>
			{/if}
		</div>
		<input type="text" class="search-input" bind:value={searchQuery} placeholder="Search steps..." size="18" />
		<div class="bar-actions">
			{#if sortedSteps.length > 0}
				<button class="btn gh" onclick={() => startTest()}>▶ Test</button>
				<button class="btn gh" onclick={exportFlow}>Export</button>
				<button class="btn gh" onclick={() => showPhonePreview = !showPhonePreview}>{showPhonePreview ? '◼ Preview' : '☰ Preview'}</button>
			{/if}
			<button class="btn gh" onclick={() => showTemplates = !showTemplates}>Templates</button>
			<button class="btn pri" onclick={newStep}>+ Add Step</button>
		</div>
	</header>

	{#if showTemplates}
		<div class="tpl-bar">
			<span class="tpl-title">Templates</span>
			{#each templates as t}
				<button class="tpl-card" onclick={() => applyTemplate(t.steps)}><b>{t.name}</b> <span>{t.desc}</span></button>
			{/each}
		</div>
	{/if}

	<div class="main">
		<div class="canvas">
			{#if loading}
				<div class="list">{#each Array(3) as _}<div class="card skel"><span class="grp"><Skeleton width="16px" height="16px" /></span><div class="bd"><Skeleton width="60%" height="16px" /><Skeleton width="100%" height="32px" borderRadius="6px" /></div></div>{/each}</div>
			{:else if sortedSteps.length === 0}
				<EmptyState title="Build Your Bot Flow" description="Create a step-by-step conversation. Use templates to start quickly." iconType="automation" actionText="Create First Step" onAction={newStep} />
			{:else}
				<div class="list">
					{#each sortedSteps as s, i}
						<div class="card"
							class:sel={selectedStepId === s.id}
							class:warn={flowWarnings.some(w => w.id === s.id)}
							class:drag={draggedStepId === s.id}
							class:d-above={dragOverStepId === s.id && dragOverPosition === 'above'}
							class:d-below={dragOverStepId === s.id && dragOverPosition === 'below'}
							class:a={s.step_type === 'auto'} class:b={s.step_type === 'button_choice'} class:t={s.step_type === 'text_input'} class:im={s.step_type === 'image'} class:ca={s.step_type === 'carousel'} class:ai={s.step_type === 'ai_decision'}
							draggable="true"
							ondragstart={(e) => dragStart(e, s.id)}
							ondragover={(e) => dragOver(e, s.id)}
							ondragend={dragEnd} ondrop={(e) => drop(e, s.id)}
							onclick={() => selectStep(s)}
							onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectStep(s))}
							tabindex="0" role="button"
						>
							<span class="grp" title="Drag"><svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="9" cy="3" r="1.2"/><circle cx="3" cy="9" r="1.2"/><circle cx="9" cy="9" r="1.2"/><circle cx="3" cy="15" r="1.2"/><circle cx="9" cy="15" r="1.2"/></svg></span>
							<span class="num">{i + 1}</span>
							<div class="bd">
								<div class="hd"><b>{s.step_label || s.step_key}</b> <span class="tag t-{s.step_type}">{typeLabel(s.step_type)}</span>{#if s.input_variable} <code>{s.input_variable}</code>{/if}</div>
								{#if s.prompt_message}<div class="pv">{s.prompt_message}</div>{/if}
								<div class="ft">
									{#if nextStepName(s)}<span>→ {nextStepName(s)}</span>{:else}<span class="end">End</span>{/if}
									{#if flowWarnings.some(w => w.id === s.id)}<span class="tag warn">Missing: {s.next_step}</span>{/if}
								</div>
							</div>
							<div class="acts">
								<button class="btn ic" onclick={(e) => { e.stopPropagation(); startTest(i); }} title="Test from here">▶</button>
								<button class="btn ic danger" onclick={(e) => { e.stopPropagation(); promptDelete(s.id); }} title="Delete">×</button>
							</div>
						</div>
						{#if s.step_type === 'button_choice' && (s.button_choices || []).length > 0}
							<div class="br">
								{#each (s.button_choices || []) as c}
									<div class="br-line"><b>{c.label || '?'}</b> → {c.next_step ? (stepMap.get(c.next_step)?.step_label || c.next_step) : 'end'}</div>
								{/each}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- Side Panel -->
		<div class="panel" class:open={panelOpen}>
			<div class="ph"><b>{editingStep ? 'Edit Step' : 'New Step'}</b><div class="pha"><button class="btn ic sm" onclick={() => showAdvanced = !showAdvanced} title="Advanced">{showAdvanced ? '▼' : '▶'}</button><button class="btn ic sm" onclick={closePanel}>×</button></div></div>
			<div class="pb">
				<form onsubmit={(e) => { e.preventDefault(); saveStep(); }}>
					<div class="fg"><label>Label</label><input type="text" bind:value={f_label} placeholder="Ask for Name" oninput={markDirty} onblur={autoKey} /></div>
					{#if showAdvanced}
						<div class="fg"><label>Key</label><input type="text" bind:value={f_key} placeholder="ask_name" oninput={markDirty} /></div>
					{/if}
					<div class="row">
						<div class="fg"><label>Type</label><select bind:value={f_type} onchange={markDirty}><option value="text_input">Text Input</option><option value="button_choice">Button Choice</option><option value="auto">Auto</option><option value="image">Image</option><option value="carousel">Carousel</option><option value="ai_decision">AI Decision</option></select></div>
						<div class="fg"><label>Variable</label><input type="text" bind:value={f_var} placeholder="customer_name" oninput={markDirty} /></div>
					</div>
					<div class="fg"><label>Bot Message</label><textarea bind:value={f_msg} placeholder="What should the bot say?" rows="2" oninput={markDirty}></textarea></div>

					{#if f_type === 'ai_decision'}
						<div class="fg"><label>AI Prompt</label><textarea bind:value={f_ai_prompt} placeholder="Instructions for AI..." rows="2" oninput={markDirty}></textarea></div>
						<div class="row">
							<div class="fg"><label>Context</label><select bind:value={f_ai_ctx} onchange={markDirty}><option value="general">General Router</option><option value="faq">FAQ (RAG)</option><option value="order">Order Help</option></select></div>
							<div class="fg"><label>Model</label><select bind:value={f_ai_model} onchange={markDirty}><option value="">— Default —</option><option value="deepseek/deepseek-chat">DeepSeek</option><option value="openai/gpt-4o-mini">GPT-4o Mini</option><option value="openai/gpt-4o">GPT-4o</option><option value="anthropic/claude-3-haiku">Claude 3</option><option value="google/gemini-2.0-flash-001">Gemini Flash</option></select></div>
						</div>
						<div class="row">
							<div class="fg"><label>Temp: {f_ai_temp}</label><input type="range" min="0" max="1" step="0.05" bind:value={f_ai_temp} oninput={markDirty} /></div>
							<div class="fg"><label>Tokens</label><select bind:value={f_ai_tokens} onchange={markDirty}><option value={100}>Short</option><option value={300}>Medium</option><option value={500}>Long</option></select></div>
						</div>
					{/if}

					{#if f_type === 'image'}
						<div class="fg">
							<label>Image</label>
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="drop" class:has={f_img} ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) uploadImage(f); }} onclick={() => imageFileInput?.click()} onkeydown={(e) => (e.key === 'Enter') && imageFileInput?.click()} role="button" tabindex="0">
								{#if uploadingImage}<span class="sp"></span> Uploading...
								{:else if f_img}<img src={f_img} alt="Preview" />
								{:else}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Drop image here{/if}
							</div>
							<input type="file" accept="image/*" bind:this={imageFileInput} onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadImage(f); }} style="display:none" />
						</div>
					{/if}

					{#if f_type === 'carousel'}
						<div class="fg"><label>Cards</label>
							{#each f_carousel as item, ci}
								<div class="ce"><div class="ce-hd"><span>Card {ci + 1}</span><button type="button" class="btn ic danger" onclick={() => rmCarousel(ci)}>×</button></div><input type="text" bind:value={item.title} placeholder="Title" oninput={markDirty} /><input type="text" bind:value={item.subtitle} placeholder="Subtitle" oninput={markDirty} /><input type="text" bind:value={item.buttonLabel} placeholder="Button" oninput={markDirty} /><input type="text" bind:value={item.buttonNextStep} placeholder="Next step" oninput={markDirty} /></div>
							{/each}
							<button type="button" class="btn gh sm" onclick={addCarousel}>+ Card</button>
						</div>
					{/if}

					{#if f_type === 'button_choice'}
						<div class="fg"><label>Button Choices</label>
							{#each f_choices as c, ci}
								<div class="cr"><input type="text" bind:value={c.label} placeholder="Button text" oninput={markDirty} /><select bind:value={c.next_step} onchange={markDirty}><option value="">— end —</option>{#each sortedSteps.filter(s => editingStep ? s.id !== editingStep.id : true) as s}<option value={s.step_key}>{s.step_label || s.step_key}</option>{/each}</select><button type="button" class="btn ic danger" onclick={() => rmChoice(ci)}>×</button></div>
							{/each}
							<button type="button" class="btn gh sm" onclick={addChoice}>+ Choice</button>
						</div>
					{/if}

					<div class="fg"><label>Next Step</label><select bind:value={f_next} onchange={markDirty}><option value="">— End of flow —</option>{#each sortedSteps.filter(s => editingStep ? s.id !== editingStep.id : true) as s}<option value={s.step_key}>{s.step_label || s.step_key}</option>{/each}</select></div>

					<div class="fa"><button type="button" class="btn gh" onclick={closePanel}>Cancel</button><button type="submit" class="btn pri">{editingStep ? 'Save' : 'Create'}</button></div>
				</form>
			</div>
		</div>

		<!-- Phone Preview -->
		{#if showPhonePreview && sortedSteps.length > 0}
			<div class="phone">
				<div class="pf"><div class="phd">PawPerfume Bot</div></div>
				<div class="pchat">
					{#each sortedSteps.slice(0, 6) as s}
						<div class="pb-msg"><div class="pb">{s.prompt_message || '(no message)'}</div></div>
						{#if s.step_type === 'button_choice' && (s.button_choices || []).length > 0}
							<div class="pb-msg"><div class="pchips">{#each (s.button_choices || []).slice(0, 3) as c}<span class="pc">{c.label}</span>{/each}</div></div>
						{/if}
					{/each}
					<div class="pb-msg"><div class="pty"><span></span><span></span><span></span></div></div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Test Modal -->
{#if showTestMode}
	<div class="mo" onclick={(e) => { if (e.target === e.currentTarget) showTestMode = false; }} role="presentation">
		<div class="mod tm">
			<div class="mh"><h3>Test Flow</h3><button class="btn ic" onclick={() => showTestMode = false}>×</button></div>
			<div class="tb">
				<div class="tc">{#each testLog as e}<div class="tm-msg t-{e.type}">{#if e.type !== 'system'}<span class="ts">{e.type === 'bot' ? 'Bot' : 'You'}</span>{/if}<div class="tbub">{e.text}</div></div>{/each}</div>
				<div class="tv"><h4>Variables</h4>{#each Object.entries(testVariables) as [k, v]}<div class="tvi"><code>{k}</code> = {v}</div>{/each}</div>
			</div>
			{#if sortedSteps[testStepIndex]?.step_type === 'button_choice'}<div class="tch">{#each sortedSteps[testStepIndex].button_choices || [] as c}<button class="btn gh sm" onclick={() => pickChoice(c)}>{c.label}</button>{/each}</div>{/if}
			<div class="tir"><input type="text" bind:value={testInput} placeholder="Type a response..." onkeydown={(e) => e.key === 'Enter' && sendTest()} /><button class="btn pri sm" onclick={sendTest}>Send</button></div>
		</div>
	</div>
{/if}

<style>
	.page { display:flex; flex-direction:column; height:100%; }
	.bar { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1px solid var(--border); background:var(--surface); flex-shrink:0; gap:10px; }
	.bar-left { display:flex; align-items:center; gap:10px; }
	.bar-left h1 { font-size:19px; font-weight:700; }
	.chip { font-size:11px; color:var(--text-secondary); background:var(--surface-hover); padding:2px 9px; border-radius:9px; }
	.chip.warn { background:var(--warning-bg); color:var(--warning); font-weight:600; }
	.bar-actions { display:flex; gap:5px; flex-wrap:wrap; }

	.tpl-bar { display:flex; gap:10px; padding:12px 20px; border-bottom:1px solid var(--border); background:var(--surface); align-items:center; flex-wrap:wrap; }
	.tpl-title { font-size:12px; font-weight:600; color:var(--text-secondary); }
	.tpl-card { background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 12px; cursor:pointer; text-align:left; transition:0.15s; display:flex; flex-direction:column; gap:2px; min-width:170px; font-size:12px; }
	.tpl-card:hover { border-color:var(--accent); background:var(--accent-bg); }
	.tpl-card b { font-size:13px; }
	.tpl-card span { color:var(--text-secondary); font-size:11px; }

	.main { display:flex; flex:1; overflow:hidden; }
	.canvas { flex:1; overflow-y:auto; padding:16px; min-width:0; }
	.list { display:flex; flex-direction:column; gap:2px; max-width:560px; }

	.card { display:flex; align-items:flex-start; gap:8px; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:var(--surface); cursor:pointer; transition:0.15s; border-left-width:4px; border-left-color:var(--border); }
	.card:hover { border-color:var(--accent); box-shadow:var(--shadow); }
	.card.sel { border-color:var(--accent); background:var(--accent-bg); }
	.card.warn { border-left-color:var(--warning); }
	.card.drag { opacity:0.35; }
	.card.d-above { border-top:2px solid var(--accent); border-radius:0 10px 10px 10px; }
	.card.d-below { border-bottom:2px solid var(--accent); border-radius:10px 10px 0 0; }
	.card.a { border-left-color:#06b6d4; }
	.card.b { border-left-color:#f59e0b; }
	.card.t { border-left-color:var(--accent); }
	.card.im { border-left-color:#a855f7; }
	.card.ca { border-left-color:#ec4899; }
	.card.ai { border-left-color:#10b981; }

	.grp { color:var(--text-tertiary); cursor:grab; padding-top:3px; flex-shrink:0; display:flex; }
	.grp:active { cursor:grabbing; }
	.num { width:22px; height:22px; background:var(--accent); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
	.bd { flex:1; min-width:0; }
	.hd { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:2px; }
	.hd b { font-size:13px; }
	.hd code { font-size:9px; font-weight:600; background:var(--surface-hover); color:var(--text-secondary); padding:1px 5px; border-radius:3px; }
	.tag { font-size:9px; font-weight:600; padding:1px 6px; border-radius:3px; text-transform:uppercase; }
	.tag.warn { background:var(--warning-bg); color:var(--warning); }
	.t-text_input { background:var(--accent-bg); color:var(--accent); }
	.t-button_choice { background:var(--warning-bg); color:var(--warning); }
	.t-auto { background:var(--cyan-bg); color:var(--cyan); }
	.t-image { background:rgba(168,85,247,0.12); color:#a855f7; }
	.t-carousel { background:rgba(236,72,153,0.12); color:#ec4899; }
	.t-ai_decision { background:var(--green-bg); color:var(--green); }
	.pv { font-size:12px; color:var(--text-secondary); margin:4px 0; padding:6px 8px; background:var(--bg); border-radius:5px; line-height:1.4; }
	.ft { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px; font-size:11px; }
	.ft .end { color:var(--green); font-weight:500; }
	.acts { display:flex; gap:2px; flex-shrink:0; opacity:0; transition:0.15s; }
	.card:hover .acts { opacity:1; }

	.br { padding:0 0 0 46px; display:flex; flex-direction:column; gap:1px; }
	.br-line { display:flex; align-items:center; gap:6px; font-size:10px; padding:3px 8px; background:var(--surface); border:1px solid var(--border); border-radius:3px; border-left:2px solid var(--warning); }

	/* Panel */
	.panel { width:0; overflow:hidden; border-left:1px solid var(--border); background:var(--surface); transition:width 0.22s ease; flex-shrink:0; display:flex; flex-direction:column; }
	.panel.open { width:320px; }
	.ph { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border); }
	.ph b { font-size:14px; }
	.pha { display:flex; gap:2px; }
	.pb { flex:1; overflow-y:auto; padding:16px; }
	.fg { margin-bottom:12px; }
	.fg label { display:block; font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:3px; text-transform:uppercase; letter-spacing:0.4px; }
	.fg input, .fg select, .fg textarea { width:100%; padding:7px 9px; border:1px solid var(--border); border-radius:7px; font-size:12px; background:var(--bg); color:var(--text); font-family:var(--font); box-sizing:border-box; }
	.fg input:focus, .fg select:focus, .fg textarea:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-bg); }
	.row { display:flex; gap:8px; }
	.row .fg { flex:1; }
	.fa { display:flex; justify-content:flex-end; gap:6px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border); }

	.drop { border:2px dashed var(--border); border-radius:7px; padding:16px; text-align:center; cursor:pointer; transition:0.15s; display:flex; flex-direction:column; align-items:center; gap:6px; color:var(--text-tertiary); font-size:11px; }
	.drop:hover { border-color:var(--accent); background:var(--accent-bg); }
	.drop.has { padding:6px; }
	.drop img { max-height:60px; border-radius:5px; }
	.sp { width:12px; height:12px; border:2px solid rgba(124,58,237,0.3); border-top-color:var(--accent); border-radius:50%; animation:spin 0.6s linear infinite; display:inline-block; }
	@keyframes spin { to{transform:rotate(360deg);} }

	.ce { border:1px solid var(--border); border-radius:5px; padding:8px; margin-bottom:6px; background:var(--bg); }
	.ce-hd { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:11px; font-weight:600; }
	.ce input { width:100%; padding:4px 6px; border:1px solid var(--border); border-radius:4px; font-size:11px; background:var(--surface); color:var(--text); margin-bottom:4px; font-family:var(--font); }
	.ce input:last-child { margin-bottom:0; }
	.cr { display:flex; gap:4px; margin-bottom:5px; align-items:center; }
	.cr input, .cr select { flex:1; padding:5px 6px; border:1px solid var(--border); border-radius:4px; font-size:11px; background:var(--bg); color:var(--text); }

	/* Phone */
	.phone { width:280px; flex-shrink:0; overflow-y:auto; padding:14px; display:flex; justify-content:center; background:var(--bg); border-left:1px solid var(--border); }
	.pf { width:240px; background:var(--surface); border:2px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:var(--shadow-lg); }
	.phd { padding:8px 12px; background:var(--accent); color:white; text-align:center; font-size:10px; font-weight:600; }
	.pchat { padding:8px; display:flex; flex-direction:column; gap:6px; min-height:240px; background:var(--bg); }
	.pb-msg { display:flex; justify-content:flex-start; }
	.pb { padding:4px 8px; border-radius:10px 10px 10px 3px; font-size:10px; background:var(--surface); border:1px solid var(--border); color:var(--text); max-width:85%; line-height:1.3; }
	.pchips { display:flex; flex-wrap:wrap; gap:3px; }
	.pc { padding:3px 6px; border:1px solid var(--accent); border-radius:10px; font-size:9px; color:var(--accent); background:var(--accent-bg); }
	.pty { display:flex; gap:2px; padding:6px 10px; background:var(--surface); border:1px solid var(--border); border-radius:10px 10px 10px 3px; }
	.pty span { width:4px; height:4px; background:var(--text-tertiary); border-radius:50%; animation:pty 1.4s infinite ease-in-out; }
	.pty span:nth-child(2) { animation-delay:0.2s; } .pty span:nth-child(3) { animation-delay:0.4s; }
	@keyframes pty { 0%,80%,100%{opacity:0.3;} 40%{opacity:1;} }

	/* Test Modal */
	.mo { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100; }
	.mod { background:var(--surface); border:1px solid var(--border); border-radius:12px; max-width:95vw; max-height:85vh; display:flex; flex-direction:column; box-shadow:var(--shadow-xl); }
	.tm { width:500px; height:520px; }
	.mh { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border); }
	.mh h3 { font-size:15px; font-weight:600; }
	.tb { flex:1; display:flex; overflow:hidden; }
	.tc { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:6px; }
	.tm-msg { max-width:85%; }
	.t-bot { align-self:flex-start; } .t-user { align-self:flex-end; } .t-system { align-self:center; }
	.ts { font-size:9px; font-weight:600; color:var(--text-tertiary); display:block; margin-bottom:1px; }
	.tbub { padding:6px 10px; border-radius:8px; font-size:11px; line-height:1.3; }
	.t-bot .tbub { background:var(--accent); color:white; }
	.t-user .tbub { background:var(--surface); border:1px solid var(--border); }
	.t-system .tbub { background:var(--surface-hover); color:var(--text-secondary); font-size:10px; }
	.tv { width:180px; border-left:1px solid var(--border); padding:12px; overflow-y:auto; }
	.tv h4 { font-size:9px; text-transform:uppercase; color:var(--text-tertiary); margin-bottom:6px; }
	.tvi { font-size:10px; padding:3px 0; border-bottom:1px solid var(--border); }
	.tvi code { color:var(--accent); font-size:9px; }
	.tch { display:flex; gap:5px; padding:8px 12px; border-top:1px solid var(--border); flex-wrap:wrap; }
	.tir { display:flex; gap:6px; padding:8px 12px; border-top:1px solid var(--border); }
	.tir input { flex:1; padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:12px; background:var(--bg); color:var(--text); }
	.tir input:focus { outline:none; border-color:var(--accent); }

	/* Buttons */
	.btn { display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border:none; border-radius:7px; font-size:12px; font-weight:500; cursor:pointer; transition:0.12s; font-family:var(--font); white-space:nowrap; }
	.pri { background:var(--accent); color:white; }
	.pri:hover { background:var(--accent-hover); }
	.gh { background:transparent; color:var(--text-secondary); }
	.gh:hover { background:var(--surface-hover); color:var(--text); }
	.ic { display:inline-flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; padding:4px; color:var(--text-secondary); border-radius:5px; transition:0.12s; font-size:14px; min-width:26px; min-height:26px; }
	.ic:hover { background:var(--surface-hover); color:var(--text); }
	.ic.danger:hover { background:var(--red-bg); color:var(--red); }
	.ic:disabled { opacity:0.3; cursor:default; }
	.sm { padding:3px 8px; font-size:11px; min-width:auto; min-height:auto; }
	.skel { opacity:0.6; pointer-events:none; }

	@media (max-width:768px) {
		.bar { flex-wrap:wrap; gap:8px; padding:10px 14px; }
		.bar-actions { width:100%; justify-content:flex-end; }
		.main { flex-direction:column; }
		.panel { width:0; border-left:none; border-top:1px solid var(--border); transition:none; }
		.panel.open { width:100%; max-height:55vh; }
		.canvas { padding:10px; }
		.phone { display:none; }
	}
</style>
