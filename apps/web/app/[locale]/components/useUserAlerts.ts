"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

export type UserAlert = {
    id: string;
    medicine_name: string;
    batch_number: string | null;
    alert_type: "recall" | "ban" | "safety_alert" | "counterfeit";
    title: string;
    message: string;
    source_url: string | null;
    is_read: boolean;
    created_at: string;
};

type FetchResponse = {
    data: UserAlert[];
    unreadCount: number;
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPageCount: number;
};

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };
    const accessToken = getCookie("sb-access-token") ?? localStorage.getItem("sb-access-token");
    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return fetch(url, { ...options, headers, credentials: "include" });
}

export function useUserAlerts() {
    const [alerts, setAlerts] = useState<UserAlert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    const fetchAlerts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchWithAuth(`${API_BASE}/api/notifications/user-alerts?page=1&limit=20`);
            if (!res.ok) {
                if (res.status === 401) {
                    setAlerts([]);
                    setUnreadCount(0);
                    return;
                }
                throw new Error("Failed to fetch alerts");
            }
            const data: FetchResponse = await res.json();
            setAlerts(data.data);
            setUnreadCount(data.unreadCount);
        } catch (err) {
            if (err instanceof Error && err.message !== "Failed to fetch alerts") {
                setError("Could not load notifications");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchedRef.current = false;
    }, []);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchAlerts();
    }, [fetchAlerts]);

    const markAsRead = useCallback(
        async (id: string) => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/api/notifications/user-alerts/${id}/read`, {
                    method: "PUT",
                });
                if (!res.ok) return;
                setAlerts((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch {
                // silent
            }
        },
        []
    );

    const markAllAsRead = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/notifications/user-alerts/read-all`, {
                method: "PUT",
            });
            if (!res.ok) return;
            setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
            setUnreadCount(0);
        } catch {
            // silent
        }
    }, []);

    const checkForNewAlerts = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/notifications/user-alerts/check`, {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                if (data.created > 0) {
                    fetchAlerts();
                }
            }
        } catch {
            // silent
        }
    }, [fetchAlerts]);

    return {
        alerts,
        unreadCount,
        loading,
        error,
        fetchAlerts,
        markAsRead,
        markAllAsRead,
        checkForNewAlerts,
    };
}
