-- Балл востребованности юнита в своём районе (1..100) и модель под ним.
--
-- Балл читается буквально: «ожидаемо сильнее N% объектов, которые сдаются
-- рядом в этом же сегменте». Считается вне БД (scripts/demand-score.mjs),
-- потому что оценщик — гребневая регрессия по 22 признакам продукта, и держать
-- её в SQL значило бы дублировать извлечение признаков вторым кодом; при
-- расхождении двух реализаций балл поехал бы молча.

-- Коэффициенты модели, подогнанной на рынке аренды (scripts/demand-model-fit).
-- Лежат в БД, а не в файле, чтобы прод и любой скрипт считали одним и тем же,
-- и чтобы было видно, когда модель переобучали и с каким качеством.
create table if not exists public.demand_model (
  version          int  not null,
  target           text not null check (target in ('adr', 'occ')),
  coef             jsonb not null,
  intercept        double precision not null,
  n_train          int not null,
  n_holdout        int not null,
  -- Ранговая корреляция предсказания с фактом на отложенной выборке.
  -- Ниже ~0.2 балл показывать нельзя: он перестанет отличать объекты.
  holdout_spearman double precision,
  fitted_at        timestamptz not null default now(),
  primary key (version, target)
);

alter table public.demand_model enable row level security;
grant all on public.demand_model to service_role;

create table if not exists public.unit_demand_score (
  kind        text not null check (kind in ('villa', 'apartment')),
  airtable_id text not null,
  score       int  not null check (score between 1 and 100),
  -- На чём построено сравнение: чем шире база, тем осторожнее формулировка.
  basis       text not null check (basis in ('zone_beds', 'zone', 'island')),
  zone        text not null,
  beds_bucket text not null,
  -- Сколько сдающихся объектов попало в сравнение.
  comps_n     int  not null,
  -- Предсказанный RevPAR относительно среднего соседа страты.
  index_value numeric,
  -- Балл до примеси спроса сегмента и сама эта примесь — чтобы можно было
  -- разобрать готовую цифру, не пересчитывая всё заново.
  pct_in_stratum      numeric,
  segment_demand_pct  numeric,
  -- Всё, из чего пишется «почему»: рынок страты, предсказание, разложение
  -- балла по признакам. Текст генерится отдельно и кладётся в why_*.
  facts       jsonb not null,
  why_ru      text,
  why_en      text,
  why_built_at timestamptz,
  model_version int not null,
  computed_at timestamptz not null default now(),
  primary key (kind, airtable_id)
);

create index if not exists unit_demand_score_zone on public.unit_demand_score (zone, kind);

alter table public.unit_demand_score enable row level security;

do $$ begin
  create policy unit_demand_score_read on public.unit_demand_score
    for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

-- Без гранта роль получает тихий permission denied уже в рантайме.
grant select on public.unit_demand_score to anon, authenticated;
grant all    on public.unit_demand_score to service_role;
