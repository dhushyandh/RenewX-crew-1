/*
# Admin Manage Users Policies and Functions

Allows administrators to:
1. View all user profiles.
2. Update user roles between 'admin' and 'customer'.
3. Adds set_user_role RPC function for secure role switching.
*/

-- Allow admins to view all profiles
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to update user profiles (role and email)
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT UPDATE (role) ON profiles TO authenticated;

-- Function for admins to change role of any user
CREATE OR REPLACE FUNCTION set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized: Admin privileges required.';
  END IF;

  IF p_role NOT IN ('admin', 'customer') THEN
    RAISE EXCEPTION 'Invalid role: Must be admin or customer.';
  END IF;

  UPDATE profiles SET role = p_role WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_user_role FROM anon;
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;
