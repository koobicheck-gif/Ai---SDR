"""
LLM Router: routes calls to cheapest/best model via Anthropic, OpenAI, or OpenRouter.
Tracks cost and token usage per call.
"""
import os
from typing import Optional, Tuple
from config import settings

# Cost per 1K tokens (input, output) in USD
MODEL_COSTS = {
    "claude-haiku-4-5-20251001": (0.00025, 0.00125),
    "claude-sonnet-4-6": (0.003, 0.015),
    "claude-opus-4-6": (0.015, 0.075),
    "gpt-4o-mini": (0.00015, 0.0006),
    "gpt-4o": (0.005, 0.015),
    "openai/gpt-4o-mini": (0.00015, 0.0006),
    "anthropic/claude-haiku-4-5": (0.00025, 0.00125),
    "anthropic/claude-sonnet-4-6": (0.003, 0.015),
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    costs = MODEL_COSTS.get(model, (0.002, 0.002))
    return (input_tokens * costs[0] + output_tokens * costs[1]) / 1000


async def call_llm(
    messages: list[dict],
    system: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    max_tokens: int = 1024,
) -> Tuple[str, str, str, int, float]:
    """
    Returns: (content, provider, model, total_tokens, cost_usd)
    """
    provider = provider or settings.default_llm_provider
    model = model or settings.default_model

    if provider == "anthropic":
        return await _call_anthropic(messages, system, model, max_tokens)
    elif provider == "openai":
        return await _call_openai(messages, system, model, max_tokens)
    elif provider == "openrouter":
        return await _call_openrouter(messages, system, model, max_tokens)
    else:
        raise ValueError(f"Unknown provider: {provider}")


async def _call_anthropic(messages, system, model, max_tokens):
    import anthropic
    api_key = settings.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    kwargs = dict(model=model, max_tokens=max_tokens, messages=messages)
    if system:
        kwargs["system"] = system

    response = await client.messages.create(**kwargs)
    content = response.content[0].text
    total_tokens = response.usage.input_tokens + response.usage.output_tokens
    cost = calculate_cost(model, response.usage.input_tokens, response.usage.output_tokens)
    return content, "anthropic", model, total_tokens, cost


async def _call_openai(messages, system, model, max_tokens):
    from openai import AsyncOpenAI
    api_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")

    client = AsyncOpenAI(api_key=api_key)
    all_messages = []
    if system:
        all_messages.append({"role": "system", "content": system})
    all_messages.extend(messages)

    response = await client.chat.completions.create(
        model=model, messages=all_messages, max_tokens=max_tokens
    )
    content = response.choices[0].message.content
    usage = response.usage
    total_tokens = usage.total_tokens
    cost = calculate_cost(model, usage.prompt_tokens, usage.completion_tokens)
    return content, "openai", model, total_tokens, cost


async def _call_openrouter(messages, system, model, max_tokens):
    from openai import AsyncOpenAI
    api_key = settings.openrouter_api_key or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set")

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        default_headers={"HTTP-Referer": "https://ai-sdr.app", "X-Title": "AI SDR Dashboard"},
    )
    all_messages = []
    if system:
        all_messages.append({"role": "system", "content": system})
    all_messages.extend(messages)

    response = await client.chat.completions.create(
        model=model, messages=all_messages, max_tokens=max_tokens
    )
    content = response.choices[0].message.content
    usage = response.usage
    total_tokens = usage.total_tokens
    cost = calculate_cost(model, usage.prompt_tokens, usage.completion_tokens)
    return content, "openrouter", model, total_tokens, cost
