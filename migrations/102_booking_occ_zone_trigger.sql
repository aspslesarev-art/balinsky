-- Новые объекты (ежемесячный discover.mjs) сразу получают зону рынка.
create or replace function public.booking_occ_set_zone() returns trigger language plpgsql as $$
begin
  if new.zone is null and new.lat is not null then new.zone := booking_zone(new.lat, new.lng); end if;
  return new;
end $$;
drop trigger if exists booking_occ_set_zone on public.booking_occ_properties;
create trigger booking_occ_set_zone before insert or update of lat, lng on public.booking_occ_properties
  for each row execute function public.booking_occ_set_zone();
