<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Faq } from '$lib/types';
	import InlineEdit from '$lib/components/InlineEdit.svelte';

	let faqs = $state<Faq[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let newFaq = $state({ question: '', answer: '', keywords: '' });
	let editingFaq = $state<Faq | null>(null);
	let showDeleteConfirm = $state(false);
	let deletingId = $state<number | null>(null);

	onMount(async () => {
		await loadFaqs();
	});

	async function loadFaqs() {
		loading = true;
		try {
			faqs = await api.faqs() as Faq[];
		} catch (err) {
			showToast('Could not load FAQs. Please try again.', 'error');
		} finally {
			loading = false;
		}
	}

	async function saveFaq() {
		try {
			if (editingFaq) {
				await api.updateFaq(editingFaq.id, newFaq);
				showToast('FAQ updated.', 'success');
			} else {
				await api.createFaq(newFaq);
				showToast('FAQ added.', 'success');
			}
			showForm = false;
			editingFaq = null;
			newFaq = { question: '', answer: '', keywords: '' };
			await loadFaqs();
		} catch (err) {
			showToast('Could not save FAQ. Check your fields and try again.', 'error');
		}
	}

	function editFaq(faq: Faq) {
		editingFaq = faq;
		newFaq = { question: faq.question || '', answer: faq.answer || '', keywords: faq.keywords || '' };
		showForm = true;
	}

	function openNewFaq() {
		editingFaq = null;
		newFaq = { question: '', answer: '', keywords: '' };
		showForm = true;
	}

	function promptDelete(id: number) {
		deletingId = id;
		showDeleteConfirm = true;
	}

	async function confirmDeleteFaq() {
		if (!deletingId) return;
		try {
			await api.deleteFaq(deletingId);
			showToast('FAQ deleted.', 'success');
			await loadFaqs();
		} catch (err) {
			showToast('Could not delete. Please try again.', 'error');
		} finally {
			showDeleteConfirm = false;
			deletingId = null;
		}
	}

	async function updateFaqField(id: number, fields: Partial<Faq>) {
		try {
			await api.updateFaq(id, fields);
			showToast('FAQ updated.', 'success');
			await loadFaqs();
		} catch {
			showToast('Failed to update FAQ.', 'error');
			throw new Error('Save failed');
		}
	}
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This FAQ?"
	message="Your bot will no longer use this FAQ to answer customers, but you can add it back anytime."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmDeleteFaq}
/>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>FAQs</h1>
		</div>
		<button class="btn btn-primary" onclick={openNewFaq}>+ Add FAQ</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="card-list">
			{#each faqs as faq}
				<div 
					class="card"
				>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="card-content" onclick={(e) => e.stopPropagation()}>
						<div class="card-question" style="display:flex; gap: 4px; align-items: baseline;">
							<span style="font-weight:600; color:var(--accent);">Q:</span>
							<div style="flex:1;">
								<InlineEdit
									bind:value={faq.question}
									onSave={(val) => updateFaqField(faq.id, { question: val })}
									placeholder="Question..."
								/>
							</div>
						</div>
						<div class="card-answer" style="display:flex; gap: 4px; align-items: baseline; margin-top:8px;">
							<span style="font-weight:600; color:var(--text-secondary);">A:</span>
							<div style="flex:1;">
								<InlineEdit
									bind:value={faq.answer}
									type="textarea"
									onSave={(val) => updateFaqField(faq.id, { answer: val })}
									placeholder="Answer..."
								/>
							</div>
						</div>
						<div class="card-keywords" style="display:flex; gap: 4px; align-items: baseline; margin-top:8px; font-size:12px;">
							<span style="color:var(--text-tertiary); font-weight:500;">Keywords:</span>
							<div style="flex:1;">
								<InlineEdit
									bind:value={faq.keywords}
									onSave={(val) => updateFaqField(faq.id, { keywords: val })}
									placeholder="Keywords (comma separated)..."
								/>
							</div>
						</div>
					</div>
					<div class="card-actions">
						<button class="btn-icon" onclick={(e) => { e.stopPropagation(); editFaq(faq); }} title="Edit" aria-label="Edit FAQ">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
						</button>
						<button class="btn-icon danger" onclick={(e) => { e.stopPropagation(); promptDelete(faq.id); }} title="Delete" aria-label="Delete FAQ">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								<line x1="10" y1="11" x2="10" y2="17"></line>
								<line x1="14" y1="11" x2="14" y2="17"></line>
							</svg>
						</button>
					</div>
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-icon"></div>
					<p>No FAQs yet</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showForm = false)} role="presentation">
		<div class="modal">
			<div class="modal-header">
				<h3>{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</h3>
				<button class="btn-icon" onclick={() => { showForm = false; editingFaq = null; }} aria-label="Close modal">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form onsubmit={e => { e.preventDefault(); saveFaq(); }}>
				<div class="form-group">
					<label for="faq-question">Question</label>
					<input id="faq-question" type="text" bind:value={newFaq.question} placeholder="What do customers ask?" />
				</div>
				<div class="form-group">
					<label for="faq-answer">Answer</label>
					<textarea id="faq-answer" bind:value={newFaq.answer} placeholder="Your answer..." rows="3"></textarea>
				</div>
				<div class="form-group">
					<label for="faq-keywords">Keywords (comma-separated)</label>
					<input id="faq-keywords" type="text" bind:value={newFaq.keywords} placeholder="price, cost, how much" />
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => { showForm = false; editingFaq = null; }}>Cancel</button>
					<button type="submit" class="btn btn-primary">{editingFaq ? 'Save Changes' : 'Add FAQ'}</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page { padding: 32px; max-width: 900px; margin: 0 auto; }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }
	.card-list { display: flex; flex-direction: column; gap: 12px; }
	.card { 
		background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; gap: 16px; 
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
	}
	.card.clickable-card { cursor: pointer; }
	.card.clickable-card:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: var(--shadow-lg);
	}
	.card.clickable-card:active {
		transform: translateY(0);
	}
	.card-content { flex: 1; }
	.card-question { font-weight: 600; margin-bottom: 8px; }
	.card-answer { color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; }
	.card-keywords { display: flex; flex-wrap: wrap; gap: 6px; }
	.keyword-tag { background: var(--accent-bg); color: var(--accent); padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
	.empty-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }
	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }
	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-ghost { background: transparent; color: var(--text-secondary); }
	.btn-ghost:hover { background: var(--surface-hover); }
	.btn-sm { padding: 4px 12px; font-size: 13px; }
	.btn-icon {
		display: inline-flex; align-items: center; justify-content: center;
		background: none; border: none; cursor: pointer; padding: 6px;
		color: var(--text-secondary); flex-shrink: 0; border-radius: var(--radius-sm);
		transition: all 0.15s ease;
	}
	.btn-icon:hover { background: var(--surface-hover); color: var(--text); }
	.btn-icon.danger:hover { background: var(--red-bg); color: var(--red); }
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 500px; max-width: 95vw; box-shadow: var(--shadow-lg); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
	.modal-header h3 { font-size: 16px; font-weight: 600; }
	.form-group { padding: 12px 20px; }
	.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; }
	.form-group input, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg); color: var(--text); font-family: var(--font); }
	.form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--accent); }
	.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); }
</style>
