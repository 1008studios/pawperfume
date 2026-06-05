<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		value?: string;
		type?: 'date' | 'time' | 'datetime';
		min?: string;
		max?: string;
		format?: string;
	}

	let { 
		value = $bindable(''), 
		type = 'date',
		min,
		max,
		format
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let isOpen = $state(false);
	let currentMonth = $state(new Date());
	let selectedDate = $state(value ? new Date(value) : new Date());

	const daysInMonth = $derived(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		return new Date(year, month + 1, 0).getDate();
	});

	const firstDayOfMonth = $derived(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		return new Date(year, month, 1).getDay();
	});

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function previousMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}

	function selectDate(day: number) {
		selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
		updateValue();
		isOpen = false;
	}

	function updateValue() {
		if (type === 'date') {
			value = selectedDate.toISOString().split('T')[0];
		} else if (type === 'time') {
			value = selectedDate.toTimeString().split(' ')[0].substring(0, 5);
		} else {
			value = selectedDate.toISOString().substring(0, 16);
		}
		dispatch('change', value);
	}

	function togglePicker() {
		isOpen = !isOpen;
	}

	function isToday(day: number): boolean {
		const today = new Date();
		return selectedDate.getDate() === day &&
			selectedDate.getMonth() === currentMonth.getMonth() &&
			selectedDate.getFullYear() === currentMonth.getFullYear() &&
			today.getDate() === day &&
			today.getMonth() === currentMonth.getMonth() &&
			today.getFullYear() === currentMonth.getFullYear();
	}

	function isSelected(day: number): boolean {
		if (!value) return false;
		const date = new Date(value);
		return date.getDate() === day &&
			date.getMonth() === currentMonth.getMonth() &&
			date.getFullYear() === currentMonth.getFullYear();
	}
</script>

<div class="datetime-picker">
	<button class="picker-input" onclick={togglePicker}>
		<span class="input-icon">
			{#if type === 'date'}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
			{:else if type === 'time'}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><circle cx="17" cy="17" r="4"></circle><polyline points="17 15 17 17 19 17"></polyline></svg>
			{/if}
		</span>
		<span class="input-value">
			{value || (type === 'date' ? 'Select date' : type === 'time' ? 'Select time' : 'Select date & time')}
		</span>
		<span class="input-arrow">▼</span>
	</button>

	{#if isOpen}
		<div class="picker-dropdown">
			<div class="calendar">
				<div class="calendar-header">
					<button class="nav-button" onclick={previousMonth} aria-label="Previous month">◀</button>
					<div class="month-year">
						{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
					</div>
					<button class="nav-button" onclick={nextMonth} aria-label="Next month">▶</button>
				</div>

				<div class="calendar-days">
					{#each dayNames as day}
						<div class="day-name">{day}</div>
					{/each}

					{#each Array(firstDayOfMonth()) as _}
						<div class="day empty"></div>
					{/each}

					{#each Array(daysInMonth()) as _, i}
						{@const day = i + 1}
						<button
							class="day"
							class:selected={isSelected(day)}
							class:today={isToday(day)}
							onclick={() => selectDate(day)}
						>
							{day}
						</button>
					{/each}
				</div>
			</div>

			{#if type === 'time' || type === 'datetime'}
				<div class="time-picker">
					<input
						type="time"
						bind:value={value}
						oninput={updateValue}
						class="time-input"
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.datetime-picker {
		position: relative;
		display: inline-block;
	}

	.picker-input {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 200px;
	}

	.picker-input:hover {
		border-color: var(--primary);
	}

	.input-icon {
		font-size: 18px;
	}

	.input-value {
		flex: 1;
		text-align: left;
	}

	.input-arrow {
		font-size: 10px;
		color: var(--text-tertiary);
	}

	.picker-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		padding: 16px;
		z-index: 1000;
		min-width: 280px;
		animation: slideDown 0.2s ease-out;
	}

	.calendar {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-button {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-hover);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.15s ease;
	}

	.nav-button:hover {
		background: var(--border);
	}

	.month-year {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.calendar-days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}

	.day-name {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-tertiary);
		text-align: center;
		padding: 4px;
		text-transform: uppercase;
	}

	.day {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		color: var(--text);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.day:hover:not(.empty) {
		background: var(--surface-hover);
	}

	.day.empty {
		cursor: default;
	}

	.day.selected {
		background: var(--primary);
		color: white;
		font-weight: 600;
	}

	.day.today:not(.selected) {
		border: 2px solid var(--primary);
	}

	.time-picker {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
	}

	.time-input {
		width: 100%;
		padding: 8px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
	}

	.time-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
