-- Update message search vector on insert/update
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.body_tsv := to_tsvector('english', NEW.body_md);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_search_vector_trigger
  BEFORE INSERT OR UPDATE OF body_md ON messages
  FOR EACH ROW EXECUTE FUNCTION update_message_search_vector();

-- Notify CC recipients
CREATE OR REPLACE FUNCTION notify_message_cc()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT 
    NEW.user_id,
    'message_cc',
    'You were CC''d on a message',
    (SELECT p.display_name FROM profiles p WHERE p.id = NEW.added_by) || ' added you to a message',
    jsonb_build_object(
      'message_id', NEW.message_id,
      'added_by', NEW.added_by,
      'thread_id', (SELECT t.id FROM messages m JOIN threads t ON t.id = m.thread_id WHERE m.id = NEW.message_id)
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_message_cc_trigger
  AFTER INSERT ON message_cc
  FOR EACH ROW EXECUTE FUNCTION notify_message_cc();

-- Notify channel members of new messages (optional mentions)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  mention_pattern TEXT := '@(\w+)';
  mentioned_handles TEXT[];
  handle TEXT;
  mentioned_user_id UUID;
  channel_id UUID;
BEGIN
  -- Get channel_id
  SELECT t.channel_id INTO channel_id 
  FROM threads t WHERE t.id = NEW.thread_id;
  
  -- Extract mentions
  SELECT array_agg(matches[1]) INTO mentioned_handles
  FROM regexp_split_to_table(NEW.body_md, '\s') AS word,
       regexp_matches(word, mention_pattern, 'g') AS matches;
  
  -- Notify mentioned users
  IF mentioned_handles IS NOT NULL THEN
    FOREACH handle IN ARRAY mentioned_handles LOOP
      SELECT p.id INTO mentioned_user_id 
      FROM profiles p 
      JOIN channel_members cm ON cm.user_id = p.id
      WHERE p.handle = handle 
        AND cm.channel_id = notify_new_message.channel_id
        AND p.id != NEW.user_id;
      
      IF mentioned_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          mentioned_user_id,
          'mention',
          'You were mentioned',
          (SELECT display_name FROM profiles WHERE id = NEW.user_id) || ' mentioned you in a message',
          jsonb_build_object(
            'message_id', NEW.id,
            'thread_id', NEW.thread_id,
            'channel_id', channel_id
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_new_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- DLP (Data Loss Prevention) trigger
CREATE OR REPLACE FUNCTION dlp_check_message()
RETURNS TRIGGER AS $$
DECLARE
  iban_pattern TEXT := '\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b';
  cf_pattern TEXT := '\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b';
  masked_body TEXT;
BEGIN
  -- Block IBAN completely
  IF NEW.body_md ~* iban_pattern THEN
    RAISE EXCEPTION 'Message blocked: IBAN codes are not allowed in messages';
  END IF;
  
  -- Mask Codice Fiscale
  masked_body := regexp_replace(
    NEW.body_md, 
    cf_pattern, 
    '\1\2****\5\6****', 
    'gi'
  );
  
  IF masked_body != NEW.body_md THEN
    NEW.body_md := masked_body;
    -- Optionally log this action
    INSERT INTO audit_logs (org_id, user_id, action, resource_type, metadata)
    VALUES (
      org_of(NEW.user_id),
      NEW.user_id,
      'dlp_mask',
      'message',
      jsonb_build_object('masked_cf', true)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dlp_check_message_trigger
  BEFORE INSERT OR UPDATE OF body_md ON messages
  FOR EACH ROW EXECUTE FUNCTION dlp_check_message();

-- Update thread last message timestamp
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_last_message();
