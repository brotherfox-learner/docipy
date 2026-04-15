DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'subscriptions'
      AND c.conname = 'subscriptions_user_id_unique'
  ) THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id");
  END IF;
END $$;
