import { Router, Response } from "express";
import { z } from "zod";
import { supabase } from "../db/client";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import logger from "../utils/logger";

const router = Router();

const ROUTE = "/api/notifications/user-alerts";

/**
 * GET /user-alerts
 * Fetch paginated alerts for the authenticated user, newest first.
 */
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const rawPage = parseInt(req.query.page as string, 10);
    const rawLimit = parseInt(req.query.limit as string, 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
    const offset = (page - 1) * limit;

    try {
        const { data, error, count } = await supabase
            .from("user_alerts")
            .select("*", { count: "exact" })
            .eq("user_id", req.user!.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            logger.error({ message: "Failed to fetch user alerts", error, route: ROUTE });
            res.status(500).json({ error: "Failed to fetch alerts" });
            return;
        }

        const { count: unreadCount } = await supabase
            .from("user_alerts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", req.user!.id)
            .eq("is_read", false);

        res.json({
            data: data ?? [],
            unreadCount: unreadCount ?? 0,
            pageIndex: page,
            pageSize: data?.length ?? 0,
            totalCount: count ?? 0,
            totalPageCount: Math.ceil((count ?? 0) / limit),
        });
    } catch (err) {
        logger.error({ message: "Unexpected error fetching user alerts", error: err, route: ROUTE });
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * PUT /user-alerts/read-all
 * Mark all unread alerts as read for the authenticated user.
 */
router.put("/read-all", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { error } = await supabase
            .from("user_alerts")
            .update({ is_read: true })
            .eq("user_id", req.user!.id)
            .eq("is_read", false);

        if (error) {
            logger.error({ message: "Failed to mark all alerts as read", error, route: ROUTE });
            res.status(500).json({ error: "Failed to update alerts" });
            return;
        }

        res.json({ success: true });
    } catch (err) {
        logger.error({ message: "Unexpected error marking alerts as read", error: err, route: ROUTE });
        res.status(500).json({ error: "Internal server error" });
    }
});

const markReadParams = z.object({
    id: z.string().uuid(),
});

/**
 * PUT /user-alerts/:id/read
 * Mark a single alert as read.
 */
router.put("/:id/read", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const parsed = markReadParams.safeParse(req.params);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid alert ID" });
        return;
    }

    try {
        const { error } = await supabase
            .from("user_alerts")
            .update({ is_read: true })
            .eq("id", parsed.data.id)
            .eq("user_id", req.user!.id);

        if (error) {
            logger.error({ message: "Failed to mark alert as read", error, route: ROUTE });
            res.status(500).json({ error: "Failed to update alert" });
            return;
        }

        res.json({ success: true });
    } catch (err) {
        logger.error({ message: "Unexpected error marking alert as read", error: err, route: ROUTE });
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * POST /user-alerts/check
 * Check user's scanned medicines against active drug alerts and create user_alerts
 * entries for any matches. This is called after a scan to proactively notify.
 */
router.post("/check", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    try {
        const { data: scanData, error: scanError } = await supabase
            .from("scan_history")
            .select("batch_number, medicine_id")
            .eq("client_ip", req.ip ?? "")
            .limit(50);

        if (scanError) {
            logger.error({ message: "Failed to fetch scan history", error: scanError, route: ROUTE });
            res.status(500).json({ error: "Failed to check alerts" });
            return;
        }

        const batchNumbers = [...new Set((scanData ?? []).map((s) => s.batch_number).filter(Boolean))];
        if (batchNumbers.length === 0) {
            res.json({ created: 0, alerts: [] });
            return;
        }

        const { data: activeAlerts, error: alertsError } = await supabase
            .from("drug_alerts")
            .select("*")
            .in("batch_number", batchNumbers)
            .limit(50);

        if (alertsError) {
            logger.error({ message: "Failed to fetch drug alerts", error: alertsError, route: ROUTE });
            res.status(500).json({ error: "Failed to check alerts" });
            return;
        }

        if (!activeAlerts || activeAlerts.length === 0) {
            res.json({ created: 0, alerts: [] });
            return;
        }

        const existingAlertKeys = new Set<string>();
        const { data: existingAlerts } = await supabase
            .from("user_alerts")
            .select("medicine_name, batch_number, alert_type")
            .eq("user_id", userId);

        for (const a of existingAlerts ?? []) {
            existingAlertKeys.add(`${a.batch_number ?? ""}:${a.alert_type}`);
        }

        const toInsert: Array<{
            user_id: string;
            medicine_name: string;
            batch_number: string | null;
            alert_type: string;
            title: string;
            message: string;
            source_url: string | null;
        }> = [];

        for (const alert of activeAlerts) {
            const key = `${alert.batch_number ?? ""}:${alert.alert_type ?? "safety_alert"}`;
            if (existingAlertKeys.has(key)) continue;

            toInsert.push({
                user_id: userId,
                medicine_name: alert.reported_brand_name ?? "Unknown Medicine",
                batch_number: alert.batch_number ?? null,
                alert_type: alert.alert_type ?? "safety_alert",
                title: `${alert.alert_type === "recalled" ? "Recall" : alert.alert_type === "counterfeit" ? "Counterfeit Alert" : "Safety Alert"}: ${alert.reported_brand_name ?? "Unknown"}`,
                message: `A medicine you scanned (${alert.reported_brand_name ?? "Unknown"}) has been flagged as ${alert.alert_type === "recalled" ? "recalled" : alert.alert_type === "counterfeit" ? "potentially counterfeit" : "under a safety alert"}.${alert.batch_number ? ` Batch: ${alert.batch_number}.` : ""}`,
                source_url: alert.source_url ?? null,
            });
        }

        if (toInsert.length === 0) {
            res.json({ created: 0, alerts: [] });
            return;
        }

        const { error: insertError } = await supabase.from("user_alerts").insert(toInsert);
        if (insertError) {
            logger.error({ message: "Failed to insert user alerts", error: insertError, route: ROUTE });
            res.status(500).json({ error: "Failed to create alerts" });
            return;
        }

        res.json({ created: toInsert.length, alerts: toInsert.map((a) => ({ medicine_name: a.medicine_name, alert_type: a.alert_type })) });
    } catch (err) {
        logger.error({ message: "Unexpected error checking drug alerts", error: err, route: ROUTE });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
