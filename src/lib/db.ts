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
		console.error('No database URL configured');
		return null;
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
		console.error('DB init failed:', (e as Error).message);
		_isHealthy = false;
		return null;
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

// REMOVED: esc() function
// NEVER use string escaping for SQL - always use parameterized queries
// The db() function accepts params array: db('SELECT * FROM x WHERE id = $1', [id])
