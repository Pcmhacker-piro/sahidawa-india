import { supabase, getAdminClient } from "../db/client";
import logger from "../utils/logger";

export const logAdminAction = async (
    adminId: string,
    action: string,
    targetType: "REPORT" | "MEDICINE",
    targetId: string,
    details: Record<string, unknown>
) => {
    const adminDb = getAdminClient();
    const { error } = await adminDb.from("audit_logs").insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
    });

    if (error) {
        logger.error("Failed to write audit log", {
            adminId,
            action,
            targetType,
            targetId,
            error: error.message,
        });
    }
};
