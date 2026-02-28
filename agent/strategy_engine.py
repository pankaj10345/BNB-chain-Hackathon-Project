import json
from typing import Any, Dict

from agent.settings import settings

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None


class StrategyEngine:
    def __init__(self) -> None:
        self.client = None
        if settings.openai_api_key and OpenAI is not None:
            self.client = OpenAI(api_key=settings.openai_api_key)

    def choose_strategy(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        if self.client is None:
            return self._heuristic_strategy(opportunity)

        prompt = {
            "market": opportunity["market"],
            "gap_bps": opportunity["gap_bps"],
            "net_profit": opportunity["net_profit"],
            "confidence": opportunity["confidence"],
            "liquidity_hint": "high" if opportunity["gap_bps"] > 120 else "medium",
        }

        instruction = (
            "Return strict JSON with keys strategy and rationale. "
            "strategy must be DELTA_NEUTRAL or YIELD_ROTATION. "
            f"Opportunity: {json.dumps(prompt)}"
        )

        try:
            text = self._model_response_text(instruction)
            data = json.loads(text)
            strategy = data.get("strategy", "DELTA_NEUTRAL")
            if strategy not in {"DELTA_NEUTRAL", "YIELD_ROTATION"}:
                strategy = "DELTA_NEUTRAL"
            return {"strategy": strategy, "rationale": data.get("rationale", "model")}
        except Exception:
            return self._heuristic_strategy(opportunity)

    def _model_response_text(self, instruction: str) -> str:
        # Prefer the Responses API when available, but tolerate SDKs that only expose Chat Completions.
        responses_api = getattr(self.client, "responses", None)
        if responses_api is not None and hasattr(responses_api, "create"):
            try:
                response = responses_api.create(
                    model=settings.openai_model,
                    input=instruction,
                    temperature=0.1,
                )
                output_text = getattr(response, "output_text", None)
                if output_text:
                    return output_text.strip()
            except AttributeError:
                # Older client variants can expose partial resources; fall through to chat completions.
                pass

        chat_api = getattr(getattr(self.client, "chat", None), "completions", None)
        if chat_api is not None and hasattr(chat_api, "create"):
            response = chat_api.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": instruction}],
                temperature=0.1,
            )
            return (response.choices[0].message.content or "").strip()

        raise RuntimeError("OpenAI SDK does not expose responses.create or chat.completions.create")

    def _heuristic_strategy(self, opportunity: Dict[str, Any]) -> Dict[str, str]:
        if opportunity["gap_bps"] >= 500 and opportunity["confidence"] >= 0.75:
            return {"strategy": "DELTA_NEUTRAL", "rationale": "large price gap with high confidence"}
        return {"strategy": "YIELD_ROTATION", "rationale": "small/uncertain gap; prefer preserving capital"}
