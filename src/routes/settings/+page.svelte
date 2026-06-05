<script lang="ts">
	import { onMount } from 'svelte';
	import { api, showToast } from '$lib/api';
	import type { Tenant, CustomField } from '$lib/types';
	import InlineEdit from '$lib/components/InlineEdit.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let tenant = $state<Partial<Tenant>>({});
	let customFields = $state<CustomField[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let activeSection = $state('brand');
	let testMessage = $state('');
	let testingBot = $state(false);
	let testResult = $state('');

	// Custom fields states
	let editingCf = $state<CustomField | null>(null);
	let showNewCfModal = $state(false);
	let newCfKey = $state('');
	let newCfLabel = $state('');
	let newCfType = $state('select');
	let newCfOptions = $state<string[]>([]);
	let newOptionText = $state('');
	let showCfDeleteConfirm = $state(false);
	let cfToDeleteId = $state<number | null>(null);

	const sections = [
		{ key: 'brand', label: 'Brand', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" stroke-width="2"/></svg>' },
		{ key: 'ai', label: 'AI Bot', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M12 2v3M8 5h8M12 11V9"/></svg>' },
		{ key: 'facebook', label: 'Facebook', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>' },
		{ key: 'custom_fields', label: 'Custom Fields', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>' },
		{ key: 'notifications', label: 'Notifications', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
		{ key: 'system', label: 'System', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' }
	];

	onMount(async () => { await loadSettings(); });

	async function loadSettings() {
		loading = true;
		try { 
			tenant = await api.tenantConfig();
			customFields = await api.customFields() as CustomField[];
		}
		catch { showToast('Could not load settings. Please refresh the page.', 'error'); }
		finally { loading = false; }
	}

	async function saveSettings() {
		saving = true;
		try {
			await api.updateTenant({
				brand_name: tenant.brand_name,
				brand_tagline: tenant.brand_tagline,
				brand_welcome_message: tenant.brand_welcome_message,
				brand_primary_color: tenant.brand_primary_color,
				brand_accent_color: tenant.brand_accent_color,
				ai_system_prompt: tenant.ai_system_prompt,
				ai_language: tenant.ai_language,
				ai_tone: tenant.ai_tone,
				ai_enabled: tenant.ai_enabled,
			});
			showToast('Settings saved.', 'success');
		} catch { showToast('Could not save settings. Please try again.', 'error'); }
		finally { saving = false; }
	}

	async function testBot() {
		if (!testMessage.trim()) return;
		testingBot = true;
		testResult = '';
		try {
			const res = await api.generic<{ reply?: string; error?: string }>('/test-bot', 'POST', { message: testMessage });
			testResult = res.reply || res.error || 'No response';
		} catch (err) {
			testResult = 'Failed to test bot: ' + (err as Error).message;
		} finally { testingBot = false; }
	}

	function editCf(cf: CustomField) {
		editingCf = { 
			...cf, 
			field_options: Array.isArray(cf.field_options) 
				? [...cf.field_options] 
				: (typeof cf.field_options === 'string' ? JSON.parse(cf.field_options || '[]') : [])
		};
		newOptionText = '';
	}

	function addOptionToEditingCf() {
		if (!newOptionText.trim() || !editingCf) return;
		if (!editingCf.field_options) editingCf.field_options = [];
		editingCf.field_options = [...editingCf.field_options, newOptionText.trim()];
		newOptionText = '';
	}

	async function saveEditingCf() {
		if (!editingCf) return;
		try {
			await api.updateCustomField(editingCf.id, editingCf);
			showToast('Custom field updated.', 'success');
			editingCf = null;
			customFields = await api.customFields() as CustomField[];
		} catch {
			showToast('Could not save custom field. Please try again.', 'error');
		}
	}

	function promptRemoveCf(id: number) {
		cfToDeleteId = id;
		showCfDeleteConfirm = true;
	}

	async function confirmRemoveCf() {
		if (!cfToDeleteId) return;
		try {
			await api.deleteCustomField(cfToDeleteId);
			showToast('Custom field deleted.', 'success');
			customFields = await api.customFields() as CustomField[];
		} catch {
			showToast('Could not delete custom field. Please try again.', 'error');
		} finally {
			showCfDeleteConfirm = false;
			cfToDeleteId = null;
		}
	}

	function addOptionToNewCf() {
		if (!newOptionText.trim()) return;
		newCfOptions = [...newCfOptions, newOptionText.trim()];
		newOptionText = '';
	}

	async function saveNewCf() {
		if (!newCfKey.trim() || !newCfLabel.trim()) {
			showToast('Field key and label are required.', 'error');
			return;
		}
		try {
			await api.createCustomField({
				fieldKey: newCfKey.trim(),
				fieldLabel: newCfLabel.trim(),
				fieldType: newCfType,
				fieldOptions: newCfOptions,
				applyTo: 'orders',
				sortOrder: customFields.length
			});
			showToast('Custom field created.', 'success');
			showNewCfModal = false;
			newCfKey = '';
			newCfLabel = '';
			newCfType = 'select';
			newCfOptions = [];
			customFields = await api.customFields() as CustomField[];
		} catch {
			showToast('Could not create custom field. Please try again.', 'error');
		}
	}
</script>

<div class="page">
	<header class="page-header">
		<div class="breadcrumb">
			<span class="breadcrumb-icon"></span>
			<h1>Settings</h1>
		</div>
		<button class="btn btn-primary" onclick={saveSettings} disabled={saving}>
			{saving ? 'Saving...' : 'Save Changes'}
		</button>
	</header>

	<div class="settings-layout">
		<nav class="settings-nav">
			{#each sections as sec}
				<button class="nav-item" class:active={activeSection === sec.key} onclick={() => activeSection = sec.key}>
					<span class="nav-icon">{@html sec.icon}</span>
					<span class="nav-label">{sec.label}</span>
				</button>
			{/each}
		</nav>

		<div class="settings-content">
			{#if loading}
				<div class="settings-section" style="display: flex; flex-direction: column; gap: 16px;">
					<Skeleton width="40%" height="24px" />
					<Skeleton width="60%" height="16px" />
					<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 12px;">
						<div style="margin-bottom: 12px;">
							<div style="margin-bottom: 6px;">
								<Skeleton width="100px" height="14px" />
							</div>
							<Skeleton width="100%" height="40px" />
						</div>
						<div style="margin-bottom: 12px;">
							<div style="margin-bottom: 6px;">
								<Skeleton width="80px" height="14px" />
							</div>
							<Skeleton width="100%" height="40px" />
						</div>
						<div style="margin-bottom: 12px;">
							<div style="margin-bottom: 6px;">
								<Skeleton width="120px" height="14px" />
							</div>
							<Skeleton width="100%" height="80px" />
						</div>
					</div>
				</div>
			{:else if activeSection === 'brand'}
				<section class="settings-section">
					<h2>Brand Identity</h2>
					<p class="section-desc">Customize how your brand appears to customers</p>
					<div class="form-group">
						<label for="brand-name">Brand Name</label>
						<input id="brand-name" type="text" bind:value={tenant.brand_name} placeholder="PawPerfume" />
					</div>
					<div class="form-group">
						<label for="brand-tagline">Tagline</label>
						<input id="brand-tagline" type="text" bind:value={tenant.brand_tagline} placeholder="Premium scents, delivered" />
					</div>
					<div class="form-group">
						<label for="brand-welcome">Welcome Message</label>
						<textarea id="brand-welcome" bind:value={tenant.brand_welcome_message} rows="3" placeholder="Welcome to our store..."></textarea>
						<span class="form-hint">This is the first message customers see when they start a conversation</span>
					</div>
					<h3>Brand Colors</h3>
					<div class="form-grid">
						<div class="form-group">
							<label for="brand-primary">Primary Color</label>
							<div class="color-input">
								<input id="brand-primary" type="color" bind:value={tenant.brand_primary_color} />
								<code>{tenant.brand_primary_color || '#8b5cf6'}</code>
							</div>
						</div>
						<div class="form-group">
							<label for="brand-accent">Accent Color</label>
							<div class="color-input">
								<input id="brand-accent" type="color" bind:value={tenant.brand_accent_color} />
								<code>{tenant.brand_accent_color || '#ec4899'}</code>
							</div>
						</div>
					</div>
					<div class="brand-preview" style="border-top-color:{tenant.brand_primary_color || '#8b5cf6'}">
						<div class="preview-header" style="background:{tenant.brand_primary_color || '#8b5cf6'}">
							<span>{tenant.brand_name || 'PawPerfume'}</span>
						</div>
						<div class="preview-body">
							<div class="preview-msg bot" style="background:{tenant.brand_accent_color || '#ec4899'}">
								{tenant.brand_welcome_message || 'Welcome to our store!'}
							</div>
							<div class="preview-msg customer">Hi! I'm interested in your products</div>
						</div>
					</div>
				</section>

			{:else if activeSection === 'ai'}
				<section class="settings-section">
					<h2>AI Bot Configuration</h2>
					<p class="section-desc">Configure how your AI bot responds to customers</p>
					<div class="form-group">
						<label for="ai-enabled">Enable AI Bot</label>
						<label class="toggle">
							<input id="ai-enabled" type="checkbox" bind:checked={tenant.ai_enabled} />
							<span class="toggle-slider"></span>
						</label>
						<span class="toggle-label">{tenant.ai_enabled ? 'Enabled' : 'Disabled'}</span>
					</div>
					<div class="form-group">
						<label for="ai-prompt">System Prompt</label>
						<textarea id="ai-prompt" bind:value={tenant.ai_system_prompt} rows="5" placeholder="You are a helpful assistant for a perfume business..."></textarea>
						<span class="form-hint">This defines the bot's personality and knowledge. Be specific about your business.</span>
					</div>
					<div class="form-grid">
						<div class="form-group">
							<label for="ai-lang">Language</label>
							<select id="ai-lang" bind:value={tenant.ai_language}>
								<option value="en">English</option>
								<option value="tl">Tagalog</option>
								<option value="tl-en">Taglish</option>
							</select>
						</div>
						<div class="form-group">
							<label for="ai-tone">Tone</label>
							<select id="ai-tone" bind:value={tenant.ai_tone}>
								<option value="friendly">Friendly</option>
								<option value="professional">Professional</option>
								<option value="casual">Casual</option>
							</select>
						</div>
					</div>

					<h3>Test Your Bot</h3>
					<div class="bot-test">
						<div class="bot-test-input">
							<input type="text" bind:value={testMessage} placeholder="Type a test message..." onkeydown={(e) => e.key === 'Enter' && testBot()} />
							<button class="btn btn-primary btn-sm" onclick={testBot} disabled={testingBot || !testMessage.trim()}>
								{testingBot ? 'Testing...' : 'Test'}
							</button>
						</div>
						{#if testResult}
							<div class="bot-test-result">
								<span class="bot-test-label">Bot Response:</span>
								{testResult}
							</div>
						{/if}
					</div>
				</section>

			{:else if activeSection === 'facebook'}
				<section class="settings-section">
					<h2>Facebook Integration</h2>
					<p class="section-desc">Connect your Facebook page for Messenger</p>
					<div class="info-grid">
						<div class="info-item">
							<span class="info-label">Page Access Token</span>
							<span class="info-value">{tenant.fb_page_access_token ? '••••••••' + String(tenant.fb_page_access_token).slice(-4) : 'Not set'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Page ID</span>
							<span class="info-value">{tenant.fb_page_id || 'Not set'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Webhook URL</span>
							<span class="info-value code">{`${typeof window !== 'undefined' ? window.location.origin : ''}/webhook`}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Verify Token</span>
							<span class="info-value code">{tenant.fb_verify_token || 'Set in environment'}</span>
						</div>
					</div>
					<div class="form-hint" style="margin-top:16px">
						<p>To set up Messenger:</p>
						<ol>
							<li>Create a Facebook App at <strong>developers.facebook.com</strong></li>
							<li>Add the Messenger product and generate a Page Access Token</li>
							<li>Set the webhook URL and verify token in your environment variables</li>
							<li>Subscribe to the <code>messages</code> and <code>messaging_postbacks</code> events</li>
						</ol>
					</div>
				</section>

			{:else if activeSection === 'custom_fields'}
				<section class="settings-section">
					<h2>Order Custom Fields</h2>
					<p class="section-desc">Manage custom details collected under orders (e.g. Scent Preferences, Bottle Sizes, Delivery Methods, etc.)</p>
					
					<div class="cf-list" style="display:flex; flex-direction:column; gap:16px;">
						{#each customFields as cf}
							<div class="cf-card" style="border: 1px solid var(--border); border-radius: 8px; padding: 16px; background: var(--bg);">
								<div class="cf-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
									<div style="display:flex; align-items:center; gap:8px;">
										<InlineEdit
											bind:value={cf.field_label}
											onSave={async (val) => {
												try {
													await api.updateCustomField(cf.id, { ...cf, field_label: val });
													showToast('Field label updated.', 'success');
												} catch {
													showToast('Could not update field label. Please try again.', 'error');
												}
											}}
											placeholder={cf.field_key}
										/>
										<code style="font-size:11px; color:var(--text-tertiary); background:var(--surface); padding:2px 6px; border-radius:4px;">{cf.field_key}</code>
									</div>
									<div style="display:flex; gap:6px;">
										<button class="btn btn-ghost btn-sm" onclick={() => editCf(cf)}>Edit Options</button>
										<button class="btn btn-ghost btn-sm text-red" onclick={() => promptRemoveCf(cf.id)}>Delete</button>
									</div>
								</div>
								
								<div class="cf-card-body" style="font-size:13px; color:var(--text-secondary);">
									<div style="margin-bottom:8px;">Type: <span style="text-transform:capitalize; font-weight:500; color:var(--text);">{cf.field_type}</span></div>
									{#if cf.field_type === 'select'}
										<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:8px;">
											<span style="color:var(--text-tertiary);">Active Options:</span>
											{#each cf.field_options || [] as opt}
												<span style="background:var(--surface); border:1px solid var(--border); padding:2px 8px; border-radius:12px; font-size:12px; color:var(--text);">{opt}</span>
											{/each}
										</div>
									{:else}
										<div style="color:var(--text-tertiary); font-style:italic;">Text input (free-form text, no pre-defined choices)</div>
									{/if}
								</div>
							</div>
						{/each}
						
						<button class="btn btn-primary" onclick={() => { showNewCfModal = true; }} style="align-self:flex-start; margin-top:8px;">+ Add Custom Field</button>
					</div>
				</section>

			{:else if activeSection === 'notifications'}
				<section class="settings-section">
					<h2>Notification Preferences</h2>
					<p class="section-desc">Control when and how you receive notifications</p>
					<div class="toggle-list">
						<div class="toggle-item">
							<div><strong>New message received</strong><br /><span class="toggle-desc">Get notified when a customer sends a message</span></div>
							<label class="toggle"><input type="checkbox" checked /><span class="toggle-slider"></span></label>
						</div>
						<div class="toggle-item">
							<div><strong>New order placed</strong><br /><span class="toggle-desc">Get notified when a bot creates a new order</span></div>
							<label class="toggle"><input type="checkbox" checked /><span class="toggle-slider"></span></label>
						</div>
						<div class="toggle-item">
							<div><strong>Daily summary</strong><br /><span class="toggle-desc">Receive a daily summary of activity</span></div>
							<label class="toggle"><input type="checkbox" /><span class="toggle-slider"></span></label>
						</div>
						<div class="toggle-item">
							<div><strong>Bot errors</strong><br /><span class="toggle-desc">Get notified when the bot fails to respond</span></div>
							<label class="toggle"><input type="checkbox" checked /><span class="toggle-slider"></span></label>
						</div>
					</div>
				</section>

			{:else if activeSection === 'system'}
				<section class="settings-section">
					<h2>System Information</h2>
					<div class="info-grid">
						<div class="info-item"><span class="info-label">Tenant ID</span><span class="info-value">{tenant.id || '—'}</span></div>
						<div class="info-item"><span class="info-label">Slug</span><span class="info-value">{tenant.slug || '—'}</span></div>
						<div class="info-item"><span class="info-label">Plan</span><span class="info-value"><span class="plan-badge">{tenant.plan || 'free'}</span></span></div>
						<div class="info-item"><span class="info-label">Status</span><span class="info-value" class:active={tenant.is_active}>{tenant.is_active ? 'Active' : 'Inactive'}</span></div>
						<div class="info-item"><span class="info-label">Created</span><span class="info-value">{tenant.created_at ? new Date(String(tenant.created_at)).toLocaleDateString() : '—'}</span></div>
						<div class="info-item"><span class="info-label">Updated</span><span class="info-value">{tenant.updated_at ? new Date(String(tenant.updated_at)).toLocaleDateString() : '—'}</span></div>
					</div>
				</section>
			{/if}
		</div>
	</div>
</div>

{#if editingCf}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (editingCf = null)} role="presentation">
		<div class="modal modal-sm" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 440px; box-shadow: var(--shadow-lg);">
			<div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border);">
				<h3 style="font-size: 16px; font-weight: 600; margin: 0;">Edit Field options</h3>
				<button class="btn-icon" onclick={() => editingCf = null} style="font-size:20px; line-height:1; cursor:pointer;">×</button>
			</div>
			<div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
				<div class="form-group" style="margin-bottom:0;">
					<label for="cf-edit-label">Field Label</label>
					<input id="cf-edit-label" type="text" bind:value={editingCf.field_label} style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px; background:var(--bg); color:var(--text);" />
				</div>
				<div class="form-group" style="margin-bottom:0;">
					<label for="cf-edit-type">Field Type</label>
					<select id="cf-edit-type" bind:value={editingCf.field_type} style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px; background:var(--bg); color:var(--text);">
						<option value="text">Text Input</option>
						<option value="select">Dropdown Choice</option>
					</select>
				</div>
				
				{#if editingCf.field_type === 'select'}
					<div class="form-group" style="margin-bottom:0; display:flex; flex-direction:column; gap:6px;">
						<label for="cf-edit-new-opt">Dropdown Options List</label>
						<div style="display:flex; flex-wrap:wrap; gap:6px; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:8px; min-height:48px;">
							{#each editingCf.field_options || [] as opt, idx}
								<span style="display:inline-flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); padding:2px 8px; border-radius:12px; font-size:12px; color:var(--text);">
									{opt}
									<button type="button" onclick={() => { if (editingCf) editingCf.field_options = editingCf.field_options.filter((_, i) => i !== idx); }} style="border:none; background:none; cursor:pointer; font-weight:bold; font-size:12px; color:var(--red); padding:0 2px;">×</button>
								</span>
							{/each}
						</div>
						<div style="display:flex; gap:8px; margin-top:4px;">
							<input id="cf-edit-new-opt" type="text" placeholder="Add new option..." bind:value={newOptionText} onkeydown={e => e.key === 'Enter' && (e.preventDefault(), addOptionToEditingCf())} style="flex:1; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px; background:var(--bg); color:var(--text);" />
							<button type="button" class="btn btn-primary btn-sm" onclick={addOptionToEditingCf}>Add</button>
						</div>
					</div>
				{/if}
			</div>
			<div class="form-actions" style="display:flex; justify-content:flex-end; gap:8px; padding:12px 20px; border-top:1px solid var(--border);">
				<button class="btn btn-ghost" onclick={() => editingCf = null}>Cancel</button>
				<button class="btn btn-primary" onclick={saveEditingCf}>Save Changes</button>
			</div>
		</div>
	</div>
{/if}

{#if showNewCfModal}
	<div class="modal-overlay" onclick={e => e.target === e.currentTarget && (showNewCfModal = false)} role="presentation">
		<div class="modal modal-sm" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 440px; box-shadow: var(--shadow-lg);">
			<div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border);">
				<h3 style="font-size: 16px; font-weight: 600; margin: 0;">New Custom Field</h3>
				<button class="btn-icon" onclick={() => showNewCfModal = false} style="font-size:20px; line-height:1; cursor:pointer;">×</button>
			</div>
			<div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
				<div class="form-group" style="margin-bottom:0;">
					<label for="cf-new-key">Field Key (lowercase, unique)</label>
					<input id="cf-new-key" type="text" bind:value={newCfKey} placeholder="scent_preference" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px; background:var(--bg); color:var(--text);" />
				</div>
				<div class="form-group" style="margin-bottom:0;">
					<label for="cf-new-label">Field Label</label>
					<input id="cf-new-label" type="text" bind:value={newCfLabel} placeholder="Scent Preference" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px; background:var(--bg); color:var(--text);" />
				</div>
				<div class="form-group" style="margin-bottom:0;">
					<label for="cf-new-type">Field Type</label>
					<select id="cf-new-type" bind:value={newCfType} style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px; background:var(--bg); color:var(--text);">
						<option value="text">Text Input</option>
						<option value="select">Dropdown Choice</option>
					</select>
				</div>
				
				{#if newCfType === 'select'}
					<div class="form-group" style="margin-bottom:0; display:flex; flex-direction:column; gap:6px;">
						<label for="cf-new-opt">Dropdown Options List</label>
						<div style="display:flex; flex-wrap:wrap; gap:6px; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:8px; min-height:48px;">
							{#each newCfOptions as opt, idx}
								<span style="display:inline-flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); padding:2px 8px; border-radius:12px; font-size:12px; color:var(--text);">
									{opt}
									<button type="button" onclick={() => { newCfOptions = newCfOptions.filter((_, i) => i !== idx); }} style="border:none; background:none; cursor:pointer; font-weight:bold; font-size:12px; color:var(--red); padding:0 2px;">×</button>
								</span>
							{/each}
						</div>
						<div style="display:flex; gap:8px; margin-top:4px;">
							<input id="cf-new-opt" type="text" placeholder="Add option..." bind:value={newOptionText} onkeydown={e => e.key === 'Enter' && (e.preventDefault(), addOptionToNewCf())} style="flex:1; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px; background:var(--bg); color:var(--text);" />
							<button type="button" class="btn btn-primary btn-sm" onclick={addOptionToNewCf}>Add</button>
						</div>
					</div>
				{/if}
			</div>
			<div class="form-actions" style="display:flex; justify-content:flex-end; gap:8px; padding:12px 20px; border-top:1px solid var(--border);">
				<button class="btn btn-ghost" onclick={() => showNewCfModal = false}>Cancel</button>
				<button class="btn btn-primary" onclick={saveNewCf}>Create Field</button>
			</div>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={showCfDeleteConfirm}
	title="Delete This Custom Field?"
	message="This field will be removed from settings and may affect existing orders that contain custom data."
	confirmText="Yes, Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={confirmRemoveCf}
/>

<style>
	.page { padding: 24px 32px; max-width: 1100px; margin: 0 auto; }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.breadcrumb { display: flex; align-items: center; gap: 8px; }
	.breadcrumb-icon { font-size: 20px; }
	.breadcrumb h1 { font-size: 24px; font-weight: 600; }

	.settings-layout { display: flex; gap: 24px; }
	.settings-nav { width: 180px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; }
	.nav-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: none; background: none; border-radius: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
	.nav-item:hover { background: var(--surface-hover); color: var(--text); }
	.nav-item.active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }
	.nav-icon { font-size: 14px; }

	.settings-content { flex: 1; min-width: 0; }
	.settings-section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 24px; }
	.settings-section h2 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
	.settings-section h3 { font-size: 14px; font-weight: 600; margin: 20px 0 12px; }
	.section-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }

	.form-group { margin-bottom: 16px; }
	.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
	.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg); color: var(--text); font-family: var(--font); }
	.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--accent); }
	.form-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
	.form-hint ol { margin: 4px 0 0 16px; padding: 0; }
	.form-hint li { margin-bottom: 4px; }
	.form-hint code { background: var(--surface-hover); padding: 1px 4px; border-radius: 3px; font-size: 11px; }

	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

	.color-input { display: flex; align-items: center; gap: 12px; }
	.color-input input[type="color"] { width: 48px; height: 40px; padding: 2px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; }
	.color-input code { font-family: monospace; color: var(--text-secondary); font-size: 13px; }

	.brand-preview { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 16px; border-top: 3px solid; }
	.preview-header { padding: 10px 16px; color: white; font-weight: 600; font-size: 14px; }
	.preview-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; background: var(--bg); }
	.preview-msg { padding: 8px 12px; border-radius: 12px; font-size: 13px; max-width: 80%; }
	.preview-msg.bot { color: white; border-bottom-right-radius: 4px; align-self: flex-start; }
	.preview-msg.customer { background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 4px; align-self: flex-end; }

	.toggle { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; }
	.toggle input { opacity: 0; width: 0; height: 0; }
	.toggle-slider { position: absolute; inset: 0; background: var(--border); border-radius: 11px; transition: 0.2s; }
	.toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
	.toggle input:checked + .toggle-slider { background: var(--accent); }
	.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
	.toggle-label { font-size: 13px; margin-left: 8px; }

	.toggle-list { display: flex; flex-direction: column; gap: 0; }
	.toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); }
	.toggle-item:last-child { border-bottom: none; }
	.toggle-desc { font-size: 12px; color: var(--text-secondary); }

	.bot-test { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
	.bot-test-input { display: flex; gap: 8px; }
	.bot-test-input input { flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; background: var(--surface); color: var(--text); }
	.bot-test-input input:focus { outline: none; border-color: var(--accent); }
	.bot-test-result { margin-top: 12px; padding: 10px; background: var(--surface); border-radius: 6px; font-size: 13px; }
	.bot-test-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px; }

	.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
	.info-item { display: flex; flex-direction: column; gap: 4px; }
	.info-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; }
	.info-value { font-size: 14px; font-weight: 500; }
	.info-value.active { color: var(--green); }
	.info-value.code { font-family: monospace; font-size: 12px; background: var(--surface-hover); padding: 2px 6px; border-radius: 3px; }
	.plan-badge { background: var(--accent-bg); color: var(--accent); padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize; }

	.loading-state { text-align: center; padding: 64px; color: var(--text-secondary); }

	.btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
	.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
	.btn-sm { padding: 6px 12px; font-size: 13px; }

	@media (max-width: 768px) {
		.page { padding: 16px; }
		.page-header { flex-direction: column; gap: 16px; align-items: stretch; }
		
		.settings-layout { flex-direction: column; }
		
		.settings-nav { 
			width: 100%; 
			flex-direction: row; 
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			padding-bottom: 8px;
			gap: 4px;
		}
		
		.nav-item {
			white-space: nowrap;
			padding: 12px 16px;
			min-height: 48px;
			flex-shrink: 0;
		}
		
		.form-grid, .info-grid { grid-template-columns: 1fr; }
		
		/* Better touch targets for form elements */
		.form-group input,
		.form-group select,
		.form-group textarea {
			padding: 12px 14px;
			font-size: 16px;
			min-height: 48px;
		}
		
		/* Color input mobile */
		.color-input {
			flex-wrap: wrap;
		}
		.color-input input[type="color"] {
			width: 100%;
			height: 48px;
		}
		
		/* Toggle mobile */
		.toggle {
			width: 48px;
			height: 28px;
		}
		.toggle-slider::before {
			width: 20px;
			height: 20px;
		}
		.toggle input:checked + .toggle-slider::before {
			transform: translateX(20px);
		}
		
		/* Toggle item layout */
		.toggle-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
		
		/* Bot test */
		.bot-test-input {
			flex-direction: column;
		}
		.bot-test-input input {
			min-height: 48px;
			font-size: 16px;
		}
		
		/* Brand preview */
		.brand-preview {
			margin-left: -16px;
			margin-right: -16px;
			border-radius: 0;
		}
		
		/* Better button touch targets */
		.btn {
			padding: 12px 20px;
			min-height: 48px;
		}
		
		/* Info grid on very small screens */
		@media (max-width: 360px) {
			.info-grid {
				gap: 12px;
			}
			.info-value {
				font-size: 13px;
			}
		}
	}
</style>
