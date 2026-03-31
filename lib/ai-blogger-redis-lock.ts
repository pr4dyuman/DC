/**
 * Redis-based Distributed Locking for AI Blogger
 * Used for multi-instance deployments where MongoDB atomic operations aren't sufficient
 * Optional: Falls back to MongoDB locking if Redis is unavailable
 */

type RedisReconnectError = {
    message: string;
};

type RedisConstructor = new (
    url: string,
    options: {
        reconnectOnError?: (err: RedisReconnectError) => boolean;
        retryStrategy?: (times: number) => number;
        connectTimeout?: number;
        commandTimeout?: number;
        maxRetriesPerRequest?: number;
    },
) => RedisClient;

type RedisClient = {
    ping(): Promise<unknown>;
    set(...args: unknown[]): Promise<string | null>;
    eval(...args: unknown[]): Promise<number>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    quit(): Promise<unknown>;
};

const REDIS_LOCK_NAMESPACE = "ai-blogger:lock:";
const REDIS_LOCK_KEY_SCHEDULE = `${REDIS_LOCK_NAMESPACE}schedule:`;
const REDIS_LOCK_KEY_PUBLISH = `${REDIS_LOCK_NAMESPACE}publish:`;

let redisClient: RedisClient | null = null;
let redisEnabled = false;

/**
 * Initialize Redis connection if available
 * Safe initialization - doesn't fail if Redis is unavailable
 */
export async function initializeRedisLocking(): Promise<boolean> {
    if (redisClient) {
        return redisEnabled;
    }

    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

    if (!redisUrl) {
        console.info("[AI-Blogger Redis Lock] REDIS_URL not configured, using MongoDB locking only");
        redisEnabled = false;
        return false;
    }

    try {
        const requireFunction = Function("return require")() as (id: string) => unknown;
        const redisModule = requireFunction("ioredis") as
            | RedisConstructor
            | { default?: RedisConstructor };
        const Redis = (typeof redisModule === "function" ? redisModule : redisModule.default) as RedisConstructor | undefined;

        if (!Redis) {
            throw new Error("ioredis module is unavailable");
        }

        redisClient = new Redis(redisUrl, {
            reconnectOnError: (err) => {
                if (err.message.includes("READONLY")) {
                    return true; // Reconnect on read-only errors
                }
                return false;
            },
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            connectTimeout: 5000,
            commandTimeout: 3000,
            maxRetriesPerRequest: 3,
        });

        // Test connection
        await redisClient.ping();
        redisEnabled = true;
        console.info("[AI-Blogger Redis Lock] Successfully connected to Redis");
        return true;
    } catch (error) {
        console.warn(
            "[AI-Blogger Redis Lock] Failed to connect to Redis:",
            error instanceof Error ? error.message : String(error),
            "Falling back to MongoDB locking"
        );
        redisEnabled = false;
        redisClient = null;
        return false;
    }
}

/**
 * Acquires a distributed lock using Redis SET with NX (atomic)
 * Returns lock ID if acquired, null if already locked
 */
export async function acquireRedisLock(
    lockKey: string,
    lockDurationSeconds: number = 900, // 15 minutes default
    lockId: string = generateLockId(),
): Promise<string | null> {
    if (!redisClient || !redisEnabled) {
        return null; // Redis not available, caller should use MongoDB lock
    }

    try {
        // SET key value EX seconds NX (atomic:only set if not exists)
        const result = await redisClient.set(
            lockKey,
            lockId,
            "EX",
            lockDurationSeconds,
            "NX"
        );

        if (result === "OK") {
            return lockId; // Successfully acquired
        }

        return null; // Lock already held by another process
    } catch (error) {
        console.warn(
            "[AI-Blogger Redis Lock] Failed to acquire lock:",
            error instanceof Error ? error.message : String(error)
        );
        return null; // Fail open - let MongoDB locking handle it
    }
}

/**
 * Releases a distributed lock, only if we still own it
 */
export async function releaseRedisLock(lockKey: string, lockId: string): Promise<boolean> {
    if (!redisClient || !redisEnabled) {
        return true; // Redis not available, skip
    }

    try {
        // Lua script ensures atomic check-and-delete
        const script = `
            if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("DEL", KEYS[1])
            else
                return 0
            end
        `;

        const result = await redisClient.eval(script, 1, lockKey, lockId);
        return result === 1; // 1 means we deleted it, 0 means we didn't own it
    } catch (error) {
        console.warn(
            "[AI-Blogger Redis Lock] Failed to release lock:",
            error instanceof Error ? error.message : String(error)
        );
        return false; // Lock will auto-expire after TTL
    }
}

/**
 * Extends the lock duration if we still own it
 */
export async function extendRedisLock(
    lockKey: string,
    lockId: string,
    additionalSeconds: number = 300
): Promise<boolean> {
    if (!redisClient || !redisEnabled) {
        return true; // Redis not available, skip
    }

    try {
        const script = `
            if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("EXPIRE", KEYS[1], ARGV[2])
            else
                return 0
            end
        `;

        const result = await redisClient.eval(script, 1, lockKey, lockId, additionalSeconds);
        return result === 1;
    } catch (error) {
        console.warn("[AI-Blogger Redis Lock] Failed to extend lock:", error);
        return false;
    }
}

/**
 * Checks if a lock is currently held
 */
export async function isRedisLockHeld(lockKey: string): Promise<boolean> {
    if (!redisClient || !redisEnabled) {
        return false;
    }

    try {
        const value = await redisClient.get(lockKey);
        return value !== null;
    } catch (error) {
        console.warn("[AI-Blogger Redis Lock] Failed to check lock:", error);
        return false;
    }
}

/**
 * Gets the current lock owner ID (for debugging)
 */
export async function getRedisLockOwner(lockKey: string): Promise<string | null> {
    if (!redisClient || !redisEnabled) {
        return null;
    }

    try {
        return await redisClient.get(lockKey);
    } catch (error) {
        console.warn("[AI-Blogger Redis Lock] Failed to get lock owner:", error);
        return null;
    }
}

/**
 * Force-releases a lock (for admin cleanup, use with caution)
 */
export async function forceReleaseRedisLock(lockKey: string): Promise<boolean> {
    if (!redisClient || !redisEnabled) {
        return false;
    }

    try {
        const deleted = await redisClient.del(lockKey);
        return deleted > 0;
    } catch (error) {
        console.error("[AI-Blogger Redis Lock] Failed to force-release lock:", error);
        return false;
    }
}

/**
 * Closes Redis connection (for graceful shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        redisEnabled = false;
    }
}

/**
 * Generates a unique lock ID (instance-based)
 */
function generateLockId(): string {
    const instanceId = process.env.HOSTNAME || `instance-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    return `${instanceId}:${timestamp}:${random}`;
}

/**
 * Creates a lock key for schedule operations
 */
export function makeScheduleLockKey(agencyId: string, scheduleId: string): string {
    return `${REDIS_LOCK_KEY_SCHEDULE}${agencyId}:${scheduleId}`;
}

/**
 * Creates a lock key for publish operations
 */
export function makePublishLockKey(agencyId: string, postId: string): string {
    return `${REDIS_LOCK_KEY_PUBLISH}${agencyId}:${postId}`;
}

/**
 * Is Redis locking enabled?
 */
export function isRedisLockingEnabled(): boolean {
    return redisEnabled;
}

/**
 * Gets Redis client (for advanced usage)
 */
export function getRedisClient(): RedisClient | null {
    return redisClient;
}
