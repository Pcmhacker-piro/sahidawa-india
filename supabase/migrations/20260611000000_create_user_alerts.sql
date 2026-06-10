CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('recall', 'ban', 'safety_alert', 'counterfeit')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_unread ON user_alerts(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_user_alerts_created_at ON user_alerts(created_at DESC);

ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
    ON user_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
    ON user_alerts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert alerts"
    ON user_alerts FOR INSERT
    WITH CHECK (true);
