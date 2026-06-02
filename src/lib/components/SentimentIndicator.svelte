<script lang="ts">
	interface SentimentResult {
		score: number; // -1 to 1
		label: 'positive' | 'neutral' | 'negative';
		emoji: string;
		color: string;
	}

	interface Props {
		text: string;
		showDetails?: boolean;
	}

	let { text, showDetails = true }: Props = $props();

	// Simple sentiment analysis based on keyword matching
	// In production, this would call an AI API
	let sentiment = $derived<SentimentResult>(() => {
		if (!text || text.trim().length === 0) {
			return { score: 0, label: 'neutral', emoji: '', color: '#6b7280' };
		}

		const positiveWords = [
			'thank', 'thanks', 'great', 'good', 'excellent', 'perfect', 'love', 'amazing',
			'wonderful', 'fantastic', 'happy', 'pleased', 'satisfied', 'nice', 'awesome',
			'beautiful', 'best', 'helpful', 'kind', 'friendly', 'salamat', 'maganda',
			'magaling', 'saya', 'masaya', 'okay', 'ok'
		];

		const negativeWords = [
			'bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointed',
			'angry', 'frustrated', 'annoyed', 'upset', 'unhappy', 'slow', 'broken',
			'damaged', 'wrong', 'problem', 'issue', 'complaint', 'refund', 'panget',
			'masama', 'galit', 'inis', 'hindi', 'ayaw'
		];

		const lowerText = text.toLowerCase();
		let positiveCount = 0;
		let negativeCount = 0;

		positiveWords.forEach(word => {
			if (lowerText.includes(word)) positiveCount++;
		});

		negativeWords.forEach(word => {
			if (lowerText.includes(word)) negativeCount++;
		});

		const total = positiveCount + negativeCount;
		if (total === 0) {
			return { score: 0, label: 'neutral', emoji: '', color: '#6b7280' };
		}

		const score = (positiveCount - negativeCount) / total;

		if (score > 0.2) {
			return { score, label: 'positive', emoji: '', color: '#10b981' };
		} else if (score < -0.2) {
			return { score, label: 'negative', emoji: '', color: '#ef4444' };
		} else {
			return { score: 0, label: 'neutral', emoji: '', color: '#6b7280' };
		}
	});
</script>

<div class="sentiment-indicator" style="--sentiment-color: {sentiment().color}">
	<div class="sentiment-badge">
		<span class="sentiment-emoji">{sentiment().emoji}</span>
		{#if showDetails}
			<span class="sentiment-label">{sentiment().label}</span>
		{/if}
	</div>

	{#if showDetails}
		<div class="sentiment-bar">
			<div class="sentiment-fill" style="width: {Math.abs(sentiment().score) * 100}%"></div>
		</div>
	{/if}
</div>

<style>
	.sentiment-indicator {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.sentiment-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		background: color-mix(in srgb, var(--sentiment-color) 15%, transparent);
		border-radius: 12px;
		width: fit-content;
	}

	.sentiment-emoji {
		font-size: 16px;
	}

	.sentiment-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--sentiment-color);
		text-transform: capitalize;
	}

	.sentiment-bar {
		height: 4px;
		background: var(--border);
		border-radius: 2px;
		overflow: hidden;
		max-width: 100px;
	}

	.sentiment-fill {
		height: 100%;
		background: var(--sentiment-color);
		border-radius: 2px;
		transition: width 0.3s ease;
	}
</style>
