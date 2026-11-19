-- English labels for a database that already applied 001 with Korean names.
-- Fresh installs already insert English in 001. This update is then a no-op.
update process_groups set name_ko = name_en;
update knowledge_areas set name_ko = name_en;

-- Case text is not updated here. Reload supabase/seed.sql into an empty case bank
-- after this migration. Do not run the seed on top of existing case codes.
