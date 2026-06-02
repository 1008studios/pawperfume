// Optimistic UI update utility

interface OptimisticUpdateOptions<T> {
	data: T[];
	id: string | number;
	updates: Partial<T>;
	apiCall: () => Promise<any>;
	onSuccess?: (result: any) => void;
	onError?: (error: Error) => void;
	onRevert?: () => void;
}

export async function optimisticUpdate<T extends { id: string | number }>({
	data,
	id,
	updates,
	apiCall,
	onSuccess,
	onError,
	onRevert
}: OptimisticUpdateOptions<T>): Promise<T[]> {
	// Store original item
	const originalItem = data.find(item => item.id === id);
	if (!originalItem) {
		throw new Error(`Item with id ${id} not found`);
	}

	// Apply optimistic update immediately
	const optimisticData = data.map(item =>
		item.id === id ? { ...item, ...updates } : item
	);

	try {
		// Make API call
		const result = await apiCall();
		
		// Call success callback
		if (onSuccess) {
			onSuccess(result);
		}

		return optimisticData;
	} catch (error) {
		// Revert on error
		if (onRevert) {
			onRevert();
		}

		// Call error callback
		if (onError && error instanceof Error) {
			onError(error);
		}

		// Return original data
		return data;
	}
}

// Optimistic create utility
interface OptimisticCreateOptions<T> {
	data: T[];
	newItem: T;
	apiCall: () => Promise<any>;
	onSuccess?: (result: any) => void;
	onError?: (error: Error) => void;
	onRevert?: () => void;
}

export async function optimisticCreate<T extends { id: string | number }>({
	data,
	newItem,
	apiCall,
	onSuccess,
	onError,
	onRevert
}: OptimisticCreateOptions<T>): Promise<T[]> {
	// Add item optimistically
	const optimisticData = [...data, newItem];

	try {
		const result = await apiCall();
		
		// Replace temp ID with real ID from server
		const realItem = result.data || result;
		const finalData = optimisticData.map(item =>
			item.id === newItem.id ? { ...item, ...realItem } : item
		);

		if (onSuccess) {
			onSuccess(result);
		}

		return finalData;
	} catch (error) {
		// Remove optimistic item
		const revertedData = data.filter(item => item.id !== newItem.id);

		if (onRevert) {
			onRevert();
		}

		if (onError && error instanceof Error) {
			onError(error);
		}

		return revertedData;
	}
}

// Optimistic delete utility
interface OptimisticDeleteOptions<T> {
	data: T[];
	id: string | number;
	apiCall: () => Promise<any>;
	onSuccess?: (result: any) => void;
	onError?: (error: Error) => void;
	onRevert?: () => void;
}

export async function optimisticDelete<T extends { id: string | number }>({
	data,
	id,
	apiCall,
	onSuccess,
	onError,
	onRevert
}: OptimisticDeleteOptions<T>): Promise<T[]> {
	// Store item for potential revert
	const deletedItem = data.find(item => item.id === id);
	
	// Remove optimistically
	const optimisticData = data.filter(item => item.id !== id);

	try {
		const result = await apiCall();

		if (onSuccess) {
			onSuccess(result);
		}

		return optimisticData;
	} catch (error) {
		// Revert by adding item back
		const revertedData = deletedItem 
			? [...optimisticData, deletedItem]
			: optimisticData;

		if (onRevert) {
			onRevert();
		}

		if (onError && error instanceof Error) {
			onError(error);
		}

		return revertedData;
	}
}

// Svelte store integration helper
import { writable, type Writable } from 'svelte/store';

export function createOptimisticStore<T extends { id: string | number }>(initialData: T[] = []) {
	const store: Writable<T[]> = writable(initialData);

	return {
		subscribe: store.subscribe,
		set: store.set,
		update: store.update,

		async optimisticUpdate(id: string | number, updates: Partial<T>, apiCall: () => Promise<any>) {
			let currentData: T[] = [];
			store.subscribe(data => currentData = data)();

			const newData = await optimisticUpdate({
				data: currentData,
				id,
				updates,
				apiCall,
				onRevert: () => store.set(currentData)
			});

			store.set(newData);
			return newData;
		},

		async optimisticCreate(newItem: T, apiCall: () => Promise<any>) {
			let currentData: T[] = [];
			store.subscribe(data => currentData = data)();

			const newData = await optimisticCreate({
				data: currentData,
				newItem,
				apiCall,
				onRevert: () => store.set(currentData)
			});

			store.set(newData);
			return newData;
		},

		async optimisticDelete(id: string | number, apiCall: () => Promise<any>) {
			let currentData: T[] = [];
			store.subscribe(data => currentData = data)();

			const newData = await optimisticDelete({
				data: currentData,
				id,
				apiCall,
				onRevert: () => store.set(currentData)
			});

			store.set(newData);
			return newData;
		}
	};
}
