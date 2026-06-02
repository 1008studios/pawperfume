// Form validation utilities

export interface ValidationRule {
	validate: (value: any) => boolean;
	message: string;
}

export interface FieldValidation {
	rules: ValidationRule[];
	required?: boolean;
}

export interface FormErrors {
	[field: string]: string | null;
}

// Common validation rules
export const rules = {
	required: (message = 'This field is required'): ValidationRule => ({
		validate: (value) => value !== null && value !== undefined && value !== '',
		message
	}),

	email: (message = 'Please enter a valid email address'): ValidationRule => ({
		validate: (value) => {
			if (!value) return true; // Let required rule handle empty
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
		},
		message
	}),

	minLength: (min: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (!value) return true;
			return String(value).length >= min;
		},
		message: message || `Must be at least ${min} characters`
	}),

	maxLength: (max: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (!value) return true;
			return String(value).length <= max;
		},
		message: message || `Must be no more than ${max} characters`
	}),

	min: (min: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (value === null || value === undefined || value === '') return true;
			return Number(value) >= min;
		},
		message: message || `Must be at least ${min}`
	}),

	max: (max: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (value === null || value === undefined || value === '') return true;
			return Number(value) <= max;
		},
		message: message || `Must be no more than ${max}`
	}),

	pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
		validate: (value) => {
			if (!value) return true;
			return regex.test(String(value));
		},
		message
	}),

	url: (message = 'Please enter a valid URL'): ValidationRule => ({
		validate: (value) => {
			if (!value) return true;
			try {
				new URL(value);
				return true;
			} catch {
				return false;
			}
		},
		message
	}),

	phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
		validate: (value) => {
			if (!value) return true;
			return /^[\d\s\-\+\(\)]+$/.test(value);
		},
		message
	}),

	custom: (fn: (value: any) => boolean, message: string): ValidationRule => ({
		validate: fn,
		message
	}),

	match: (fieldValue: any, message = 'Fields do not match'): ValidationRule => ({
		validate: (value) => value === fieldValue,
		message
	})
};

// Validate a single field
export function validateField(value: any, fieldValidation: FieldValidation): string | null {
	if (fieldValidation.required && (!value || value === '')) {
		return 'This field is required';
	}

	for (const rule of fieldValidation.rules) {
		if (!rule.validate(value)) {
			return rule.message;
		}
	}

	return null;
}

// Validate entire form
export function validateForm(
	values: Record<string, any>,
	schema: Record<string, FieldValidation>
): FormErrors {
	const errors: FormErrors = {};

	for (const [field, validation] of Object.entries(schema)) {
		errors[field] = validateField(values[field], validation);
	}

	return errors;
}

// Check if form has errors
export function hasErrors(errors: FormErrors): boolean {
	return Object.values(errors).some(error => error !== null);
}

// Form validator class for complex forms
export class FormValidator {
	private schema: Record<string, FieldValidation>;
	private errors: FormErrors = {};

	constructor(schema: Record<string, FieldValidation>) {
		this.schema = schema;
	}

	validate(values: Record<string, any>): FormErrors {
		this.errors = validateForm(values, this.schema);
		return this.errors;
	}

	validateField(field: string, value: any): string | null {
		const validation = this.schema[field];
		if (!validation) return null;

		const error = validateField(value, validation);
		this.errors[field] = error;
		return error;
	}

	getErrors(): FormErrors {
		return this.errors;
	}

	hasErrors(): boolean {
		return hasErrors(this.errors);
	}

	reset() {
		this.errors = {};
	}
}

// Svelte store integration
import { writable, derived } from 'svelte/store';

export function createFormStore<T extends Record<string, any>>(
	initialValues: T,
	schema: Record<string, FieldValidation>
) {
	const values = writable<T>(initialValues);
	const touched = writable<Record<string, boolean>>({});
	const errors = writable<FormErrors>({});

	const isValid = derived([values, errors], ([$values, $errors]) => {
		const validationErrors = validateForm($values, schema);
		errors.set(validationErrors);
		return !hasErrors(validationErrors);
	});

	function setFieldValue(field: keyof T, value: any) {
		values.update(v => ({ ...v, [field]: value }));
		touched.update(t => ({ ...t, [field]: true }));

		// Validate field
		const validation = schema[field as string];
		if (validation) {
			const error = validateField(value, validation);
			errors.update(e => ({ ...e, [field]: error }));
		}
	}

	function setFieldTouched(field: keyof T) {
		touched.update(t => ({ ...t, [field]: true }));
	}

	function validate() {
		let currentValues: T;
		values.subscribe(v => currentValues = v)();
		const validationErrors = validateForm(currentValues!, schema);
		errors.set(validationErrors);
		return !hasErrors(validationErrors);
	}

	function reset() {
		values.set(initialValues);
		touched.set({});
		errors.set({});
	}

	return {
		values: { subscribe: values.subscribe },
		touched: { subscribe: touched.subscribe },
		errors: { subscribe: errors.subscribe },
		isValid: { subscribe: isValid.subscribe },
		setFieldValue,
		setFieldTouched,
		validate,
		reset
	};
}
