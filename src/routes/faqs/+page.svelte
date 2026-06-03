<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Faq } from '$lib/types';

	let faqs = $state<Faq[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let newFaq = $state({ question: '', answer: '', keywords: '' });
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

	async function addFaq() {
		try {
			await api.createFaq(newFaq);
			showToast('FAQ added.', 'success');
			showForm = false;
			newFaq = { question: '', answer: '', keywords: '' };
			await loadFaqs();
		} catch (err) {
			showToast('Could not add FAQ. Check your fields and try again.', 'error');
		}
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
</script>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete This FAQ?"
	message="Hindi na ito ma-sasagot ng bot mo sa customers. Pwede mo naman i-add ulit anytime."
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
		<button class="btn btn-primary" onclick={() => showForm = true}>+ Add FAQ</button>
	</header>

	{#if loading}
		<div class="loading-state">Loading...</div>
	{:else}
		<div class="card-list">
			{#each faqs as faq}
				<div class="card">
					<div class="card-content">
						<div class="card-question">Q: {faq.question || '—'}</div>
						<div class="card-answer">A: {faq.answer || '—'}</div>
						{#if faq.keywords}
							<div class="card-keywords">
								{#each faq.keywords.split(',').map(k => k.trim()).filter(Boolean) as kw}
									<span class="keyword-tag">{kw}</span>
								{/each}
							</div>
						{/if}
					</div>
					<button class="btn-icon danger" onclick={() => promptDelete(faq.id)}></button>
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
				<h3>Add FAQ</h3>
				<button class="btn-icon" onclick={() => showForm = false}></button>
			</div>
			<form onsubmit={e => { e.preventDefault(); addFaq(); }}>
				<div class="form-group">
					<label>Question</label>
					<input type="text" bind:value={newFaq.question} placeholder="What do customers ask?" />
				</div>
				<div class="form-group">
					<label>Answer</label>
					<textarea bind:value={newFaq.answer} placeholder="Your answer..." rows="3"></textarea>
				</div>
				<div class="form-group">
					<label>Keywords (comma-separated)</label>
					<input type="text" bind:value={newFaq.keywords} placeholder="price, cost, how much" />
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => showForm = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add FAQ</button>
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
	.card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; gap: 16px; }
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
	.btn-icon { background: none; border: none; cursor: pointer; padding: 4px; font-size: 14px; flex-shrink: 0; }
	.btn-icon:hover { background: var(--surface-hover); border-radius: var(--radius-sm); }
	.btn-icon.danger:hover { color: var(--red); }
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
