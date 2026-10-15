-- Ещё объявления Booking, найденные по бренду застройщика в названии
-- («… by BREIG», «Alex Villas …», «Sunny …», «NEXA …»), в пределах 300 м от
-- комплекса того же застройщика (просьба владельца 15.10.2026: «у BREIG
-- куча вилл уже сдаётся»). Чужие объявления с похожими словами («White …»,
-- «Hidden …», «Coco …» далеко от комплекса) не брали.
insert into public.complex_booking_match (complex_id, booking_id, note) values
  ('rec4LXzhZnVEi0MWP', 20990, 'by developer brand, 66 m'),
  ('rec4vN8uwWnGwCFp7', 16780, 'by developer brand, 52 m'),
  ('recBElMdLmCDIRNow', 20341, 'by developer brand, 29 m'),
  ('recWmiC2vOh7qvgUh', 9508, 'by developer brand, 19 m'),
  ('recwVegUpZ6oxXiCK', 44034, 'by developer brand, 114 m'),
  ('recwuDWPIkHi0VtXU', 17666, 'by developer brand, 43 m'),
  ('recMICimrLkWROzbu', 21774, 'by developer brand, 24 m'),
  ('recR9MaDiP4RTvhF6', 2304, 'by developer brand, 47 m'),
  ('recnsqk8gbw4fxZol', 2328, 'by developer brand, 20 m'),
  ('recKz7wJJNzwaxsjB', 53429, 'by developer brand, 25 m'),
  ('rec4HjYtcfXQXwQzb', 21338, 'by developer brand, 67 m'),
  ('adm_95d1ef8c2b', 37131, 'by developer brand, 9 m'),
  ('recSEFWfJu1GLSoPj', 39112, 'by developer brand, 26 m'),
  ('recQUohCdzLZS5Cyf', 17670, 'by developer brand, 68 m'),
  ('recjWpKfF4tTOFoLq', 17674, 'by developer brand, 58 m'),
  ('adm_7905b4fd9e', 20970, 'by developer brand, 7 m'),
  ('adm_7905b4fd9e', 52972, 'by developer brand, 35 m'),
  ('adm_693fa00936', 10439, 'by developer brand, 4 m'),
  ('recsBcb5mlxr4YOif', 2458, 'by developer brand, 24 m'),
  ('recsBcb5mlxr4YOif', 2593, 'by developer brand, 28 m'),
  ('recsBcb5mlxr4YOif', 2604, 'by developer brand, 22 m'),
  ('recsBcb5mlxr4YOif', 2693, 'by developer brand, 33 m'),
  ('recsBcb5mlxr4YOif', 2871, 'by developer brand, 20 m'),
  ('recsBcb5mlxr4YOif', 3353, 'by developer brand, 44 m')
on conflict do nothing;
