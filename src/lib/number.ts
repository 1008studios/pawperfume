// Number formatting and utility functions

export function formatNumber(num: number, decimals: number = 0): string {
	return num.toLocaleString('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency
	}).format(amount);
}

export function formatPercent(value: number, decimals: number = 1): string {
	return (value * 100).toFixed(decimals) + '%';
}

export function formatCompact(num: number): string {
	if (num >= 1e9) {
		return (num / 1e9).toFixed(1) + 'B';
	}
	if (num >= 1e6) {
		return (num / 1e6).toFixed(1) + 'M';
	}
	if (num >= 1e3) {
		return (num / 1e3).toFixed(1) + 'K';
	}
	return num.toString();
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const size = (bytes / Math.pow(1024, i)).toFixed(1);
	
	return `${size} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	
	if (minutes < 60) {
		return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
	}
	
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	
	if (hours < 24) {
		return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
	}
	
	const days = Math.floor(hours / 24);
	const remainingHours = hours % 24;
	
	return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function formatPhoneNumber(phone: string, format: 'national' | 'international' = 'national'): string {
	const cleaned = phone.replace(/\D/g, '');
	
	if (cleaned.length === 10) {
		return format === 'national' 
			? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
			: `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
	}
	
	if (cleaned.length === 11 && cleaned.startsWith('1')) {
		return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
	}
	
	return phone;
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals: number = 0): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

export function ceil(value: number, decimals: number = 0): number {
	const factor = Math.pow(10, decimals);
	return Math.ceil(value * factor) / factor;
}

export function floor(value: number, decimals: number = 0): number {
	const factor = Math.pow(10, decimals);
	return Math.floor(value * factor) / factor;
}

export function random(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sum(numbers: number[]): number {
	return numbers.reduce((acc, num) => acc + num, 0);
}

export function average(numbers: number[]): number {
	if (numbers.length === 0) return 0;
	return sum(numbers) / numbers.length;
}

export function median(numbers: number[]): number {
	if (numbers.length === 0) return 0;
	
	const sorted = [...numbers].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
}

export function mode(numbers: number[]): number[] {
	if (numbers.length === 0) return [];
	
	const counts = new Map<number, number>();
	numbers.forEach(num => {
		counts.set(num, (counts.get(num) || 0) + 1);
	});
	
	const maxCount = Math.max(...counts.values());
	return Array.from(counts.entries())
		.filter(([_, count]) => count === maxCount)
		.map(([num]) => num);
}

export function standardDeviation(numbers: number[]): number {
	if (numbers.length === 0) return 0;
	
	const avg = average(numbers);
	const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
	const avgSquaredDiff = average(squaredDiffs);
	
	return Math.sqrt(avgSquaredDiff);
}

export function percentageChange(oldValue: number, newValue: number): number {
	if (oldValue === 0) return newValue > 0 ? 100 : 0;
	return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

export function isEven(num: number): boolean {
	return num % 2 === 0;
}

export function isOdd(num: number): boolean {
	return num % 2 !== 0;
}

export function isPrime(num: number): boolean {
	if (num < 2) return false;
	if (num === 2) return true;
	if (num % 2 === 0) return false;
	
	for (let i = 3; i <= Math.sqrt(num); i += 2) {
		if (num % i === 0) return false;
	}
	
	return true;
}

export function factorial(num: number): number {
	if (num < 0) return 0;
	if (num === 0 || num === 1) return 1;
	
	let result = 1;
	for (let i = 2; i <= num; i++) {
		result *= i;
	}
	
	return result;
}

export function fibonacci(n: number): number {
	if (n < 0) return 0;
	if (n === 0) return 0;
	if (n === 1) return 1;
	
	let prev = 0;
	let curr = 1;
	
	for (let i = 2; i <= n; i++) {
		const next = prev + curr;
		prev = curr;
		curr = next;
	}
	
	return curr;
}

export function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	
	while (b !== 0) {
		const temp = b;
		b = a % b;
		a = temp;
	}
	
	return a;
}

export function lcm(a: number, b: number): number {
	return Math.abs(a * b) / gcd(a, b);
}

export function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

export function toDegrees(radians: number): number {
	return radians * (180 / Math.PI);
}

export function lerp(start: number, end: number, t: number): number {
	return start + (end - start) * clamp(t, 0, 1);
}

export function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
