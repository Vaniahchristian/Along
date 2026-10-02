-- Allow Parties as a plan category.
alter table public.plans drop constraint if exists plans_category_check;
alter table public.plans
  add constraint plans_category_check
  check (category = any (array['Fitness'::text, 'Outings'::text, 'Learning'::text, 'Parties'::text]));
