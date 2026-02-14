

## Fix: Account Deactivation Not Working

### Problem
The `profiles` table has **RESTRICTIVE** RLS policies for UPDATE. This means ALL update policies must pass simultaneously. When an admin tries to deactivate another user's account:
- Policy "Admins can update all profiles" passes (admin role check)
- Policy "Users can update their own profile" fails (it's not their own profile)

Since both are restrictive, the AND logic blocks the update.

The same issue affects the SELECT policies -- admins might not see all profiles correctly either.

### Solution
Drop the existing restrictive policies and recreate them as **PERMISSIVE** (the PostgreSQL default). With permissive policies, only ONE needs to pass (OR logic), so admins can update any profile, and regular users can still update their own.

### Technical Steps

**Step 1: Database Migration** -- Fix RLS policies on `profiles` table

```sql
-- Drop restrictive UPDATE policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop restrictive SELECT policies  
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate as PERMISSIVE (default) UPDATE policies
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Recreate as PERMISSIVE SELECT policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

No code changes needed -- `handleToggleUserActive` in `Admin.tsx` is already correct.

