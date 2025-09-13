-- Demo organization
INSERT INTO orgs (id, name, domain) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Demo Corp', 'demo.local');

-- Demo users (you need to create these in Auth first via Supabase Dashboard)
-- Instructions:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add user" and create:
--    - Email: mario.rossi@demo.local, Password: demo123!
--    - Email: anna.verdi@demo.local, Password: demo123!
-- 3. Copy their UUIDs and replace the ones below

-- Example profiles (replace UUIDs with actual ones from auth.users)
INSERT INTO profiles (id, org_id, handle, display_name, role, department) VALUES 
('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'mario.rossi', 'Mario Rossi', 'admin', 'IT'),
('22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'anna.verdi', 'Anna Verdi', 'user', 'Sales');

-- Demo team
INSERT INTO teams (id, org_id, name, description, created_by) VALUES 
('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'Engineering', 'Development team', '11111111-1111-1111-1111-111111111111');

-- Team members
INSERT INTO team_members (team_id, user_id, role) VALUES 
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'admin'),
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'member');

-- Demo private channel
INSERT INTO channels (id, org_id, name, description, type, created_by, retention_days) VALUES 
('44444444-4444-4444-4444-444444444444', '550e8400-e29b-41d4-a716-446655440000', 'private-demo', 'Demo private channel', 'private', '11111111-1111-1111-1111-111111111111', 7);

-- Channel members
INSERT INTO channel_members (channel_id, user_id, role) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'admin'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'member');

-- Demo thread
INSERT INTO threads (id, channel_id, title, created_by) VALUES 
('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Welcome Thread', '11111111-1111-1111-1111-111111111111');

-- Demo messages
INSERT INTO messages (id, thread_id, user_id, body_md) VALUES 
('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Welcome to our demo channel! @anna.verdi'),
('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Thanks Mario! Excited to be here.');

-- Demo CC
INSERT INTO message_cc (message_id, user_id, added_by) VALUES 
('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
