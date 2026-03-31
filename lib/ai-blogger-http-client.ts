/**
 * AI Blogger HTTP Client
 *
 * Consolidated HTTP/fetch utilities for making API requests with
 * timeout handling, error management, and JSON parsing.
 * Used across grounded-research, serp-analysis, website-intelligence, trends, and actions.
 */

/**
 * Configuration for HTTP requests
 */
export interface HttpRequestOptions extends RequestInit {
    timeout?: number;
    retries?: number;
    retryDelayMs?: number;
}

/**
 * Fetches JSON from a URL with timeout and error handling
 * Throws an error if the response is not OK
 */
export async function fetchJson<T>(
    url: string,
    options: HttpRequestOptions = {}
): Promise<T> {
    const { timeout = 15000, retries = 0, retryDelayMs = 1000, ...fetchOptions } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data as T;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < retries) {
                // Wait before retrying, with exponential backoff
                await new Promise((resolve) =>
                    setTimeout(resolve, retryDelayMs * Math.pow(2, attempt))
                );
            }
        }
    }

    throw lastError || new Error(`Failed to fetch JSON from ${url}`);
}

/**
 * Fetches text content from a URL with timeout and error handling
 */
export async function fetchText(
    url: string,
    options: HttpRequestOptions = {}
): Promise<string> {
    const { timeout = 15000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetches HTML content from a URL with validation
 * Returns null if content-type is not HTML
 */
export async function fetchHtml(
    url: string,
    options: HttpRequestOptions = {}
): Promise<string | null> {
    const { timeout = 9000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            method: "GET",
            ...fetchOptions,
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("text/html")) {
            return null;
        }

        return await response.text();
    } catch {
        // Could be timeout, network error, or other fetch error
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Makes a generic fetch request with timeout handling
 */
export async function fetchWithTimeout(
    url: string,
    options: HttpRequestOptions = {}
): Promise<Response> {
    const { timeout = 15000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        return await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Checks if a URL is reachable (returns 2xx status)
 */
export async function isUrlReachable(
    url: string,
    options: HttpRequestOptions = {}
): Promise<boolean> {
    try {
        const response = await fetchWithTimeout(url, {
            method: "HEAD",
            timeout: 5000,
            ...options,
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Fetches with retry logic
 */
export async function fetchWithRetry<T>(
    url: string,
    options: HttpRequestOptions = {},
    transform: (response: Response) => Promise<T> = (r) => r.json()
): Promise<T> {
    const { timeout = 15000, retries = 3, retryDelayMs = 1000, ...fetchOptions } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, {
                timeout,
                ...fetchOptions,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await transform(response);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < retries) {
                // Exponential backoff
                const delay = retryDelayMs * Math.pow(2, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error(`Failed to fetch from ${url} after ${retries + 1} attempts`);
}
