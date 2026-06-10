import { createClient, SupabaseClient } from "@supabase/supabase-js";
import logger from "../utils/logger";
import { CONNECTION_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS, fetchWithRetry } from "./fetchUtils";

if (!process.env.SUPABASE_URL) {
    throw new Error(
        "Missing required environment variable: SUPABASE_URL. " +
            "Set it in your .env file (e.g. https://<project>.supabase.co)."
    );
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error(
        "Missing required environment variable: SUPABASE_ANON_KEY. " +
            "The API backend requires the anon key for standard database operations."
    );
}

const supabaseUrl = process.env.SUPABASE_URL;

const MAX_CONNECTIONS = 20;
const IDLE_TIMEOUT_MS = 30_000;

class ConnectionPool {
    private active = 0;
    private queue: Array<() => void> = [];
    private readonly max: number;

    constructor(max: number) {
        this.max = max;
    }

    async acquire(): Promise<void> {
        if (this.active < this.max) {
            this.active++;
            return;
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const idx = this.queue.indexOf(resolver);
                if (idx !== -1) this.queue.splice(idx, 1);
                reject(
                    new Error(
                        `Database connection pool exhausted — waited ${IDLE_TIMEOUT_MS}ms for a free slot`
                    )
                );
            }, IDLE_TIMEOUT_MS);

            const resolver = () => {
                clearTimeout(timeout);
                this.active++;
                resolve();
            };

            this.queue.push(resolver);
        });
    }

    release(): void {
        this.active = Math.max(0, this.active - 1);
        const next = this.queue.shift();
        if (next) next();
    }

    get stats() {
        return { active: this.active, queued: this.queue.length, max: this.max };
    }
}

export const pool = new ConnectionPool(MAX_CONNECTIONS);

async function pooledFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    await pool.acquire();
    try {
        return await fetchWithRetry(input, init);
    } finally {
        pool.release();
    }
}

export const supabase: SupabaseClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
    global: {
        fetch: pooledFetch as typeof fetch,
    },
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

let adminClientInstance: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
    if (!adminClientInstance) {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error(
                "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. " +
                    "The admin client requires the service_role key for privileged operations."
            );
        }
        adminClientInstance = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            global: {
                fetch: pooledFetch as typeof fetch,
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }
    return adminClientInstance;
}

function gracefulShutdown(signal: string) {
    logger.warn(
        `Received ${signal} — waiting for ${pool.stats.active} active DB connection(s) to drain...`
    );

    const check = setInterval(() => {
        if (pool.stats.active === 0) {
            clearInterval(check);
            logger.info("All DB connections drained. Shutting down.");
            process.exit(0);
        }
    }, 200);

    setTimeout(() => {
        clearInterval(check);
        logger.error("Forced shutdown — connections did not drain in time.");
        process.exit(1);
    }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

setInterval(() => {
    const { active, queued, max } = pool.stats;
    if (queued > 0) {
        logger.warn(`DB pool pressure: ${active}/${max} active, ${queued} queued`);
    }
}, 5_000);
