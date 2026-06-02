// Animation utility functions

export function fadeIn(element: HTMLElement, duration: number = 300): Promise<void> {
	return new Promise((resolve) => {
		element.style.opacity = '0';
		element.style.display = '';
		
		const start = performance.now();
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			
			element.style.opacity = String(progress);
			
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				resolve();
			}
		}
		
		requestAnimationFrame(animate);
	});
}

export function fadeOut(element: HTMLElement, duration: number = 300): Promise<void> {
	return new Promise((resolve) => {
		const start = performance.now();
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			
			element.style.opacity = String(1 - progress);
			
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				element.style.display = 'none';
				resolve();
			}
		}
		
		requestAnimationFrame(animate);
	});
}

export function slideIn(element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right' = 'up', duration: number = 300): Promise<void> {
	return new Promise((resolve) => {
		const transforms = {
			up: 'translateY(20px)',
			down: 'translateY(-20px)',
			left: 'translateX(20px)',
			right: 'translateX(-20px)'
		};
		
		element.style.opacity = '0';
		element.style.transform = transforms[direction];
		element.style.display = '';
		
		const start = performance.now();
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = easeOutCubic(progress);
			
			element.style.opacity = String(eased);
			element.style.transform = `translate${direction === 'up' || direction === 'down' ? 'Y' : 'X'}(${(1 - eased) * 20 * (direction === 'up' || direction === 'left' ? 1 : -1)}px)`;
			
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				element.style.transform = '';
				resolve();
			}
		}
		
		requestAnimationFrame(animate);
	});
}

export function slideOut(element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right' = 'up', duration: number = 300): Promise<void> {
	return new Promise((resolve) => {
		const start = performance.now();
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = easeInCubic(progress);
			
			element.style.opacity = String(1 - eased);
			element.style.transform = `translate${direction === 'up' || direction === 'down' ? 'Y' : 'X'}(${eased * 20 * (direction === 'up' || direction === 'left' ? -1 : 1)}px)`;
			
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				element.style.display = 'none';
				resolve();
			}
		}
		
		requestAnimationFrame(animate);
	});
}

export function scaleIn(element: HTMLElement, duration: number = 300): Promise<void> {
	return new Promise((resolve) => {
		element.style.opacity = '0';
		element.style.transform = 'scale(0.9)';
		element.style.display = '';
		
		const start = performance.now();
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = easeOutBack(progress);
			
			element.style.opacity = String(eased);
			element.style.transform = `scale(${0.9 + (eased * 0.1)})`;
			
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				element.style.transform = '';
				resolve();
			}
		}
		
		requestAnimationFrame(animate);
	});
}

export function scaleOut(element: HTMLElement, duration: number = 300): Promise<void> {
	return new Promise((resolve) => {
		const start = performance.now();
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = easeInCubic(progress);
			
			element.style.opacity = String(1 - eased);
			element.style.transform = `scale(${1 - (eased * 0.1)})`;
			
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				element.style.display = 'none';
				resolve();
			}
		}
		
		requestAnimationFrame(animate);
	});
}

export function shake(element: HTMLElement, intensity: number = 5, duration: number = 500): Promise<void> {
	return new Promise((resolve) => {
		const start = performance.now();
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			
			if (progress < 1) {
				const x = (Math.random() - 0.5) * intensity * (1 - progress);
				const y = (Math.random() - 0.5) * intensity * (1 - progress);
				element.style.transform = `translate(${x}px, ${y}px)`;
				requestAnimationFrame(animate);
			} else {
				element.style.transform = '';
				resolve();
			}
		}
		
		requestAnimationFrame(animate);
	});
}

export function pulse(element: HTMLElement, scale: number = 1.05, duration: number = 300): Promise<void> {
	return new Promise((resolve) => {
		const start = performance.now();
		const halfDuration = duration / 2;
		
		function animate(currentTime: number) {
			const elapsed = currentTime - start;
			
			if (elapsed < halfDuration) {
				const progress = elapsed / halfDuration;
				const eased = easeOutCubic(progress);
				element.style.transform = `scale(${1 + (scale - 1) * eased})`;
			} else if (elapsed < duration) {
				const progress = (elapsed - halfDuration) / halfDuration;
				const eased = easeInCubic(progress);
				element.style.transform = `scale(${scale - (scale - 1) * eased})`;
			} else {
				element.style.transform = '';
				resolve();
				return;
			}
			
			requestAnimationFrame(animate);
		}
		
		requestAnimationFrame(animate);
	});
}

// Easing functions
export function linear(t: number): number {
	return t;
}

export function easeInQuad(t: number): number {
	return t * t;
}

export function easeOutQuad(t: number): number {
	return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeInCubic(t: number): number {
	return t * t * t;
}

export function easeOutCubic(t: number): number {
	return (--t) * t * t + 1;
}

export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

export function easeOutBack(t: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutElastic(t: number): number {
	if (t === 0 || t === 1) return t;
	return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}

// CSS transition helper
export function transition(element: HTMLElement, properties: Record<string, string>, duration: number = 300, easing: string = 'ease'): Promise<void> {
	return new Promise((resolve) => {
		const transitionValue = Object.keys(properties)
			.map(prop => `${prop} ${duration}ms ${easing}`)
			.join(', ');
		
		element.style.transition = transitionValue;
		
		Object.entries(properties).forEach(([prop, value]) => {
			element.style.setProperty(prop, value);
		});
		
		setTimeout(() => {
			element.style.transition = '';
			resolve();
		}, duration);
	});
}

// Stagger animation for multiple elements
export function stagger(
	elements: HTMLElement[],
	animation: (el: HTMLElement, index: number) => Promise<void>,
	staggerDelay: number = 50
): Promise<void> {
	return new Promise((resolve) => {
		let completed = 0;
		
		elements.forEach((element, index) => {
			setTimeout(async () => {
				await animation(element, index);
				completed++;
				
				if (completed === elements.length) {
					resolve();
				}
			}, index * staggerDelay);
		});
	});
}
