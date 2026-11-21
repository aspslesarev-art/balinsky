"""Единая точка доступа к OpenAI для Python-скриптов в scripts/.

Пара к scripts/_openai.mjs: тот же ключ (OPENAI_API_KEY), та же модель
по умолчанию (OPENAI_CHAT_MODEL или gpt-5) и тот же флаг платного прогона
--yes-paid. До 28.08.2026 эти скрипты ходили в Azure (AZURE_OPENAI_*),
подписку закрыли — все такие вызовы отвечали 401.
"""

from __future__ import annotations

import json
import os
import re
import sys

import requests

YES_PAID_FLAG = "--yes-paid"


def chat_model() -> str:
    return os.environ.get("OPENAI_CHAT_MODEL") or "gpt-5"


def chat_json(system: str, user: str, timeout: int = 60) -> dict | None:
    """Один chat.completions-запрос с JSON-ответом. None — если ключа нет или
    запрос не удался (причина печатается в stderr, не глотается молча)."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("  OPENAI_API_KEY не задан — перевод пропущен", file=sys.stderr)
        return None
    model = chat_model()
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
    }
    # gpt-5* / o* — reasoning-модели: temperature не принимают, рассуждение
    # держим коротким (как в lib/market/llm.ts).
    if re.match(r"^(gpt-5|o\d)", model):
        body["reasoning_effort"] = "low"
    else:
        body["temperature"] = 0.2
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            json=body,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=timeout,
        )
        r.raise_for_status()
        return json.loads(r.json()["choices"][0]["message"]["content"])
    except Exception as e:
        print(f"  openai failed: {e}", file=sys.stderr)
        return None
