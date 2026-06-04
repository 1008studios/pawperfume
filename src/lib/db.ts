import fs from 'fs';
import path from 'path';

let _db: ((query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>) | null = null;
let _dbUrl: string | null = null;
let _apiUrl: string | null = null;

// Track connection health
let _lastHealthCheck = 0;
let _isHealthy = false;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

export async function getDb() {
	if (_db && _isHealthy) return _db;

	const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
	if (!raw) {
		console.log('[DB] No database URL configured. Falling back to local mock JSON database...');
		_db = await getMockDb();
		_isHealthy = true;
		return _db;
	}

	try {
		const u = new URL(raw);
		_dbUrl = `postgresql://${u.username}:${u.password}@${u.hostname}${u.pathname}?sslmode=require`;
		_apiUrl = `https://${u.hostname}/sql`;

		_db = async (query: string, params: unknown[] = []) => {
			// Validate inputs
			if (!query || typeof query !== 'string') {
				throw new Error('Invalid query');
			}
			
			if (!Array.isArray(params)) {
				throw new Error('Params must be an array');
			}
			
			const startTime = Date.now();
			
			try {
				const r = await fetch(_apiUrl!, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Neon-Connection-String': _dbUrl!
					},
					body: JSON.stringify({ query, params })
				});
				
				if (!r.ok) {
					const errorText = await r.text();
					console.error('Database HTTP error:', r.status, errorText);
					throw new Error(`Database error: ${r.status}`);
				}
				
				const d = await r.json() as { rows?: Record<string, unknown>[]; message?: string; code?: string };
				
				if (d.message && d.code) {
					console.error('Database query error:', d.message, d.code);
					throw new Error(d.message);
				}
				
				const duration = Date.now() - startTime;
				
				// Log slow queries (> 500ms)
				if (duration > 500) {
					console.warn(`Slow query (${duration}ms):`, query.substring(0, 200));
				}
				
				return d.rows || [];
			} catch (e) {
				// Don't log connection string
				console.error('Database query failed:', (e as Error).message);
				throw e;
			}
		};

		// Test connection
		await _db('SELECT 1');
		_isHealthy = true;
		_lastHealthCheck = Date.now();
		
		return _db;
	} catch (e) {
		console.error('DB init failed, falling back to mock DB:', (e as Error).message);
		_db = await getMockDb();
		_isHealthy = true;
		return _db;
	}
}

// Health check function (can be called periodically)
export async function checkDbHealth(): Promise<boolean> {
	if (!_db) return false;
	
	try {
		await _db('SELECT 1');
		_isHealthy = true;
		_lastHealthCheck = Date.now();
		return true;
	} catch {
		_isHealthy = false;
		return false;
	}
}

async function getMockDb() {
	const filePath = path.resolve('src/lib/mock-db-data.json');
	
	const readData = (): Record<string, any[]> => {
		try {
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, 'utf8');
				return JSON.parse(content);
			}
		} catch (e) {
			console.error('Error reading mock DB file:', e);
		}
		return {};
	};

	const writeData = (data: Record<string, any[]>) => {
		try {
			fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
		} catch (e) {
			console.error('Error writing mock DB file:', e);
		}
	};

	const executeMockDb = async (query: string, params: unknown[] = []): Promise<Record<string, unknown>[]> => {
		const sql = query.trim();
		const data = readData();
		
		// 1. SELECT 1 (health check)
		if (/^SELECT\s+1$/i.test(sql)) {
			return [{ '?column?': 1 }];
		}
		
		// 2. SELECT COUNT(*)::int as c FROM <table> ...
		if (/SELECT\s+COUNT\(\*\)(?:::int)?\s+as\s+c\s+FROM\s+(\w+)/i.test(sql)) {
			const match = sql.match(/SELECT\s+COUNT\(\*\)(?:::int)?\s+as\s+c\s+FROM\s+(\w+)/i);
			const tableName = match ? match[1] : '';
			const table = data[tableName] || [];
			let filtered = [...table];
			if (/WHERE/i.test(sql)) {
				filtered = applyFilters(sql, table, params);
			}
			return [{ c: filtered.length }];
		}
		
		// 3. SELECT <columns> FROM <table> ...
		if (/^SELECT\s+[\s\S]+?\s+FROM\s+(\w+)/i.test(sql)) {
			const match = sql.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)/i);
			const fieldsStr = match ? match[1].trim() : '*';
			const tableName = match ? match[2] : '';
			const table = data[tableName] || [];
			let rows = [...table];
			
			// Apply filters
			if (/WHERE/i.test(sql)) {
				rows = applyFilters(sql, rows, params);
			}
			
			// Apply sorting
			if (/ORDER\s+BY/i.test(sql)) {
				const sortMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
				if (sortMatch) {
					const field = sortMatch[1];
					const isDesc = sortMatch[2] && sortMatch[2].toUpperCase() === 'DESC';
					rows.sort((a, b) => {
						let valA = a[field];
						let valB = b[field];
						if (valA === null || valA === undefined) valA = '';
						if (valB === null || valB === undefined) valB = '';
						if (valA instanceof Date) valA = valA.getTime();
						if (valB instanceof Date) valB = valB.getTime();
						if (typeof valA === 'string') valA = valA.toLowerCase();
						if (typeof valB === 'string') valB = valB.toLowerCase();
						if (valA < valB) return isDesc ? 1 : -1;
						if (valA > valB) return isDesc ? -1 : 1;
						return 0;
					});
				}
			}
			
			// Apply limit
			if (/LIMIT\s+(\d+)/i.test(sql)) {
				const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
				if (limitMatch) {
					const limit = parseInt(limitMatch[1], 10);
					rows = rows.slice(0, limit);
				}
			}

			// Apply column projection if not SELECT *
			if (fieldsStr !== '*' && !fieldsStr.includes('*')) {
				const fields = fieldsStr.split(',').map(s => s.trim());
				rows = rows.map(r => {
					const newR: Record<string, any> = {};
					fields.forEach(f => {
						newR[f] = r[f];
					});
					return newR;
				});
			}
			
			return rows as Record<string, unknown>[];
		}
		
		// 4. INSERT INTO <table> (<columns>) VALUES (<values>)
		if (/^INSERT\s+INTO\s+(\w+)/i.test(sql)) {
			const tableMatch = sql.match(/^INSERT\s+INTO\s+(\w+)/i);
			const tableName = tableMatch ? tableMatch[1] : '';
			if (!data[tableName]) {
				data[tableName] = [];
			}
			const table = data[tableName];
			
			// Parse columns and placeholders using matching parenthesis
			const colsStart = sql.indexOf('(');
			const colsEnd = findMatchingParenthesis(sql, colsStart);
			const columnsStr = colsStart !== -1 && colsEnd !== -1 ? sql.substring(colsStart + 1, colsEnd) : '';
			
			const valuesIndex = sql.toUpperCase().indexOf('VALUES');
			const valsStart = valuesIndex !== -1 ? sql.indexOf('(', valuesIndex) : -1;
			const valsEnd = valsStart !== -1 ? findMatchingParenthesis(sql, valsStart) : -1;
			const valuesStr = valsStart !== -1 && valsEnd !== -1 ? sql.substring(valsStart + 1, valsEnd) : '';
			
			if (columnsStr && valuesStr) {
				const columns = columnsStr.split(',').map(s => s.trim());
				const placeholders = splitSqlValues(valuesStr);
				
				const newRow: Record<string, any> = {};
				
				// Generate new auto-increment ID
				const maxId = table.reduce((max, r) => Math.max(max, typeof r.id === 'number' ? r.id : 0), 0);
				newRow.id = maxId + 1;
				
				// Populate default timestamps
				newRow.created_at = new Date().toISOString();
				newRow.updated_at = new Date().toISOString();
				
				for (let idx = 0; idx < columns.length; idx++) {
					const col = columns[idx];
					const ph = placeholders[idx];
					if (ph === undefined) continue;
					
					if (ph.startsWith('$')) {
						const pIdx = parseInt(ph.substring(1), 10) - 1;
						let val = params[pIdx];
						// Parse JSON values
						if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
							try { val = JSON.parse(val); } catch {}
						}
						newRow[col] = val;
					} else if (ph.toUpperCase() === 'NOW()') {
						newRow[col] = new Date().toISOString();
					} else if (ph.startsWith('(') && ph.endsWith(')') && /^\s*SELECT/i.test(ph.substring(1, ph.length - 1))) {
						const subSql = ph.substring(1, ph.length - 1).trim();
						const subRows = await executeMockDb(subSql, params);
						if (subRows && subRows.length > 0) {
							const firstRow = subRows[0];
							const firstKey = Object.keys(firstRow)[0];
							newRow[col] = firstRow[firstKey];
						} else {
							newRow[col] = null;
						}
					} else {
						let cleanVal = ph.trim();
						if (cleanVal.startsWith("'") && cleanVal.endsWith("'")) {
							cleanVal = cleanVal.substring(1, cleanVal.length - 1);
						}
						if (cleanVal.toLowerCase() === 'true') {
							newRow[col] = true;
						} else if (cleanVal.toLowerCase() === 'false') {
							newRow[col] = false;
						} else if (cleanVal.toLowerCase() === 'null') {
							newRow[col] = null;
						} else {
							newRow[col] = isNaN(Number(cleanVal)) ? cleanVal : Number(cleanVal);
						}
					}
				}
				
				table.push(newRow);
				writeData(data);
				return [newRow] as Record<string, unknown>[];
			}
		}
		
		// 5. UPDATE <table> SET <assignments> WHERE <conditions>
		if (/^UPDATE\s+(\w+)/i.test(sql)) {
			const tableMatch = sql.match(/^UPDATE\s+(\w+)/i);
			const tableName = tableMatch ? tableMatch[1] : '';
			const table = data[tableName] || [];
			
			const setPartMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
			if (setPartMatch) {
				const setPart = setPartMatch[1];
				const assignments = setPart.split(',').map(s => s.trim());
				
				const rowsToUpdate = applyFilters(sql, table, params);
				
				rowsToUpdate.forEach(row => {
					row.updated_at = new Date().toISOString();
					assignments.forEach(assign => {
						const eqIdx = assign.indexOf('=');
						if (eqIdx !== -1) {
							const col = assign.substring(0, eqIdx).trim();
							const valExpr = assign.substring(eqIdx + 1).trim();
							
							if (valExpr.startsWith('$')) {
								const pIdx = parseInt(valExpr.substring(1), 10) - 1;
								let val = params[pIdx];
								// Parse JSON values
								if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
									try { val = JSON.parse(val); } catch {}
								}
								row[col] = val;
							} else if (valExpr.toUpperCase() === 'NOW()') {
								row[col] = new Date().toISOString();
							} else {
								let cleanVal = valExpr;
								if (cleanVal.startsWith("'") && cleanVal.endsWith("'")) {
									cleanVal = cleanVal.substring(1, cleanVal.length - 1);
								}
								if (cleanVal.toLowerCase() === 'true') {
									row[col] = true;
								} else if (cleanVal.toLowerCase() === 'false') {
									row[col] = false;
								} else if (cleanVal.toLowerCase() === 'null') {
									row[col] = null;
								} else {
									row[col] = isNaN(Number(cleanVal)) ? cleanVal : Number(cleanVal);
								}
							}
						}
					});
				});
				
				writeData(data);
				return rowsToUpdate as Record<string, unknown>[];
			}
		}
		
		// 6. DELETE FROM <table> WHERE <conditions>
		if (/^DELETE\s+FROM\s+(\w+)/i.test(sql)) {
			const tableMatch = sql.match(/^DELETE\s+FROM\s+(\w+)/i);
			const tableName = tableMatch ? tableMatch[1] : '';
			const table = data[tableName] || [];
			
			if (/WHERE/i.test(sql)) {
				const rowsToDelete = applyFilters(sql, table, params);
				const deleteIds = new Set(rowsToDelete.map(r => r.id));
				data[tableName] = table.filter(r => !deleteIds.has(r.id));
				writeData(data);
				return rowsToDelete as Record<string, unknown>[];
			} else {
				data[tableName] = [];
				writeData(data);
				return [];
			}
		}
		
		console.warn('[MOCK DB] Unsupported query command:', sql);
		return [];
	};

	return executeMockDb;
}

function applyFilters(sql: string, rows: any[], params: unknown[]): any[] {
	const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:ORDER\s+BY|LIMIT|$)/i);
	if (!whereMatch) return rows;
	
	const whereClause = whereMatch[1];
	const conds = whereClause.split(/\s+AND\s+/i).map(s => s.trim());
	
	return rows.filter(row => {
		for (const cond of conds) {
			const eqMatch = cond.match(/^(\w+)\s*=\s*(.+)$/i);
			if (eqMatch) {
				const col = eqMatch[1];
				let valExpr = eqMatch[2].trim();
				
				let filterVal: any;
				if (valExpr.startsWith('$')) {
					const pIdx = parseInt(valExpr.substring(1), 10) - 1;
					filterVal = params[pIdx];
				} else {
					if (valExpr.toLowerCase() === 'true') {
						filterVal = true;
					} else if (valExpr.toLowerCase() === 'false') {
						filterVal = false;
					} else if (valExpr.toLowerCase() === 'null') {
						filterVal = null;
					} else if (valExpr.startsWith("'") && valExpr.endsWith("'")) {
						filterVal = valExpr.substring(1, valExpr.length - 1);
					} else {
						filterVal = isNaN(Number(valExpr)) ? valExpr : Number(valExpr);
					}
				}
				
				if (row[col] != filterVal) {
					if (String(row[col]) !== String(filterVal)) {
						return false;
					}
				}
			}
		}
		return true;
	});
}

function findMatchingParenthesis(str: string, startIdx: number): number {
	let depth = 0;
	let inQuote = false;
	for (let i = startIdx; i < str.length; i++) {
		const char = str[i];
		if (char === "'" && str[i - 1] !== '\\') {
			inQuote = !inQuote;
		} else if (!inQuote && char === '(') {
			depth++;
		} else if (!inQuote && char === ')') {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}
	return -1;
}

function splitSqlValues(str: string): string[] {
	const parts: string[] = [];
	let current = '';
	let depth = 0;
	let inQuote = false;
	
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		if (char === "'" && str[i - 1] !== '\\') {
			inQuote = !inQuote;
			current += char;
		} else if (!inQuote && char === '(') {
			depth++;
			current += char;
		} else if (!inQuote && char === ')') {
			depth--;
			current += char;
		} else if (!inQuote && char === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	if (current.trim()) {
		parts.push(current.trim());
	}
	return parts;
}
