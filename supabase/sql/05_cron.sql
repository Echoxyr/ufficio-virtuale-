-- Function to purge expired messages
CREATE OR REPLACE FUNCTION purge_expired_messages()
RETURNS INTEGER AS $$
DECLARE
  purged_count INTEGER := 0;
BEGIN
  -- Delete messages older than channel retention policy
  WITH expired_messages AS (
    DELETE FROM messages m
    USING threads t, channels c
    WHERE m.thread_id = t.id
      AND t.channel_id = c.id
      AND c.retention_days IS NOT NULL
      AND m.created_at < NOW() - INTERVAL '1 day' * c.retention_days
    RETURNING m.id
  )
  SELECT COUNT(*) INTO purged_count FROM expired_messages;
  
  -- Delete TTL expired messages
  WITH ttl_expired AS (
    DELETE FROM messages
    WHERE ttl_hours IS NOT NULL
      AND created_at < NOW() - INTERVAL '1 hour' * ttl_hours
    RETURNING id
  )
  SELECT purged_count + COUNT(*) INTO purged_count FROM ttl_expired;
  
  -- Log the purge operation
  INSERT INTO audit_logs (org_id, action, resource_type, metadata)
  SELECT DISTINCT 
    c.org_id,
    'retention_purge',
    'messages',
    jsonb_build_object('purged_count', purged_count, 'purged_at', NOW())
  FROM channels c
  WHERE c.retention_days IS NOT NULL;
  
  RETURN purged_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule the purge function to run daily at 3:00 AM
SELECT cron.schedule(
  'purge-expired-messages',
  '0 3 * * *',
  'SELECT purge_expired_messages();'
);
