<script lang="ts">
	import { onMount } from 'svelte';
	import { api, timeAgo, showToast } from '$lib/api';
	import type { Conversation, Message, QuickReply, Tag, CustomField } from '$lib/types';
	import AutoOrderExtractor from '$lib/components/AutoOrderExtractor.svelte';

	let conversations = $state<Conversation[]>([]);
	let selectedConv = $state<Conversation | null>(null);
	let messages = $state<Message[]>([]);
	let quickReplies = $state<QuickReply[]>([]);
	let allTags = $state<Tag[]>([]);
	let conversationCustomFields = $state<CustomField[]>([]);
	let loading = $state(true);
	let sendingMessage = $state(false);
	let savingNotes = $state(false);
	let replyText = $state('');
	let notesText = $state('');
	let searchQuery = $state('');
	let messageSearchQuery = $state('');
	let showInfoPanel = $state(false);
	let showEmojiPicker = $state(false);
	let isTyping = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout>;
	let fileInput = $state<HTMLInputElement>();
	let attachedFile = $state<File | null>(null);
	let attachedPreview = $state('');
	let showQuickRepliesPanel = $state(false);
	let activeTab = $state<'all' | 'unread' | 'bots'>('all');
	let showMobileChat = $state(false); // Track mobile chat view state

	let showExtractorModal = $state(false);
	let extractorMessageText = $state('');

	function triggerOrderExtraction(text: string) {
		extractorMessageText = text;
		showExtractorModal = true;
	}

	async function handleOrderExtracted(extracted: { customer_name?: string; product?: string; quantity?: number; price?: number; address?: string; notes?: string; confidence: number }) {
		try {
			const orderPayload = {
				customerName: extracted.customer_name || selectedConv?.name || `Customer ${selectedConv?.sender_id.slice(0, 8)}`,
				amount: extracted.price || 0,
				status: 'new',
				paymentStatus: 'pending',
				notes: `Extracted from message:\n"${extractorMessageText}"\n\nProduct: ${extracted.product || 'Not specified'}\nQuantity: ${extracted.quantity || 1}\nAddress: ${extracted.address || 'Not specified'}\nNotes: ${extracted.notes || ''}`
			};
			await api.createOrder(orderPayload);
			showToast('Order created successfully from message!', 'success');
			showExtractorModal = false;
		} catch (err) {
			showToast('Failed to create order from message.', 'error');
		}
	}

	const commonEmojis = [':)', ':D', '<3', 'OK', 'Thanks', 'Hi', 'Yes', 'No', 'Sorry', 'Busy'];

	let messagesContainer = $state<HTMLDivElement>();

	$effect(() => {
		const container = messagesContainer;
		if (messages.length > 0 && container) {
			setTimeout(() => {
				container.scrollTop = container.scrollHeight;
			}, 100);
		}
	});

	onMount(() => {
		Promise.all([loadConversations(), loadQuickReplies(), loadAllTags(), loadCustomFields()]);
		startPolling();
		return () => stopPolling();
	});

	let pollInterval: ReturnType<typeof setInterval>;

	function startPolling() {
		pollInterval = setInterval(async () => {
			await loadConversations();
			if (selectedConv) {
				await loadMessages(selectedConv.id);
			}
		}, 10000);
	}

	function stopPolling() {
		if (pollInterval) clearInterval(pollInterval);
	}

	async function loadAllTags() {
		try {
			allTags = await api.tags() as Tag[];
		} catch (err) {
			console.error('Failed to load tags:', err);
		}
	}

	async function loadCustomFields() {
		try {
			const cfs = await api.customFields() as CustomField[];
			conversationCustomFields = cfs.filter(cf => cf.apply_to === 'conversations' || cf.apply_to === 'customers');
		} catch (err) {
			console.error('Failed to load custom fields:', err);
		}
	}

	async function loadConversations() {
		try {
			const res = await api.conversations();
			conversations = res.conversations as Conversation[];
			const current = selectedConv;
			if (current) {
				const updated = conversations.find(c => c.id === current.id);
				if (updated) {
					selectedConv = updated;
				}
			}
		} catch (err) {
			console.error('Failed to load conversations:', err);
		} finally {
			loading = false;
		}
	}

	async function loadQuickReplies() {
		try {
			quickReplies = await api.quickReplies() as QuickReply[];
		} catch (err) {
			console.error('Failed to load quick replies:', err);
		}
	}

	async function loadMessages(convId: number) {
		try {
			const res = await api.messages(convId);
			messages = res.messages as Message[];
		} catch (err) {
			showToast('Could not load messages. Please try again.', 'error');
			console.error(err);
		}
	}

	async function selectConversation(conv: Conversation) {
		selectedConv = conv;
		notesText = conv.notes || '';
		showInfoPanel = false;
		showMobileChat = true; // Show chat on mobile when conversation is selected
		await loadMessages(conv.id);
	}

	async function updateConvStatus(status: string) {
		if (!selectedConv) return;
		try {
			selectedConv.status = status;
			await api.updateConversation(selectedConv.id, { status });
			await loadConversations();
			showToast('Status updated.', 'success');
		} catch (err) {
			showToast('Failed to update status.', 'error');
			console.error(err);
		}
	}

	async function toggleBot(isBotEnabled: boolean) {
		if (!selectedConv) return;
		try {
			selectedConv.is_bot_enabled = isBotEnabled;
			await api.updateConversation(selectedConv.id, { is_bot_enabled: isBotEnabled });
			await loadConversations();
			showToast(isBotEnabled ? 'AI Bot enabled.' : 'AI Bot disabled.', 'success');
		} catch (err) {
			showToast('Failed to toggle bot.', 'error');
			console.error(err);
		}
	}

	async function saveNotes() {
		if (!selectedConv) return;
		savingNotes = true;
		try {
			selectedConv.notes = notesText;
			await api.updateConversation(selectedConv.id, { notes: notesText });
			await loadConversations();
			showToast('Notes saved.', 'success');
		} catch (err) {
			showToast('Failed to save notes.', 'error');
			console.error(err);
		} finally {
			savingNotes = false;
		}
	}

	async function addTag(tagKey: string) {
		if (!selectedConv) return;
		const currentTags = selectedConv.tags || [];
		if (currentTags.includes(tagKey)) return;
		const updatedTags = [...currentTags, tagKey];
		try {
			selectedConv.tags = updatedTags;
			await api.updateConversation(selectedConv.id, { tags: updatedTags });
			await loadConversations();
			showToast('Tag added.', 'success');
		} catch (err) {
			showToast('Failed to add tag.', 'error');
			console.error(err);
		}
	}

	async function removeTag(tagKey: string) {
		if (!selectedConv) return;
		const currentTags = selectedConv.tags || [];
		const updatedTags = currentTags.filter(t => t !== tagKey);
		try {
			selectedConv.tags = updatedTags;
			await api.updateConversation(selectedConv.id, { tags: updatedTags });
			await loadConversations();
			showToast('Tag removed.', 'success');
		} catch (err) {
			showToast('Failed to remove tag.', 'error');
			console.error(err);
		}
	}

	async function updateCustomField(key: string, value: unknown) {
		if (!selectedConv) return;
		const updatedCf = { ...(selectedConv.custom_fields || {}), [key]: value };
		try {
			selectedConv.custom_fields = updatedCf;
			await api.updateConversation(selectedConv.id, { custom_fields: updatedCf });
			await loadConversations();
			showToast('Field updated.', 'success');
		} catch (err) {
			showToast('Failed to update custom field.', 'error');
			console.error(err);
		}
	}

	function goBackToList() {
		showMobileChat = false;
		// Optional: keep selectedConv so user can return
	}

	function simulateTyping() {
		isTyping = true;
		clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => { isTyping = false; }, 3000);
	}

	async function sendMessage() {
		if (!replyText.trim() || !selectedConv || sendingMessage) return;

		sendingMessage = true;
		try {
			await api.sendMessage(selectedConv.sender_id, replyText.trim());
			replyText = '';
			await loadMessages(selectedConv.id);
			await loadConversations();
			showToast('Message sent.', 'success');
		} catch (err) {
			showToast('Could not send message. Please try again.', 'error');
			console.error(err);
		} finally {
			sendingMessage = false;
		}
	}

	function useQuickReply(message: string) {
		replyText = message;
		showQuickRepliesPanel = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
		if (e.key === 'Escape') {
			showEmojiPicker = false;
			showQuickRepliesPanel = false;
		}
	}

	function insertEmoji(emoji: string) {
		replyText += emoji;
		showEmojiPicker = false;
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) {
			attachedFile = input.files[0];
			const reader = new FileReader();
			reader.onload = () => { attachedPreview = reader.result as string; };
			reader.readAsDataURL(attachedFile);
		}
	}

	function removeAttachment() {
		attachedFile = null;
		attachedPreview = '';
		if (fileInput) fileInput.value = '';
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer?.files?.[0]) {
			attachedFile = e.dataTransfer.files[0];
			const reader = new FileReader();
			reader.onload = () => { attachedPreview = reader.result as string; };
			reader.readAsDataURL(attachedFile);
		}
	}

	let filteredConversations = $derived(
		searchQuery
			? conversations.filter(c =>
				(c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
				c.sender_id.toLowerCase().includes(searchQuery.toLowerCase())
			)
			: conversations.filter(c => {
				if (activeTab === 'unread') return c.status === 'active';
				if (activeTab === 'bots') return c.is_bot_enabled;
				return true;
			})
	);

	let filteredMessages = $derived(
		messageSearchQuery
			? messages.filter(m =>
				(m.content || '').toLowerCase().includes(messageSearchQuery.toLowerCase())
			)
			: messages
	);

	function getConvPreview(conv: Conversation): string {
		return timeAgo(conv.last_activity_at || conv.updated_at);
	}
</script>

<div class="chat-page" ondragover={handleDragOver} ondrop={handleDrop}>
	<div class="conversations-panel">
		<div class="panel-header">
			<h2>Chats</h2>
			<span class="count">{conversations.length}</span>
		</div>
		<div class="search-box">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
				<path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
			<input type="text" placeholder="Search conversations..." bind:value={searchQuery} />
		</div>
		<div class="conv-tabs">
			<button class="conv-tab" class:active={activeTab === 'all'} onclick={() => activeTab = 'all'}>All</button>
			<button class="conv-tab" class:active={activeTab === 'unread'} onclick={() => activeTab = 'unread'}>Active</button>
			<button class="conv-tab" class:active={activeTab === 'bots'} onclick={() => activeTab = 'bots'}>Bot On</button>
		</div>
		<div class="conversations-list">
			{#each filteredConversations as conv}
				<button
					class="conv-item"
					class:active={selectedConv?.id === conv.id}
					onclick={() => selectConversation(conv)}
				>
					<div class="conv-avatar" class:online={new Date(conv.last_activity_at || conv.updated_at).getTime() > Date.now() - 300000}>
						{(conv.name || conv.sender_id || 'U').charAt(0).toUpperCase()}
					</div>
					<div class="conv-info">
						<div class="conv-header">
							<div class="conv-name">{conv.name || `User ${conv.sender_id.slice(0, 8)}`}</div>
							<div class="conv-time">{getConvPreview(conv)}</div>
						</div>
						<div class="conv-meta">
							{#if conv.tags?.length}
								<div class="conv-tags">
									{#each conv.tags.slice(0, 2) as tag}
										<span class="mini-tag">{tag}</span>
									{/each}
								</div>
							{/if}
							{#if conv.is_bot_enabled}
								<span class="bot-badge"></span>
							{/if}
							<span class="status-badge status-{conv.status}">{conv.status}</span>
						</div>
					</div>
				</button>
			{:else}
				<div class="empty-state">
					<p>No conversations found</p>
				</div>
			{/each}
		</div>
	</div>

	<div class="chat-panel" class:mobile-visible={showMobileChat}>
		{#if selectedConv}
			<div class="chat-header">
				<div class="chat-header-left">
					<button class="mobile-back-btn" onclick={goBackToList} aria-label="Back to conversations">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</button>
					<div class="chat-user">
						<div class="conv-avatar large" class:online={new Date(selectedConv.last_activity_at || selectedConv.updated_at).getTime() > Date.now() - 300000}>
							{(selectedConv.name || selectedConv.sender_id || 'U').charAt(0).toUpperCase()}
						</div>
						<div>
							<div class="chat-user-name">{selectedConv.name || `User ${selectedConv.sender_id.slice(0, 8)}`}</div>
							<div class="chat-user-status">
								{#if isTyping}
									<span class="typing-text">typing...</span>
								{:else}
									<span class="chat-user-id">{selectedConv.sender_id}</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
				<div class="chat-header-right">
					<div class="chat-search">
						<input type="text" placeholder="Search messages..." bind:value={messageSearchQuery} class="chat-search-input" />
					</div>
					<button class="btn-icon" onclick={() => showInfoPanel = !showInfoPanel} title="Info">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4M8 5.5v0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					</button>
				</div>
			</div>

			<div class="chat-body">
				<div class="messages-container" bind:this={messagesContainer}>
					{#each filteredMessages as msg, i}
						<div class="message" class:from-user={msg.sender_type === 'customer'} class:from-bot={msg.sender_type === 'bot'}>
							{#if msg.sender_type === 'customer'}
								<div class="message-avatar">{(selectedConv.name || 'U').charAt(0).toUpperCase()}</div>
							{/if}
							<div class="message-wrapper">
								<div class="message-bubble-row" style="display: flex; align-items: center; gap: 8px; width: 100%;">
									<div class="message-bubble">
										{#if msg.sender_type === 'bot'}
											<div class="message-sender"> Bot</div>
										{/if}
										<div class="message-content">{msg.content}</div>
										{#if msg.media_url}
											<div class="message-media">
												<img src={msg.media_url} alt="attachment" loading="lazy" />
											</div>
										{/if}
									</div>
									{#if msg.sender_type === 'customer' && msg.content}
										<button 
											class="btn-icon btn-extract-order" 
											onclick={() => triggerOrderExtraction(msg.content!)} 
											title="Extract Order from Message"
											aria-label="Extract Order"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
												<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
												<polyline points="14 2 14 8 20 8"></polyline>
												<line x1="16" y1="13" x2="8" y2="13"></line>
												<line x1="16" y1="17" x2="8" y2="17"></line>
												<polyline points="10 9 9 9 8 9"></polyline>
											</svg>
										</button>
									{/if}
								</div>
								<div class="message-meta">
									<span class="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
									{#if msg.sender_type !== 'customer'}
										<span class="message-status"></span>
									{/if}
								</div>
							</div>
						</div>
					{:else}
						<div class="empty-state">
							<div class="empty-icon">
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6; margin-bottom: 8px;">
									<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
								</svg>
							</div>
							<p><strong>No messages yet</strong></p>
							<p style="font-size:13px">Start the conversation by typing a message below.</p>
						</div>
					{/each}
					{#if isTyping}
						<div class="message from-user">
							<div class="message-avatar">{(selectedConv.name || 'U').charAt(0).toUpperCase()}</div>
							<div class="typing-indicator">
								<span></span><span></span><span></span>
							</div>
						</div>
					{/if}
				</div>

				{#if showInfoPanel}
					<div class="info-panel">
						<div class="info-panel-header">
							<h3>Conversation Info</h3>
							<button class="btn-icon" onclick={() => showInfoPanel = false} title="Close info">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
							</button>
						</div>
						
						<div class="info-section profile-section">
							<div class="info-avatar-large">
								{(selectedConv.name || 'U').charAt(0).toUpperCase()}
							</div>
							<h4>{selectedConv.name || `User ${selectedConv.sender_id.slice(0, 8)}`}</h4>
							<p class="info-id">{selectedConv.sender_id}</p>
						</div>

						<div class="info-section">
							<h4 class="section-title">Details</h4>
							<div class="info-form-group">
								<span class="info-label">Status</span>
								<select 
									class="status-select select-{selectedConv.status}" 
									value={selectedConv.status} 
									onchange={(e) => updateConvStatus((e.target as HTMLSelectElement).value)}
								>
									<option value="active">Active</option>
									<option value="closed">Closed</option>
								</select>
							</div>

							<div class="info-form-group toggle-group">
								<span class="info-label">AI Chatbot</span>
								<label class="switch-container">
									<input 
										type="checkbox" 
										checked={selectedConv.is_bot_enabled} 
										onchange={(e) => toggleBot((e.target as HTMLInputElement).checked)} 
									/>
									<span class="switch-slider"></span>
								</label>
							</div>
						</div>

						<div class="info-section">
							<h4 class="section-title">Tags</h4>
							<div class="info-tags-edit">
								{#each selectedConv.tags || [] as tag}
									<span class="tag-chip editable-tag">
										{tag}
										<button class="tag-delete-btn" onclick={() => removeTag(tag)} aria-label="Remove tag">×</button>
									</span>
								{:else}
									<span class="text-muted" style="display:block; margin-bottom:8px;">No tags yet</span>
								{/each}
							</div>
							{#if allTags.length > 0}
								<div class="tag-select-wrapper">
									<select 
										class="tag-select" 
										value="" 
										onchange={(e) => { 
											const val = (e.target as HTMLSelectElement).value; 
											if (val) { addTag(val); (e.target as HTMLSelectElement).value = ''; } 
										}}
									>
										<option value="" disabled selected>+ Add tag...</option>
										{#each allTags.filter(t => !(selectedConv?.tags || []).includes(t.tag_key)) as tag}
											<option value={tag.tag_key}>{tag.tag_label || tag.tag_key}</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>

						<div class="info-section">
							<h4 class="section-title">Notes</h4>
							<div class="notes-wrapper">
								<textarea 
									class="notes-textarea" 
									placeholder="Add notes about this customer..." 
									bind:value={notesText}
									onblur={saveNotes}
								></textarea>
								<div class="notes-footer">
									<span class="notes-status-text">
										{#if savingNotes}Saving...{:else}Saved on blur{/if}
									</span>
									<button 
										class="btn-save-notes" 
										onclick={saveNotes} 
										disabled={savingNotes || notesText === (selectedConv.notes || '')}
									>
										Save
									</button>
								</div>
							</div>
						</div>

						{#if conversationCustomFields.length > 0}
							<div class="info-section">
								<h4 class="section-title">Custom Fields</h4>
								<div class="custom-fields-form">
									{#each conversationCustomFields as cf}
										<div class="custom-field-item">
											<label class="custom-field-label" for="cf-input-{cf.field_key}">{cf.field_label || cf.field_key}</label>
											{#if cf.field_type === 'dropdown'}
												<select 
													id="cf-input-{cf.field_key}"
													class="custom-field-select" 
													value={String((selectedConv.custom_fields || {})[cf.field_key] || '')}
													onchange={(e) => updateCustomField(cf.field_key, (e.target as HTMLSelectElement).value)}
												>
													<option value="">Select...</option>
													{#each cf.field_options || [] as opt}
														<option value={opt}>{opt}</option>
													{/each}
												</select>
											{:else if cf.field_type === 'number'}
												<input 
													id="cf-input-{cf.field_key}"
													type="number" 
													class="custom-field-input" 
													value={Number((selectedConv.custom_fields || {})[cf.field_key] || 0)}
													onchange={(e) => updateCustomField(cf.field_key, Number((e.target as HTMLInputElement).value))}
												/>
											{:else}
												<input 
													id="cf-input-{cf.field_key}"
													type="text" 
													class="custom-field-input" 
													value={String((selectedConv.custom_fields || {})[cf.field_key] || '')}
													onchange={(e) => updateCustomField(cf.field_key, (e.target as HTMLInputElement).value)}
												/>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="info-section metadata-section">
							<div class="info-row">
								<span class="info-label">Created</span>
								<span>{new Date(selectedConv.created_at).toLocaleDateString()}</span>
							</div>
							<div class="info-row">
								<span class="info-label">Last Active</span>
								<span>{timeAgo(selectedConv.last_activity_at || selectedConv.updated_at)}</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if showQuickRepliesPanel && quickReplies.length > 0}
				<div class="quick-replies-panel">
					<div class="qr-header">
						<span>Quick Replies</span>
						<button class="btn-icon" onclick={() => showQuickRepliesPanel = false} title="Close quick replies">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
						</button>
					</div>
					<div class="qr-list">
						{#each quickReplies as qr}
							<button class="qr-item" onclick={() => useQuickReply(qr.message || '')}>
								<span class="qr-label">{qr.label}</span>
								<span class="qr-preview">{(qr.message || '').slice(0, 60)}...</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if attachedPreview}
				<div class="attachment-preview">
					<img src={attachedPreview} alt="attachment preview" />
					<button class="btn-icon danger" onclick={removeAttachment} title="Discard attachment">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
					</button>
				</div>
			{/if}

			<div class="reply-box">
				<div class="reply-actions-left">
					<button class="btn-icon" onclick={() => fileInput?.click()} title="Attach file">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8l-5.5 5.5a3.5 3.5 0 01-5-5L9 3a2 2 0 013 3L7 11a.5.5 0 01-1-1L10 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</button>
					<input type="file" bind:this={fileInput} onchange={handleFileSelect} accept="image/*" style="display:none" />
					<button class="btn-icon" onclick={() => showEmojiPicker = !showEmojiPicker} title="Emoji">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 6.5v0M10.5 6.5v0M5.5 10s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					</button>
					<button class="btn-icon" onclick={() => showQuickRepliesPanel = !showQuickRepliesPanel} title="Quick replies">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
						</svg>
					</button>
				</div>
				<div class="reply-input-wrap">
					<textarea
						placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
						bind:value={replyText}
						onkeydown={handleKeydown}
						rows="1"
					></textarea>
				</div>
				<button
					class="btn btn-primary send-btn"
					onclick={sendMessage}
					disabled={(!replyText.trim() && !attachedFile) || sendingMessage}
				>
					{#if sendingMessage}
						<span class="spinner"></span>
					{:else}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					{/if}
				</button>
			</div>

			{#if showEmojiPicker}
				<div class="emoji-picker">
					<div class="emoji-grid">
						{#each commonEmojis as emoji}
							<button class="emoji-btn" onclick={() => insertEmoji(emoji)}>{emoji}</button>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<!-- Sample chat preview when no conversation is selected -->
			<div class="sample-chat">
				<div class="sample-chat-header">
					<div class="chat-user">
						<div class="conv-avatar large" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
							M
							<span class="sample-online-dot"></span>
						</div>
						<div>
							<div class="chat-user-name">Maria Santos</div>
							<div class="chat-user-status sample-status">Active now</div>
						</div>
					</div>
					<span class="sample-badge">Preview</span>
				</div>
				<div class="sample-messages">
					<!-- Bot greeting -->
					<div class="sample-msg sample-bot">
						<div class="sample-avatar-sm" style="background: linear-gradient(135deg, #3b82f6, #06b6d4);">B</div>
						<div class="sample-bubble-wrap">
							<div class="sample-bubble bot">Hi! 👋 Welcome to Pawperfume. What's your pet's name?</div>
							<div class="sample-meta">Bot · 10:02 AM</div>
						</div>
					</div>
					<!-- User reply -->
					<div class="sample-msg sample-user">
						<div class="sample-bubble-wrap" style="align-items: flex-end;">
							<div class="sample-bubble user">My dog's name is Coco! 🐶</div>
							<div class="sample-meta" style="text-align: right;">You · 10:03 AM ✓✓</div>
						</div>
						<div class="sample-avatar-sm" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">M</div>
					</div>
					<!-- Bot reply -->
					<div class="sample-msg sample-bot">
						<div class="sample-avatar-sm" style="background: linear-gradient(135deg, #3b82f6, #06b6d4);">B</div>
						<div class="sample-bubble-wrap">
							<div class="sample-bubble bot">Aww, Coco! 🐾 What scent is Coco into? Choose one:</div>
							<div class="sample-choices">
								<span class="sample-choice">🌸 Floral</span>
								<span class="sample-choice">🌿 Fresh</span>
								<span class="sample-choice">🍦 Sweet</span>
							</div>
							<div class="sample-meta">Bot · 10:03 AM</div>
						</div>
					</div>
					<!-- User picks -->
					<div class="sample-msg sample-user">
						<div class="sample-bubble-wrap" style="align-items: flex-end;">
							<div class="sample-bubble user">🌸 Floral</div>
							<div class="sample-meta" style="text-align: right;">You · 10:04 AM ✓✓</div>
						</div>
						<div class="sample-avatar-sm" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">M</div>
					</div>
					<!-- Bot final -->
					<div class="sample-msg sample-bot">
						<div class="sample-avatar-sm" style="background: linear-gradient(135deg, #3b82f6, #06b6d4);">B</div>
						<div class="sample-bubble-wrap">
							<div class="sample-bubble bot">Perfect! I'll prepare a Floral bundle for Coco. Your order is being processed 🎀</div>
							<div class="sample-meta">Bot · 10:04 AM</div>
						</div>
					</div>
					<!-- Typing indicator -->
					<div class="sample-msg sample-bot">
						<div class="sample-avatar-sm" style="background: linear-gradient(135deg, #3b82f6, #06b6d4);">M</div>
						<div class="sample-typing">
							<span></span><span></span><span></span>
						</div>
					</div>
				</div>
				<div class="sample-reply">
					<div class="sample-reply-input">Select a real conversation to reply →</div>
					<button class="sample-send-btn" disabled aria-label="Send (disabled preview)">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</button>
				</div>
				<div class="sample-hint">← Select a conversation to start responding</div>
			</div>
		{/if}
	</div>
	<AutoOrderExtractor 
		open={showExtractorModal} 
		messageText={extractorMessageText} 
		onCreate={handleOrderExtracted} 
		onClose={() => showExtractorModal = false} 
	/>
</div>

<style>
	.chat-page { display: flex; height: 100vh; overflow: hidden; }

	.conversations-panel {
		width: 340px; border-right: 1px solid var(--border); display: flex;
		flex-direction: column; background: var(--surface); flex-shrink: 0;
	}

	.panel-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
	.panel-header h2 { font-size: 16px; font-weight: 600; }
	.count { background: var(--surface-hover); padding: 2px 8px; border-radius: 10px; font-size: 12px; color: var(--text-secondary); }

	.search-box { padding: 8px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
	.search-box svg { color: var(--text-tertiary); flex-shrink: 0; }
	.search-box input { flex: 1; border: none; background: transparent; font-size: 13px; color: var(--text); }
	.search-box input:focus { outline: none; }

	.conv-tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 8px; }
	.conv-tab { padding: 8px 12px; border: none; background: none; font-size: 12px; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; }
	.conv-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 500; }
	.conv-tab:hover { color: var(--text); }

	.conversations-list { flex: 1; overflow-y: auto; }

	.conv-item {
		width: 100%; padding: 10px 16px; border: none; background: transparent;
		display: flex; align-items: flex-start; gap: 10px; cursor: pointer;
		transition: background 0.15s; text-align: left;
	}
	.conv-item:hover { background: var(--surface-hover); }
	.conv-item.active { background: var(--accent-bg); }

	.conv-avatar {
		width: 40px; height: 40px; border-radius: 50%; background: var(--accent);
		color: white; display: flex; align-items: center; justify-content: center;
		font-weight: 600; font-size: 15px; flex-shrink: 0; position: relative;
	}
	.conv-avatar.large { width: 44px; height: 44px; font-size: 16px; }

	.conv-avatar.online::after {
		content: ''; position: absolute; bottom: 1px; right: 1px;
		width: 10px; height: 10px; border-radius: 50%; background: #22c55e;
		border: 2px solid var(--surface);
	}

	.conv-info { flex: 1; min-width: 0; }
	.conv-header { display: flex; justify-content: space-between; align-items: baseline; }
	.conv-name { font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.conv-time { font-size: 11px; color: var(--text-tertiary); flex-shrink: 0; margin-left: 8px; }
	.conv-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
	.conv-tags { display: flex; gap: 4px; }
	.mini-tag { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: var(--accent-bg); color: var(--accent); }
	.bot-badge { font-size: 11px; }
	.status-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; text-transform: capitalize; }
	.status-active { background: var(--green-bg, #dcfce7); color: var(--green, #16a34a); }
	.status-closed { background: var(--surface-hover); color: var(--text-secondary); }

	.chat-panel { flex: 1; display: flex; flex-direction: column; background: var(--bg); min-width: 0; }

	.chat-header {
		padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex;
		align-items: center; justify-content: space-between; background: var(--surface);
	}
	.chat-header-left { display: flex; align-items: center; gap: 12px; }
	.chat-header-right { display: flex; align-items: center; gap: 8px; }
	.chat-user { display: flex; align-items: center; gap: 10px; }
	.chat-user-name { font-weight: 600; font-size: 14px; }
	.chat-user-status { font-size: 12px; color: var(--text-secondary); }
	.typing-text { color: var(--green, #16a34a); font-style: italic; }

	.chat-search-input {
		border: 1px solid var(--border); border-radius: 6px; padding: 5px 10px;
		font-size: 12px; background: var(--bg); color: var(--text); width: 180px;
	}
	.chat-search-input:focus { outline: none; border-color: var(--accent); }

	.chat-body { flex: 1; display: flex; overflow: hidden; position: relative; }

	.messages-container {
		flex: 1; overflow-y: auto; padding: 20px; display: flex;
		flex-direction: column; gap: 8px;
	}

	.message { display: flex; gap: 8px; align-items: flex-end; }
	.message.from-user { justify-content: flex-start; }
	.message:not(.from-user) { justify-content: flex-end; flex-direction: row-reverse; }
	.message:not(.from-user) .message-wrapper { align-items: flex-end; }
	.message:not(.from-user) .message-meta { justify-content: flex-end; }

	.message-avatar {
		width: 28px; height: 28px; border-radius: 50%; background: var(--accent);
		color: white; display: flex; align-items: center; justify-content: center;
		font-weight: 600; font-size: 11px; flex-shrink: 0; opacity: 0.7;
	}
	.message:not(.from-user) .message-avatar { background: var(--text-secondary); }

	.message-wrapper { max-width: 65%; display: flex; flex-direction: column; }
	.message-bubble {
		padding: 8px 14px; font-size: 14px; line-height: 1.5; border: none;
	}
	.message.from-user .message-bubble { 
		background: var(--surface3); 
		color: var(--text);
		border-radius: 18px 18px 18px 4px; 
	}
	.message:not(.from-user) .message-bubble { 
		background: var(--accent); 
		color: white; 
		border-radius: 18px 18px 4px 18px; 
	}
	.message-sender { font-size: 11px; font-weight: 600; opacity: 0.7; margin-bottom: 4px; }
	.message-content { word-wrap: break-word; }
	.message-media { margin-top: 8px; }
	.message-media img { max-width: 200px; border-radius: 8px; }
	.message-meta { display: flex; align-items: center; gap: 4px; padding: 2px 4px; }
	.message-time { font-size: 10px; color: var(--text-tertiary); }
	.message-status { font-size: 10px; color: var(--accent); }

	.typing-indicator {
		display: flex; gap: 4px; padding: 12px 16px; background: var(--surface);
		border: 1px solid var(--border); border-radius: 12px; border-bottom-left-radius: 4px;
	}
	.typing-indicator span {
		width: 6px; height: 6px; border-radius: 50%; background: var(--text-tertiary);
		animation: typingBounce 1.4s infinite ease-in-out;
	}
	.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
	.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
	@keyframes typingBounce {
		0%, 80%, 100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		40% {
			transform: translateY(-3px);
			opacity: 1;
		}
	}

	.info-panel {
		width: 300px; border-left: 1px solid var(--border); background: var(--surface);
		overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column;
	}
	.info-panel-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
	.info-panel-header h3 { font-size: 14px; font-weight: 600; }
	.info-section { padding: 16px; border-bottom: 1px solid var(--border); }
	.profile-section { display: flex; flex-direction: column; align-items: center; text-align: center; }
	.info-avatar-large { width: 64px; height: 64px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; margin: 0 auto 12px; }
	.info-section h4.section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.5px; margin-bottom: 12px; text-align: left; }
	.info-id { text-align: center; font-size: 12px; color: var(--text-secondary); word-break: break-all; }
	.info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; }
	.info-label { font-size: 12px; color: var(--text-secondary); }
	
	/* Interactive CRM Form elements */
	.info-form-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
	.info-form-group.toggle-group { margin-bottom: 0; }
	.status-select {
		padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid transparent; cursor: pointer; text-transform: uppercase; outline: none; transition: all 0.15s;
	}
	.status-select.select-active { background: var(--green-bg); color: var(--green); border-color: rgba(34, 197, 94, 0.2); }
	.status-select.select-closed { background: var(--surface-hover); color: var(--text-secondary); border-color: var(--border); }
	
	/* Switch Toggle for AI Bot */
	.switch-container { position: relative; display: inline-block; width: 40px; height: 20px; }
	.switch-container input { opacity: 0; width: 0; height: 0; }
	.switch-slider {
		position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border);
		transition: .2s; border-radius: 20px;
	}
	.switch-slider:before {
		position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px;
		background-color: white; transition: .2s; border-radius: 50%;
	}
	input:checked + .switch-slider { background-color: var(--accent); }
	input:checked + .switch-slider:before { transform: translateX(20px); }

	/* Tags Editing */
	.info-tags-edit { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
	.tag-chip.editable-tag {
		font-size: 11px; padding: 2px 6px 2px 10px; border-radius: 12px; background: var(--accent-bg); color: var(--accent);
		display: inline-flex; align-items: center; gap: 4px;
	}
	.tag-delete-btn {
		background: none; border: none; font-size: 14px; font-weight: bold; cursor: pointer; padding: 0 2px;
		color: var(--accent); opacity: 0.6; display: inline-flex; align-items: center; justify-content: center; line-height: 1; transition: opacity 0.15s;
	}
	.tag-delete-btn:hover { opacity: 1; color: var(--red); }
	
	.tag-select-wrapper { width: 100%; }
	.tag-select {
		width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-hover);
		color: var(--text); font-size: 12px; cursor: pointer; outline: none;
	}
	.tag-select:focus { border-color: var(--accent); }

	/* Notes Section */
	.notes-wrapper { display: flex; flex-direction: column; gap: 6px; }
	.notes-textarea {
		width: 100%; min-height: 80px; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);
		background: var(--surface-hover); color: var(--text); font-size: 12px; font-family: inherit; resize: vertical; outline: none;
	}
	.notes-textarea:focus { border-color: var(--accent); background: var(--surface-active); }
	.notes-footer { display: flex; justify-content: space-between; align-items: center; }
	.notes-status-text { font-size: 10px; color: var(--text-tertiary); font-style: italic; }
	.btn-save-notes {
		padding: 4px 10px; font-size: 11px; font-weight: 500; border-radius: 6px; border: none;
		background: var(--accent); color: white; cursor: pointer; transition: opacity 0.15s;
	}
	.btn-save-notes:disabled { opacity: 0.5; cursor: not-allowed; }

	/* Custom Fields */
	.custom-fields-form { display: flex; flex-direction: column; gap: 10px; }
	.custom-field-item { display: flex; flex-direction: column; gap: 4px; }
	.custom-field-label { font-size: 11px; color: var(--text-secondary); font-weight: 500; }
	.custom-field-input, .custom-field-select {
		padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-hover);
		color: var(--text); font-size: 12px; outline: none; width: 100%;
	}
	.custom-field-input:focus, .custom-field-select:focus { border-color: var(--accent); background: var(--surface-active); }
	
	.metadata-section { padding-top: 8px; padding-bottom: 8px; border-bottom: none; font-size: 11px; color: var(--text-tertiary); }
	.metadata-section .info-row { padding: 4px 0; }
	.metadata-section .info-label { font-size: 11px; color: var(--text-tertiary); }

	.quick-replies-panel { border-top: 1px solid var(--border); background: var(--surface); max-height: 200px; overflow-y: auto; }
	.qr-header { padding: 8px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; }
	.qr-list { padding: 4px; }
	.qr-item { width: 100%; text-align: left; padding: 8px 12px; border: none; background: none; cursor: pointer; border-radius: 6px; }
	.qr-item:hover { background: var(--surface-hover); }
	.qr-label { font-weight: 500; font-size: 13px; display: block; }
	.qr-preview { font-size: 11px; color: var(--text-secondary); display: block; margin-top: 2px; }

	.attachment-preview { padding: 8px 20px; background: var(--surface); border-top: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
	.attachment-preview img { height: 48px; border-radius: 6px; object-fit: cover; }

	.reply-box {
		padding: 12px 16px; border-top: 1px solid var(--border); display: flex;
		gap: 12px; align-items: center; background: var(--surface);
	}
	.reply-actions-left { display: flex; gap: 6px; }
	.reply-input-wrap { flex: 1; }
	.reply-input-wrap textarea {
		width: 100%; padding: 10px 16px; border: none; border-radius: 20px;
		background: var(--surface-hover); color: var(--text); font-size: 14px; resize: none;
		min-height: 38px; max-height: 120px; font-family: var(--font);
		outline: none;
	}
	.reply-input-wrap textarea:focus { background: var(--surface-active); }
	.send-btn { padding: 8px 16px; }

	.emoji-picker {
		position: absolute; bottom: 60px; left: 40px; background: var(--surface);
		border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow-lg);
		padding: 8px; z-index: 50;
	}
	.emoji-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; }
	.emoji-btn { width: 32px; height: 32px; border: none; background: none; font-size: 18px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
	.emoji-btn:hover { background: var(--surface-hover); }

	.btn { padding: 8px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
	.btn-primary { background: var(--accent); color: white; }
	.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-icon {
		background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px;
		color: var(--text-secondary); display: flex; align-items: center; justify-content: center;
		transition: all 0.15s;
	}
	.btn-icon:hover { background: var(--surface-hover); color: var(--text); }
	.btn-icon.danger:hover { color: var(--red); }

	.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }



	.empty-state { text-align: center; padding: 48px 24px; color: var(--text-secondary); }
	.empty-icon { font-size: 48px; margin-bottom: 12px; }
	.text-muted { color: var(--text-tertiary); font-size: 12px; }

	/* Mobile back button - hidden on desktop */
	.mobile-back-btn {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px;
		margin: -8px;
		margin-right: 4px;
		color: var(--text);
		border-radius: var(--radius);
		transition: background 0.15s;
	}
	.mobile-back-btn:hover { background: var(--surface-hover); }

	/* ── Sample Chat Preview ─────────────────────────────────── */
	.sample-chat {
		flex: 1; display: flex; flex-direction: column; background: var(--bg);
		min-width: 0;
	}
	.sample-chat-header {
		padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex;
		align-items: center; justify-content: space-between; background: var(--surface);
		flex-shrink: 0;
	}
	.sample-online-dot {
		position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px;
		border-radius: 50%; background: #22c55e; border: 2px solid var(--surface);
	}
	.sample-status { color: #22c55e; font-style: italic; }
	.sample-badge {
		font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
		background: rgba(99, 102, 241, 0.12); color: #6366f1; padding: 3px 8px;
		border-radius: 20px; border: 1px solid rgba(99, 102, 241, 0.2);
	}
	.sample-messages {
		flex: 1; overflow-y: auto; padding: 20px 20px 12px;
		display: flex; flex-direction: column; gap: 12px;
	}
	.sample-msg { display: flex; gap: 8px; align-items: flex-end; }
	.sample-bot { justify-content: flex-start; }
	.sample-user { justify-content: flex-end; }
	.sample-avatar-sm {
		width: 28px; height: 28px; border-radius: 50%; color: white;
		display: flex; align-items: center; justify-content: center;
		font-weight: 700; font-size: 11px; flex-shrink: 0;
	}
	.sample-bubble-wrap { display: flex; flex-direction: column; max-width: 62%; gap: 4px; }
	.sample-bubble {
		padding: 10px 14px; font-size: 14px; line-height: 1.5;
		word-wrap: break-word;
	}
	.sample-bubble.bot {
		background: var(--surface3, var(--surface));
		border: 1px solid var(--border);
		border-radius: 18px 18px 18px 4px;
		color: var(--text);
	}
	.sample-bubble.user {
		background: var(--accent);
		color: white;
		border-radius: 18px 18px 4px 18px;
	}
	.sample-meta { font-size: 10px; color: var(--text-tertiary); padding: 0 4px; }
	.sample-choices { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
	.sample-choice {
		padding: 5px 12px; border: 1px solid var(--accent); border-radius: 16px;
		font-size: 12px; color: var(--accent); background: var(--accent-bg);
		cursor: default; font-weight: 500;
	}
	.sample-typing {
		display: inline-flex; gap: 4px; padding: 12px 16px;
		background: var(--surface3, var(--surface));
		border: 1px solid var(--border);
		border-radius: 18px 18px 18px 4px;
	}
	.sample-typing span {
		width: 7px; height: 7px; border-radius: 50%;
		background: var(--text-tertiary);
		animation: sampleTyping 1.4s infinite ease-in-out;
	}
	.sample-typing span:nth-child(2) { animation-delay: 0.2s; }
	.sample-typing span:nth-child(3) { animation-delay: 0.4s; }
	@keyframes sampleTyping {
		0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
		40% { transform: translateY(-4px); opacity: 1; }
	}
	.sample-reply {
		display: flex; gap: 10px; align-items: center;
		padding: 12px 16px; border-top: 1px solid var(--border);
		background: var(--surface); flex-shrink: 0;
	}
	.sample-reply-input {
		flex: 1; padding: 10px 16px; border-radius: 20px;
		background: var(--surface-hover); color: var(--text-tertiary);
		font-size: 13px; font-style: italic;
	}
	.sample-send-btn {
		width: 36px; height: 36px; border-radius: 50%; background: var(--accent);
		border: none; display: flex; align-items: center; justify-content: center;
		color: white; opacity: 0.4; cursor: not-allowed;
	}
	.sample-hint {
		text-align: center; font-size: 11px; color: var(--text-tertiary);
		padding: 6px 16px 10px; background: var(--surface);
		border-top: 1px solid var(--border); flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.chat-page { position: relative; }
		
		.conversations-panel { 
			width: 100%; 
			position: absolute;
			inset: 0;
			z-index: 10;
		}
		
		.chat-panel { 
			display: flex;
			position: absolute;
			inset: 0;
			z-index: 20;
			transform: translateX(100%);
			transition: transform 0.2s ease;
		}
		
		.chat-panel.mobile-visible {
			transform: translateX(0);
		}
		
		.mobile-back-btn { display: flex; }
		
		.info-panel { 
			position: absolute;
			right: 0;
			top: 0;
			bottom: 0;
			width: 100%;
			z-index: 30;
		}
		
		/* Improve touch targets on mobile */
		.conv-item { padding: 14px 16px; }
		.btn-icon { padding: 12px; min-width: 44px; min-height: 44px; }
		.reply-actions-left .btn-icon { padding: 10px; }
		.send-btn { padding: 12px 20px; min-height: 44px; }
		.conv-tab { padding: 12px 16px; min-height: 44px; }
		
		/* Better reply box on mobile */
		.reply-box { padding: 12px 16px; }
		.reply-input-wrap textarea { font-size: 16px; padding: 12px; }
		
		/* Improve search on mobile */
		.search-box { padding: 12px 16px; }
		.search-box input { font-size: 16px; }
		.chat-search-input { 
			width: 120px; 
			font-size: 16px; 
			padding: 8px 12px; 
		}
		
		/* Better emoji picker on mobile */
		.emoji-picker {
			left: 16px;
			right: 16px;
			bottom: 80px;
			width: auto;
		}
		.emoji-grid { grid-template-columns: repeat(7, 1fr); }
	}

	.btn-extract-order {
		opacity: 0;
		transition: opacity 0.2s ease;
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: var(--shadow-sm);
		padding: 6px;
		border-radius: 6px;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
	}
	.btn-extract-order:hover {
		color: var(--accent);
		border-color: var(--accent);
		background: var(--accent-bg);
	}
	.message-wrapper:hover .btn-extract-order {
		opacity: 1;
	}
</style>
