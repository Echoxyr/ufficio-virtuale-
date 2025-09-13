-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_cc ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations: only members can see their org
CREATE POLICY "Users can see their organization" ON orgs
  FOR ALL USING (id = org_of(auth.uid()));

-- Profiles: only same org members can see profiles
CREATE POLICY "Users can see profiles in their org" ON profiles
  FOR SELECT USING (org_id = org_of(auth.uid()));

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND org_id = org_of(auth.uid()));

-- Teams: same org visibility
CREATE POLICY "Users can see teams in their org" ON teams
  FOR ALL USING (org_id = org_of(auth.uid()));

CREATE POLICY "Team creators can manage teams" ON teams
  FOR ALL USING (created_by = auth.uid());

-- Team members: visible to org members
CREATE POLICY "Users can see team members in their org" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t 
      WHERE t.id = team_id AND t.org_id = org_of(auth.uid())
    )
  );

-- Channels: members or public in same org
CREATE POLICY "Users can see channels they're members of" ON channels
  FOR SELECT USING (
    org_id = org_of(auth.uid()) AND (
      type = 'public' OR 
      EXISTS (
        SELECT 1 FROM channel_members cm 
        WHERE cm.channel_id = id AND cm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create channels in their org" ON channels
  FOR INSERT WITH CHECK (
    org_id = org_of(auth.uid()) AND created_by = auth.uid()
  );

CREATE POLICY "Channel creators can update channels" ON channels
  FOR UPDATE USING (created_by = auth.uid());

-- Channel members: visible to members
CREATE POLICY "Users can see channel members" ON channel_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channels c 
      WHERE c.id = channel_id AND c.org_id = org_of(auth.uid())
    ) AND (
      EXISTS (
        SELECT 1 FROM channel_members cm2 
        WHERE cm2.channel_id = channel_id AND cm2.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM channels c2 
        WHERE c2.id = channel_id AND c2.type = 'public'
      )
    )
  );

CREATE POLICY "Users can join/leave channels" ON channel_members
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM channels c 
      WHERE c.id = channel_id AND c.created_by = auth.uid()
    )
  );

-- Threads: only channel members can see
CREATE POLICY "Channel members can see threads" ON threads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM channel_members cm 
      WHERE cm.channel_id = threads.channel_id AND cm.user_id = auth.uid()
    )
  );

-- Messages: only thread/channel members can see
CREATE POLICY "Channel members can see messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM threads t
      JOIN channel_members cm ON cm.channel_id = t.channel_id
      WHERE t.id = thread_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in channels they're members of" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM threads t
      JOIN channel_members cm ON cm.channel_id = t.channel_id
      WHERE t.id = thread_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (user_id = auth.uid());

-- Message CC: visible to message viewers and CC recipients
CREATE POLICY "Users can see message CC" ON message_cc
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN threads t ON t.id = m.thread_id
      JOIN channel_members cm ON cm.channel_id = t.channel_id
      WHERE m.id = message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add CC to their messages" ON message_cc
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.id = message_id AND m.user_id = auth.uid()
    )
  );

-- Attachments: linked to message visibility
CREATE POLICY "Users can see attachments for visible messages" ON attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN threads t ON t.id = m.thread_id
      JOIN channel_members cm ON cm.channel_id = t.channel_id
      WHERE m.id = message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments to their messages" ON attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.id = message_id AND m.user_id = auth.uid()
    )
  );

-- Notifications: only recipient can see
CREATE POLICY "Users can see their own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- Audit logs: same org, admins can see all
CREATE POLICY "Users can see audit logs in their org" ON audit_logs
  FOR SELECT USING (
    org_id = org_of(auth.uid()) AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
