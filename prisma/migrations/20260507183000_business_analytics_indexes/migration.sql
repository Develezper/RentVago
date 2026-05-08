-- Analytics indexes for heavy monthly aggregations and search hot zones
CREATE INDEX IF NOT EXISTS "Property_createdAt_idx"
ON "Property"("createdAt");

CREATE INDEX IF NOT EXISTS "Property_status_createdAt_idx"
ON "Property"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Property_isScraped_createdAt_idx"
ON "Property"("isScraped", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"
ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "SearchFilter_location_idx"
ON "SearchFilter"("location");

CREATE INDEX IF NOT EXISTS "SearchFilter_location_createdAt_idx"
ON "SearchFilter"("location", "createdAt");

-- Partial index focused on MATCH notifications used by monthly match-rate metric.
CREATE INDEX IF NOT EXISTS "Notification_match_createdAt_idx"
ON "Notification"("createdAt")
WHERE "message" LIKE 'MATCH:%';
