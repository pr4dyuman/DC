// Input Validation & Sanitization Utilities

// ============================================================================
// INPUT SANITIZATION & VALIDATION UTILITIES
// Protects against: XSS, NoSQL injection, HTML injection, script injection
// ============================================================================

/**
 * Strip HTML tags to prevent stored XSS.
 * Allows plain text only — removes all <tags>.
 */
export function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters for safe rendering.
 * Use when you need to preserve the text but prevent execution.
 */
export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Sanitize a string input: trim, strip HTML tags, limit length.
 * This is the primary sanitizer for all text inputs.
 */
export function sanitizeString(input: string, maxLength: number = 5000): string {
    if (typeof input !== 'string') return '';
    return stripHtml(input).trim().slice(0, maxLength);
}

/**
 * Sanitize a string that should be a "name" (no special chars except basic punctuation).
 * For: user names, project names, company names, service names.
 */
export function sanitizeName(input: string, maxLength: number = 200): string {
    if (typeof input !== 'string') return '';
    // Strip HTML, trim, limit length, remove control characters
    return stripHtml(input)
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .trim()
        .slice(0, maxLength);
}

/**
 * Sanitize username: alphanumeric, dots, underscores, hyphens only.
 */
export function sanitizeUsername(input: string): string {
    if (typeof input !== 'string') return '';
    return input
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 100);
}

/**
 * Validate and sanitize an email address.
 * Returns sanitized email or throws.
 */
export function validateEmail(input: string): string {
    if (typeof input !== 'string') throw new Error('Email must be a string');
    const trimmed = input.trim().toLowerCase().slice(0, 254);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
        throw new Error('Invalid email format');
    }
    return trimmed;
}

/**
 * Validate password strength.
 * Minimum 6 chars, at least 1 letter and 1 number.
 */
export function validatePassword(input: string): string {
    if (typeof input !== 'string') throw new Error('Password must be a string');
    if (input.length < 6) throw new Error('Password must be at least 6 characters');
    if (input.length > 128) throw new Error('Password must be at most 128 characters');
    if (!/[a-zA-Z]/.test(input)) throw new Error('Password must contain at least 1 letter');
    if (!/[0-9]/.test(input)) throw new Error('Password must contain at least 1 number');
    return input;
}

/**
 * Sanitize a phone number: digits, +, -, spaces, parens only.
 */
export function sanitizePhone(input: string): string {
    if (typeof input !== 'string') return '';
    return input.replace(/[^0-9+\-() ]/g, '').slice(0, 20);
}

/**
 * Sanitize a color hex code.
 */
export function sanitizeColor(input: string): string {
    if (typeof input !== 'string') return '';
    const match = input.match(/^#?([0-9a-fA-F]{3,8})$/);
    return match ? `#${match[1]}` : '';
}

/**
 * Sanitize a URL — must be http/https or data: (for logos).
 */
export function sanitizeUrl(input: string): string {
    if (typeof input !== 'string') return '';
    const trimmed = input.trim().slice(0, 2000);
    // Allow http, https, data: URIs, and relative paths
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
        return trimmed;
    }
    return '';
}

/**
 * Validate a monetary amount.
 */
export function validateAmount(input: any): number {
    const num = typeof input === 'string' ? parseFloat(input) : Number(input);
    if (isNaN(num) || !isFinite(num)) throw new Error('Invalid amount');
    if (num < 0) throw new Error('Amount cannot be negative');
    if (num > 999999999) throw new Error('Amount exceeds maximum');
    return Math.round(num * 100) / 100; // Round to 2 decimal places
}

/**
 * Validate a salary amount (can be 0).
 */
export function validateSalary(input: any): number {
    const num = typeof input === 'string' ? parseFloat(input) : Number(input);
    if (isNaN(num) || !isFinite(num)) throw new Error('Invalid salary');
    if (num < 0) throw new Error('Salary cannot be negative');
    if (num > 999999999) throw new Error('Salary exceeds maximum');
    return Math.round(num * 100) / 100;
}

/**
 * Prevent NoSQL injection by stripping MongoDB operators from object keys.
 * Removes any key starting with '$' and deeply nested objects.
 */
export function sanitizeMongoInput(input: any): any {
    if (input === null || input === undefined) return input;
    if (typeof input === 'string') return input;
    if (typeof input === 'number' || typeof input === 'boolean') return input;
    if (input instanceof Date) return input;

    if (Array.isArray(input)) {
        return input.map(sanitizeMongoInput);
    }

    if (typeof input === 'object') {
        const sanitized: any = {};
        for (const key of Object.keys(input)) {
            // Block MongoDB operators ($gt, $ne, $regex, etc.)
            if (key.startsWith('$')) continue;
            // Block prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            sanitized[key] = sanitizeMongoInput(input[key]);
        }
        return sanitized;
    }

    return input;
}

/**
 * Sanitize an entire object of updates (for updateUser, updateClient, etc.).
 * Strips MongoDB operators and HTML from string values.
 */
export function sanitizeUpdates(updates: Record<string, any>): Record<string, any> {
    const sanitized = sanitizeMongoInput(updates);
    // Additionally strip HTML from all string values
    for (const key of Object.keys(sanitized)) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = stripHtml(sanitized[key]).trim();
        }
    }
    return sanitized;
}

/**
 * Validate an ID format (should be a simple string, no operators).
 */
export function validateId(input: any): string {
    if (typeof input !== 'string') throw new Error('ID must be a string');
    // IDs should only contain alphanumeric, hyphens, underscores
    const sanitized = input.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitized.length === 0 || sanitized.length > 128) {
        throw new Error('Invalid ID format');
    }
    return sanitized;
}

/**
 * Validate a date string.
 */
export function validateDate(input: string): string {
    if (typeof input !== 'string') throw new Error('Date must be a string');
    const date = new Date(input);
    if (isNaN(date.getTime())) throw new Error('Invalid date format');
    return date.toISOString();
}

/**
 * Validate enum value.
 */
export function validateEnum<T extends string>(input: string, allowed: T[], fieldName: string): T {
    if (!allowed.includes(input as T)) {
        throw new Error(`Invalid ${fieldName}: must be one of ${allowed.join(', ')}`);
    }
    return input as T;
}
