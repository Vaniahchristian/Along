-- Allow requesters to cancel their own pending join requests.
grant delete on public.join_requests to authenticated;

drop policy if exists "members cancel own pending requests" on public.join_requests;
create policy "members cancel own pending requests" on public.join_requests
  for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'pending');
