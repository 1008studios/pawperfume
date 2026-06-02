// Swipe gesture detection utility for mobile

export interface SwipeConfig {
	threshold?: number; // Minimum distance for a swipe (default: 50px)
	timeout?: number; // Maximum time for a swipe (default: 300ms)
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	onSwipeUp?: () => void;
	onSwipeDown?: () => void;
}

export function createSwipeDetector(element: HTMLElement, config: SwipeConfig = {}) {
	const {
		threshold = 50,
		timeout = 300,
		onSwipeLeft,
		onSwipeRight,
		onSwipeUp,
		onSwipeDown
	} = config;

	let startX = 0;
	let startY = 0;
	let startTime = 0;
	let isTracking = false;

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0];
		startX = touch.clientX;
		startY = touch.clientY;
		startTime = Date.now();
		isTracking = true;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!isTracking) return;
		isTracking = false;

		const touch = e.changedTouches[0];
		const endX = touch.clientX;
		const endY = touch.clientY;
		const endTime = Date.now();

		const deltaX = endX - startX;
		const deltaY = endY - startY;
		const deltaTime = endTime - startTime;

		// Check if swipe was fast enough
		if (deltaTime > timeout) return;

		const absDeltaX = Math.abs(deltaX);
		const absDeltaY = Math.abs(deltaY);

		// Determine if horizontal or vertical swipe
		if (absDeltaX > absDeltaY) {
			// Horizontal swipe
			if (absDeltaX >= threshold) {
				if (deltaX > 0) {
					onSwipeRight?.();
				} else {
					onSwipeLeft?.();
				}
			}
		} else {
			// Vertical swipe
			if (absDeltaY >= threshold) {
				if (deltaY > 0) {
					onSwipeDown?.();
				} else {
					onSwipeUp?.();
				}
			}
		}
	}

	// Add event listeners
	element.addEventListener('touchstart', handleTouchStart, { passive: true });
	element.addEventListener('touchend', handleTouchEnd, { passive: true });

	// Return cleanup function
	return () => {
		element.removeEventListener('touchstart', handleTouchStart);
		element.removeEventListener('touchend', handleTouchEnd);
	};
}

// Svelte action for easy use in components
export function swipe(node: HTMLElement, config: SwipeConfig) {
	let cleanup = createSwipeDetector(node, config);

	return {
		update(newConfig: SwipeConfig) {
			cleanup();
			cleanup = createSwipeDetector(node, newConfig);
		},
		destroy() {
			cleanup();
		}
	};
}
