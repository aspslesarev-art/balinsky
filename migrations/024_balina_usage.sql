-- Per-request usage log for Azure OpenAI calls.
-- Лог каждого хита по Azure (chat / embed / transcribe) с посчитанной
-- ценой в USD. Использует код prices, которые лежат в lib/usage-tracker.ts.
-- Считаем ежедневный/месячный burn rate чтобы вовремя видеть аномалии.

CREATE TABLE IF NOT EXISTS balina_usage (
  id              bigserial PRIMARY KEY,
  ts              timestamptz NOT NULL DEFAULT now(),
  -- 'chat-web' / 'chat-tg' / 'embed-search' / 'embed-backfill' / 'transcribe' / 'other'
  feature         text NOT NULL,
  -- Azure deployment name as called (gpt-5.4, text-embedding-3-large, gpt-4o-transcribe…)
  deployment      text NOT NULL,
  prompt_tokens   int  NOT NULL DEFAULT 0,
  completion_tokens int NOT NULL DEFAULT 0,
  audio_seconds   numeric(10, 2) NOT NULL DEFAULT 0,
  -- USD cost computed at insertion using the static price table in code.
  -- Stored verbatim so changing the price table later doesn't rewrite
  -- historical numbers.
  cost_usd        numeric(12, 6) NOT NULL DEFAULT 0,
  -- Optional context for debugging spikes — chat_id, user_id, etc.
  meta            jsonb
);

CREATE INDEX IF NOT EXISTS balina_usage_ts_idx           ON balina_usage (ts DESC);
CREATE INDEX IF NOT EXISTS balina_usage_feature_ts_idx   ON balina_usage (feature, ts DESC);
CREATE INDEX IF NOT EXISTS balina_usage_deployment_ts_idx ON balina_usage (deployment, ts DESC);
