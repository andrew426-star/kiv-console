-- Enabling RLS on user_profile (previous migration) wasn't sufficient: the
-- anon key can still read it, meaning a pre-existing permissive policy is
-- granting access underneath RLS. Revoking the table privileges directly is
-- independent of whatever policies already exist — anon/authenticated lose
-- all access at the grant level, not just the policy level. service_role
-- (and the table owner) are unaffected since they bypass RLS/grants.

revoke all on public.user_profile from anon, authenticated;
