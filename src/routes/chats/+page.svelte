<script lang="ts">
	import { onMount } from 'svelte';
	import { api, timeAgo, showToast } from '$lib/api';
	import type { Conversation, Message, QuickReply } from '$lib/types';

	let conversations = $state<Conversation[]>([]);
	let selectedConv = $state<Conversation | null>(null);
	let messages = $state<Message[]>([]);
	let quickReplies = $state<QuickReply[]>([]);
	let loading = $state(true);
	let sendingMessage = $state(false);
	let replyText = $state('');
	let searchQuery = $state('');
	let messageSearchQuery = $state('');
	let showInfoPanel = $state(false);
	let showEmojiPicker = $state(false);
	let isTyping = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout>;
	let fileInput: HTMLInputElement;
	let attachedFile: File | null = null;
	let attachedPreview = $state('');
	let showQuickRepliesPanel = $state(false);
	let activeTab = $state<'all' | 'unread' | 'bots'>('all');
	let showMobileChat = $state(false); // Track mobile chat view state

	const commonEmojis = [':)', ':D', '<3', 'OK', 'Thanks', 'Hi', 'Yes', 'No', 'Sorry', 'Busy'];

	let messagesContainer: HTMLDivElement;

	$effect(() => {
		if (messages.length > 0 && messagesContainer) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 100);
		}
	});

	onMount(() => {
		Promise.all([loadConversations(), loadQuickReplies()]);
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

	async function loadConversations() {
		try {
			const res = await api.conversations();
			conversations = res.conversations as Conversation[];
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
		showInfoPanel = false;
		showMobileChat = true; // Show chat on mobile when conversation is selected
		await loadMessages(conv.id);
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
							<button class="btn-icon" onclick={() => showInfoPanel = false}></button>
						</div>
						<div class="info-section">
							<div class="info-avatar-large">
								{(selectedConv.name || 'U').charAt(0).toUpperCase()}
							</div>
							<h4>{selectedConv.name || `User ${selectedConv.sender_id.slice(0, 8)}`}</h4>
							<p class="info-id">{selectedConv.sender_id}</p>
						</div>
						<div class="info-section">
							<div class="info-row">
								<span class="info-label">Status</span>
								<span class="status-badge status-{selectedConv.status}">{selectedConv.status}</span>
							</div>
							<div class="info-row">
								<span class="info-label">Bot</span>
								<span>{selectedConv.is_bot_enabled ? 'Enabled' : 'Disabled'}</span>
							</div>
							<div class="info-row">
								<span class="info-label">Tags</span>
								<div class="info-tags">
									{#each selectedConv.tags || [] as tag}
										<span class="tag-chip">{tag}</span>
									{:else}
										<span class="text-muted">None</span>
									{/each}
								</div>
							</div>
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
						<button class="btn-icon" onclick={() => showQuickRepliesPanel = false}></button>
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
					<button class="btn-icon danger" onclick={removeAttachment}></button>
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
			<div class="no-selection">
				<div class="empty-icon">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="url(#messenger-grad)" style="filter: drop-shadow(0 4px 12px rgba(0, 132, 255, 0.15));">
						<defs>
							<linearGradient id="messenger-grad" x1="0%" y1="100%" x2="100%" y2="0%">
								<stop offset="0%" stop-color="#0066ff"/>
								<stop offset="50%" stop-color="#0084ff"/>
								<stop offset="100%" stop-color="#00c6ff"/>
							</linearGradient>
						</defs>
						<path d="M12 2C6.477 2 2 6.14 2 11.24c0 2.914 1.455 5.518 3.733 7.172V22l3.414-1.875A10.87 10.87 0 0012 20.48c5.523 0 10-4.14 10-9.24C22 6.14 17.523 2 12 2zm1.146 11.53l-2.072-2.215-4.043 2.215 4.443-4.717 2.11 2.215 4.004-2.215-4.442 4.722z"/>
					</svg>
				</div>
				<h3>Messenger Inbox</h3>
				<p>Select a conversation to start chatting</p>
				<p class="hint">Use <kbd>Ctrl</kbd>+<kbd>K</kbd> for quick actions</p>
			</div>
		{/if}
	</div>
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
	.conv-avatar.large { width: 36px; height: 36px; font-size: 14px; }

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
	@keyframes typingBounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }

	.info-panel {
		width: 280px; border-left: 1px solid var(--border); background: var(--surface);
		overflow-y: auto; flex-shrink: 0;
	}
	.info-panel-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
	.info-panel-header h3 { font-size: 14px; font-weight: 600; }
	.info-section { padding: 16px; border-bottom: 1px solid var(--border); }
	.info-avatar-large { width: 64px; height: 64px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; margin: 0 auto 12px; }
	.info-section h4 { text-align: center; margin-bottom: 4px; }
	.info-id { text-align: center; font-size: 12px; color: var(--text-secondary); }
	.info-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 0; }
	.info-label { font-size: 12px; color: var(--text-secondary); }
	.info-tags { display: flex; gap: 4px; flex-wrap: wrap; }
	.tag-chip { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: var(--accent-bg); color: var(--accent); }

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

	.no-selection {
		flex: 1; display: flex; flex-direction: column; align-items: center;
		justify-content: center; color: var(--text-secondary);
	}
	.no-selection h3 { margin: 8px 0 4px; color: var(--text); }
	.no-selection .hint { font-size: 12px; margin-top: 12px; }
	.no-selection kbd { background: var(--surface-hover); padding: 1px 6px; border-radius: 3px; font-size: 11px; border: 1px solid var(--border); }

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
</style>
