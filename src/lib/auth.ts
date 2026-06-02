import type { RequestEvent } from '@sveltejs/kit';
import { createHmac, randomBytes } from 'crypto';

const PUBLIC_ROUTES = ['login', 'status', 'tenant-config'];

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Simple session store (use Redis in production)
const sessions = new Map<string, { 
	createdAt: number; 
	expiresAt: number; 
	ip: string;
}>();

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Clean up expired sessions periodically
let lastCleanup = 0;
function cleanupSessions() {
	const now = Date.now();
	if (now - lastCleanup < SESSION_CLEANUP_INTERVAL) return;
	
	for (const [token, session] of sessions) {
		if (now > session.expiresAt) {
			sessions.delete(token);
		}
	}
	lastCleanup = now;
}

export function getAdminPassword(): string {
	const pass = process.env.ADMIN_PASSWORD;
	if (!pass) {
		console.warn('⚠️ ADMIN_PASSWORD not set - admin panel is unsecured!');
	}
	return pass || '';
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

/**
 * Create a new session after successful login
 */
export function createSession(ip: string): string {
	cleanupSessions();
	
	const token = generateSessionToken();
	const now = Date.now();
	
	sessions.set(token, {
		createdAt: now,
		expiresAt: now + SESSION_DURATION,
		ip
	});
	
	return token;
}

/**
 * Validate a session token
 */
export function validateSession(token: string, ip: string): boolean {
	cleanupSessions();
	
	const session = sessions.get(token);
	if (!session) return false;
	
	// Check expiration
	if (Date.now() > session.expiresAt) {
		sessions.delete(token);
		return false;
	}
	
	// Optional: Check IP match (uncomment for stricter security)
	// if (session.ip !== ip) {
	//     sessions.delete(token);
	//     return false;
	// }
	
	return true;
}

/**
 * Check login rate limiting
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
	const now = Date.now();
	const attempts = loginAttempts.get(ip);
	
	if (!attempts) {
		return { allowed: true };
	}
	
	// Check if locked out
	if (now < attempts.lockedUntil) {
		const retryAfter = Math.ceil((attempts.lockedUntil - now) / 1000);
		return { allowed: false, retryAfter };
	}
	
	// Reset if lockout expired
	if (now >= attempts.lockedUntil && attempts.count >= MAX_LOGIN_ATTEMPTS) {
		loginAttempts.delete(ip);
		return { allowed: true };
	}
	
	return { allowed: true };
}

/**
 * Record a failed login attempt
 */
export function recordLoginAttempt(ip: string): void {
	const attempts = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
	attempts.count++;
	
	if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
		attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
		console.warn(`Login locked out for IP: ${ip}`);
	}
	
	loginAttempts.set(ip, attempts);
}

/**
 * Clear login attempts after successful login
 */
export function clearLoginAttempts(ip: string): void {
	loginAttempts.delete(ip);
}

/**
 * Check if a route is authenticated
 */
export function isAuthenticated(event: RequestEvent): boolean {
	const pass = getAdminPassword();
	if (!pass) return true; // No password set = open access (dev mode)

	const route = event.url.pathname.replace('/api/admin/', '').replace(/\/$/, '').replace(/^\//, '');
	if (PUBLIC_ROUTES.includes(route)) return true;

	// Check for Bearer token (legacy support)
	const authHeader = event.request.headers.get('authorization') || '';
	if (authHeader.startsWith('Bearer ')) {
		const token = authHeader.replace(/^Bearer\s+/i, '');
		
		// Check if it's a valid session token
		const ip = event.request.headers.get('x-forwarded-for') || 
				   event.request.headers.get('x-real-ip') || 
				   'unknown';
		
		if (validateSession(token, ip)) {
			return true;
		}
		
		// Legacy: Check if token is base64-encoded password
		try {
			const decoded = Buffer.from(token, 'base64').toString();
			if (decoded === pass) {
				return true;
			}
		} catch {}
		
		// Direct password comparison (legacy support)
		if (token === pass) {
			return true;
		}
	}

	return false;
}

/**
 * Get token from request
 */
export function getToken(event: RequestEvent): string {
	return (event.request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
}

/**
 * Read and parse request body with size limit
 */
export async function readBody<T = Record<string, unknown>>(event: RequestEvent): Promise<T> {
	try {
		// Check Content-Length header
		const contentLength = parseInt(event.request.headers.get('content-length') || '0');
		if (contentLength > 1024 * 1024) { // 1MB limit
			throw new Error('Request body too large');
		}
		
		return await event.request.json() as T;
	} catch {
		return {} as T;
	}
}
