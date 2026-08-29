-- Remove the RoundHQ platform support account from customer staff lists.
-- The account remains an organization member only while an owner opens a
-- support view; it is no longer represented as a customer-facing staff member.
delete from public.staff_members as staff
using public.organizations as organization
where staff.organization_id = organization.id
  and lower(coalesce(staff.email, '')) = 'mail@roundhq.co.uk'
  and organization.owner_user_id is distinct from staff.auth_user_id;
