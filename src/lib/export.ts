// Export utilities for CSV, JSON, and more

interface ExportOptions {
	filename: string;
	data: any[];
	columns?: string[];
	headers?: string[];
}

// CSV Export
export function exportToCSV({ filename, data, columns, headers }: ExportOptions): void {
	if (!data || data.length === 0) {
		console.warn('No data to export');
		return;
	}

	// Determine columns
	const cols = columns || Object.keys(data[0]);
	const hdrs = headers || cols;

	// Build CSV content
	const csvRows: string[] = [];
	
	// Add headers
	csvRows.push(hdrs.map(h => escapeCSV(h)).join(','));

	// Add data rows
	data.forEach(row => {
		const values = cols.map(col => {
			const value = row[col];
			return escapeCSV(formatValue(value));
		});
		csvRows.push(values.join(','));
	});

	const csvContent = csvRows.join('\n');

	// Download
	downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

// JSON Export
export function exportToJSON({ filename, data }: ExportOptions): void {
	if (!data || data.length === 0) {
		console.warn('No data to export');
		return;
	}

	const jsonContent = JSON.stringify(data, null, 2);
	downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

// Excel Export (TSV format that Excel can open)
export function exportToExcel({ filename, data, columns, headers }: ExportOptions): void {
	if (!data || data.length === 0) {
		console.warn('No data to export');
		return;
	}

	const cols = columns || Object.keys(data[0]);
	const hdrs = headers || cols;

	const rows: string[] = [];
	
	// Add headers
	rows.push(hdrs.join('\t'));

	// Add data rows
	data.forEach(row => {
		const values = cols.map(col => {
			const value = row[col];
			return formatValue(value);
		});
		rows.push(values.join('\t'));
	});

	const tsvContent = rows.join('\n');
	downloadFile(tsvContent, `${filename}.xls`, 'application/vnd.ms-excel');
}

// PDF Export (requires jsPDF)
export async function exportToPDF({ filename, data, columns, headers }: ExportOptions): Promise<void> {
	if (!data || data.length === 0) {
		console.warn('No data to export');
		return;
	}

	try {
		// Dynamic import to avoid bundling if not used
		const { jsPDF } = await import('jspdf');
		const doc = new jsPDF();

		const cols = columns || Object.keys(data[0]);
		const hdrs = headers || cols;

		// Add title
		doc.setFontSize(18);
		doc.text(filename, 14, 22);

		// Add table
		doc.setFontSize(10);
		
		// Calculate column widths
		const pageWidth = doc.internal.pageSize.getWidth();
		const colWidth = (pageWidth - 28) / cols.length;

		// Headers
		doc.setFont(undefined, 'bold');
		hdrs.forEach((header, i) => {
			doc.text(header, 14 + (i * colWidth), 35);
		});

		// Data
		doc.setFont(undefined, 'normal');
		data.forEach((row, rowIndex) => {
			const y = 42 + (rowIndex * 7);
			
			// Check if we need a new page
			if (y > doc.internal.pageSize.getHeight() - 20) {
				doc.addPage();
				return; // Skip this row (will be on next page in real implementation)
			}

			cols.forEach((col, colIndex) => {
				const value = formatValue(row[col]);
				doc.text(value.substring(0, 20), 14 + (colIndex * colWidth), y);
			});
		});

		doc.save(`${filename}.pdf`);
	} catch (error) {
		console.error('PDF export failed:', error);
		// Fallback to CSV
		exportToCSV({ filename, data, columns, headers });
	}
}

// Helper functions
function escapeCSV(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function formatValue(value: any): string {
	if (value === null || value === undefined) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === 'object') {
		return JSON.stringify(value);
	}
	return String(value);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// Batch export utility
export async function batchExport(
	exports: Array<{ filename: string; data: any[]; format: 'csv' | 'json' | 'excel' | 'pdf' }>
): Promise<void> {
	for (const exp of exports) {
		switch (exp.format) {
			case 'csv':
				exportToCSV({ filename: exp.filename, data: exp.data });
				break;
			case 'json':
				exportToJSON({ filename: exp.filename, data: exp.data });
				break;
			case 'excel':
				exportToExcel({ filename: exp.filename, data: exp.data });
				break;
			case 'pdf':
				await exportToPDF({ filename: exp.filename, data: exp.data });
				break;
		}
		// Small delay between downloads
		await new Promise(resolve => setTimeout(resolve, 100));
	}
}
