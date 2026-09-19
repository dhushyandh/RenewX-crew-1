/*
# Bootstrap first admin

Creates a function that automatically promotes the first user to admin.
This ensures the first person to sign up gets admin privileges to manage products.
After the first admin exists, the function does nothing (no-op).
The trigger on auth.users already creates a 'customer' profile — this function
upgrades that profile to 'admin' if no admin exists yet.
*/

CREATE OR REPLACE FUNCTION handle_new_user_with_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_count integer;
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO v_admin_count FROM profiles WHERE role = 'admin';

  IF v_admin_count = 0 THEN
    UPDATE profiles SET role = 'admin' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_admin();
