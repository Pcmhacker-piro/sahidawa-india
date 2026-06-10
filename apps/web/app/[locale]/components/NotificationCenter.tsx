"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useUserAlerts, type UserAlert } from "./useUserAlerts";

function formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

function alertColor(type: UserAlert["alert_type"]): string {
    switch (type) {
        case "recall":
            return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
        case "counterfeit":
            return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
        case "ban":
            return "border-l-rose-600 bg-rose-50 dark:bg-rose-950/20";
        case "safety_alert":
            return "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20";
    }
}

export default function NotificationCenter() {
    const { alerts, unreadCount, loading, markAsRead, markAllAsRead } = useUserAlerts();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            >
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={20} className="animate-spin text-slate-400" />
                            </div>
                        )}

                        {!loading && alerts.length === 0 && (
                            <div className="py-8 text-center text-sm text-slate-500">
                                No notifications yet.
                            </div>
                        )}

                        {!loading &&
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`border-l-4 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${alertColor(alert.alert_type)} ${!alert.is_read ? "bg-slate-50 dark:bg-slate-800/30" : ""}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {alert.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                {alert.message}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className="text-[11px] text-slate-400">
                                                    {formatTime(alert.created_at)}
                                                </span>
                                                {alert.source_url && (
                                                    <a
                                                        href={alert.source_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 hover:underline dark:text-emerald-400"
                                                    >
                                                        View source
                                                        <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {!alert.is_read && (
                                            <button
                                                onClick={() => markAsRead(alert.id)}
                                                className="mt-0.5 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                                                aria-label="Mark as read"
                                            >
                                                <CheckCheck size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>

                    <div className="border-t border-slate-100 px-4 py-2.5 text-center dark:border-slate-800">
                        <Link
                            href="/alerts"
                            onClick={() => setOpen(false)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        >
                            View all alerts
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
