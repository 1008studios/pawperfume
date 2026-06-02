import { writable } from 'svelte/store';

export function createDebounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;
	
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

export function createDebouncedStore<T>(initialValue: T, delay: number = 300) {
	const { subscribe, set, update } = writable(initialValue);
	
	let timeoutId: ReturnType<typeof setTimeout>;
	
	const debouncedSet = (value: T) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => set(value), delay);
	};
	
	return {
		subscribe,
		set: debouncedSet,
		update: (fn: (value: T) => T) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => update(fn), delay);
		},
		setImmediate: set
	};
}
