# Research: Which OpenRouter free model should v1 use?

Ticket: #2 (part of map #1). Researched 2026-09-30 against OpenRouter's live API, OpenRouter's docs and the vendors' own model cards. The free lineup changes often (models are added and removed every few weeks), so re-run the commands in [How to re-check](#how-to-re-check) before relying on anything here.

No live calls were made: there was no OpenRouter API key available. Structured output support comes from what OpenRouter publishes about each endpoint, not from a test.

## Recommendation

**Default: `qwen/qwen3.8-27b:free`**, using `response_format: { type: "json_schema", strict: true }` and `provider.require_parameters: true`.

**Fallbacks, in order**, sent as OpenRouter's `models` array so OpenRouter fails over by itself:

1. `dots-studio/dots-3-note-preview:free`
2. `nvidia/nemotron-3-super-120b-a12b:free` (only if the owner accepts that NVIDIA's free endpoint trains on prompts, see [Data policy](#data-policy))

Why Qwen3.8 27B:

- **Best published agentic-coding scores among the free models that return schema-checked JSON natively.** SWE-bench Pro 61.7, Terminal-Bench 2.1 73.0, LiveCodeBench v6 90.3, IFBench 79.5 ([model card](https://huggingface.co/Qwen/Qwen3.8-27B)). Dots3-Note Preview is level on paper (SWE-bench Pro 61), and Nemotron 3 Super is clearly behind.
- **Native structured output.** Its only free endpoint lists `structured_outputs`, so the response can be tied to a JSON schema with file, line and body per Review Comment.
- **The best data policy of any free candidate.** The free endpoint (ModelRun) is marked as no training and no prompt retention.
- **It is not a preview or stealth model.** It is an open-weight release from a major vendor, and the same model is served by more than a dozen paid providers on OpenRouter. If the free endpoint goes away, switching to the paid `qwen/qwen3.8-27b` ($0.42 / $3.00 per million tokens in/out) is a one-word config change with the same behaviour.

Why these fallbacks: every model in the `models` array receives the same request body. If the default uses a JSON schema, the fallbacks must support it too, or the fallback fails as well. Only three free text models list `structured_outputs`, apart from a 2.6B model that its vendor says is not meant for coding. Those three are the default and the two fallbacks.

If the owner does not want NVIDIA training on the code, the fallback list is just Dots3-Note Preview. For a second fallback with no training, the only option is a model that uses a **forced tool call** instead of a schema, and that needs a separate request shape (see [If a forced tool call is used](#if-a-forced-tool-call-is-used)).

## Candidates

Filter used: `pricing.prompt == "0"` and `pricing.completion == "0"` on `GET https://openrouter.ai/api/v1/models`. That query returned 20 entries. Excluded:

- `openrouter/free`, the random free router.
- `google/lyria-3-pro-preview` and `google/lyria-3-clip-preview`: music generation, not text review, and not actually free (priced per song or clip).
- `stealth/space-bunny-alpha`: an anonymous stealth model with no `:free` suffix. Stealth models are withdrawn when the vendor launches.
- `nvidia/nemotron-3.5-content-safety:free`: a moderation model.
- `inclusionai/ling-3.0-flash-sante:free`: a health and medicine model.
- `liquid/lfm-2.5-2.6b:free`: 2.6B parameters, and the vendor "advises against using it for agentic coding".
- Smaller siblings where a larger free sibling exists: `poolside/laguna-xs-2.1:free`, `thinkingmachines/inkling-small:free`, `google/gemma-4-26b-a4b-it:free`, `nvidia/nemotron-3.5-lightning:free` (the last also had endpoint `status: -2`, i.e. degraded, when checked), and `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`.

## Comparison

JSON = how the free endpoint can return structured JSON, from the endpoint's `supported_parameters`. "schema" means `structured_outputs` (a JSON schema via `response_format`). "tools" means only a forced tool call is available.

| Model (`:free`) | Params (active) | Context / max output | JSON | Free provider | Trains on prompts / retains | Stability | Best coding evidence (vendor-reported) |
|---|---|---|---|---|---|---|---|
| **qwen/qwen3.8-27b** | 27B dense | 262K / 236K | schema | ModelRun (fp4) | no / no | GA, many paid hosts | SWE-bench Pro 61.7, T-Bench 2.1 73.0, LCB v6 90.3 |
| dots-studio/dots-3-note-preview | 280B (16B) | 512K / 461K | schema + `response_format` | AtlasCloud (fp8) | no / yes | **Preview**, no paid variant on OpenRouter | SWE-bench Verified 78.4, Pro 61, T-Bench 2.1 75.1 |
| nvidia/nemotron-3-super-120b-a12b | 120B (12B) | 262K / 236K | schema + `response_format` | Nvidia | **yes** / yes | GA, paid hosts exist | SWE-bench Verified 60.5 (OpenHands), Multilingual 45.8 |
| poolside/laguna-s-2.1 | 118B (8B) | 262K / 33K | tools | Poolside (fp4) | **yes** / yes | GA, paid variant | SWE-bench Multilingual 78.5, Pro 59.4, T-Bench 2.1 70.2 |
| thinkingmachines/inkling | 975B (41B) | 1M / 262K | tools | Thinking Machines | **yes** / yes | "free research API tier" | SWE-bench Verified 77.6, Pro 54.3 |
| nvidia/nemotron-3-ultra-550b-a55b | 550B (55B) | 1M / 66K | tools | Nvidia | **yes** / yes | GA, paid hosts exist | SWE-bench Verified 70.7, Multilingual 67.7 |
| cohere/north-mini-code | 30B (3B) | 256K / 64K | tools | Cohere | no / yes (30 days) | GA | SWE-bench Verified 61.0 (mini-SWE-agent, pass@1) |
| google/gemma-4-31b-it | 31B dense | 262K / 33K | `response_format` only (no `structured_outputs`) | Google AI Studio | no / yes (55 days) | GA, many paid hosts | LiveCodeBench v6 80.0 (no SWE-bench reported) |

Sources for this table:

- Context, max output, JSON support, provider and quantization come from `GET https://openrouter.ai/api/v1/models` and `GET https://openrouter.ai/api/v1/models/<id>/endpoints`, fetched 2026-09-30.
- Data policy comes from the endpoint `data_policy` object embedded in each model's providers page, e.g. `https://openrouter.ai/qwen/qwen3.8-27b:free/providers`. OpenRouter says this is "not a definitive source of third party data policies, but represents our best knowledge" ([Provider Routing](https://openrouter.ai/docs/guides/routing/provider-selection)).
- Benchmarks come from the model cards:
  - [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B)
  - [dots3-note preview](https://huggingface.co/dots-studio/dots3-note-prev)
  - [Nemotron 3 Super BF16](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16)
  - [Laguna S 2.1](https://huggingface.co/poolside/Laguna-S-2.1)
  - [Inkling](https://huggingface.co/thinkingmachines/Inkling)
  - [Nemotron 3 Ultra](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16)
  - [Gemma 4 31B](https://huggingface.co/google/gemma-4-31B-it)
  - North Mini Code's [announcement post](https://huggingface.co/blog/CohereLabs/introducing-north-mini-code)

## Code review quality and C#

- **There is no published C# benchmark for any of these models.** The C# software-engineering benchmark, [SWE-Sharp-Bench](https://arxiv.org/html/2511.02352v3), evaluated only closed models from two vendors, none of them free on OpenRouter. Its best result was 47.3% (OpenHands + GPT-5). It found C# tasks resolved far less often than Python ones: about 40% against about 70% on SWE-bench Verified.
- **SWE-bench Multilingual does not include C#.** It covers "C, C++, Go, Java, JavaScript, TypeScript, PHP, Ruby and Rust" ([swebench.com](https://www.swebench.com/multilingual.html)). So Multilingual scores say something about non-Python code, but nothing about C# directly.
- **There is no public code-review benchmark in any of these cards.** The closest proxies are SWE-bench Verified and Pro (understanding a real repository and a change to it) and IFBench (following a rubric and a format). Treat the scores as a rough ranking only:
  - every number is **self-reported** by the vendor;
  - the agent harnesses differ (OpenHands, SWE-agent, each vendor's own);
  - the Dots numbers are for a preview, and the full technical report is "coming soon".
- **The evidence is thin, so the owner's hand-judged trial is the real deciding test.** The map already says the owner judges quality by hand. A short bake-off before v1 settles would decide more than these benchmarks do: the same three or four real C# PRs through the default and each fallback.

## Structured output

- **How to ask for it.** Send `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`.
  - With `provider.require_parameters: true`, OpenRouter only routes to endpoints that support every parameter in the request. Without it, the request can land on an endpoint that ignores the schema ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).
  - A model that does not support structured outputs makes the request "fail with an error indicating lack of support".
- **Strict mode is not a guarantee.** "Enforcement varies by provider: some guarantee schema-conforming output, while others translate your schema into their own structured-output format or treat it as a strong hint, so exact compliance is not guaranteed on every endpoint." The Action should therefore still validate the response (e.g. with Zod) and treat a failure like any other model error.
- **Response Healing.** The `response-healing` plugin (`plugins: [{ id: "response-healing" }]`) repairs malformed JSON: markdown fences, trailing commas, unquoted keys. It only works on non-streaming requests with `response_format` `json_schema` or `json_object`. It cannot fix output that was cut off by `max_tokens` ([Response Healing](https://openrouter.ai/docs/guides/features/plugins/response-healing)). It is cheap insurance for the free models.
- **Endpoint support, as listed on 2026-09-30:**
  - Qwen3.8 27B lists `structured_outputs` but not `response_format`.
  - Dots3-Note and Nemotron 3 Super list both.
  - Everything else among the candidates lists `tools` only. Gemma 4 lists `response_format` without `structured_outputs`, which suggests JSON mode without schema enforcement.
- **Line mapping is not solved by the model.** A valid schema guarantees a `path` and a `line` field, not that the line is inside the Diff. Checking each Review Comment against the Diff hunks stays the Action's job. That belongs to the "Mapping model output to lines" ticket.

### If a forced tool call is used

Poolside, Inkling, Nemotron 3 Ultra and North Mini Code only offer `tools`. The Review would then be one function (e.g. `submit_review`) whose parameters are the same JSON schema, with `tool_choice: { type: "function", function: { name: "submit_review" } }`. The answer is read from `tool_calls[0].function.arguments`.

That is a different request and response shape from `response_format`, so a model of this kind cannot share a `models` fallback array with the schema models. That is why none of them is in the recommended list, even though Laguna S 2.1's numbers are good.

## Context window: does a typical Review fit?

Estimates, not measurements:

- A C# PR with about 300 changed lines is roughly **6K tokens** of unified Diff.
- The Review Rubric, the C# Language Profile and the schema add about **3K**.
- Diff only comes to about **9K** input tokens. Adding 8 full changed files of about 300 lines each comes to about **39K**.
- Output, including reasoning, is about **4–5K**.

**Every candidate fits with a large margin.** The smallest context is 256K, so even the "with full files" case uses under 16% of it. The smallest max output is 32K (Laguna, Gemma), which is still well above the expected output.

Big Diffs only become a context problem well above 200K tokens, around 10,000 changed lines. At that size the free-tier time and quality limits matter more than the window.

Two practical cautions:

- **Reasoning tokens count against output.** Qwen3.8's thinking mode is on by default, and the card recommends "sufficient output length". Set `max_tokens` generously (e.g. 16K–32K) or lower `reasoning` effort, so the JSON is not truncated mid-object. Truncated JSON cannot be healed.
- **The free Qwen endpoint is fp4-quantized** (ModelRun), and the Dots one is fp8. The vendor benchmarks were run on full-precision weights, so the free endpoint may score a little lower than the card says.

## Free-tier limits

From [Limits](https://openrouter.ai/docs/api/reference/limits):

- `:free` models allow **20 requests per minute**.
- They allow **50 requests per day** with less than 10 credits purchased, and **1,000 requests per day** once at least 10 credits have been purchased (all-time, whatever the current balance).
- Going over returns **HTTP 429**. Upstream providers may apply their own per-model limits as well.

What this means for v1:

- **One Review is one request**, plus at most one retry and one attempt per fallback.
- The Action only runs when a PR opens or a label is added, so even 50 a day is well beyond what one owner's repos will use. 20 a minute is irrelevant unless Big Diffs are later split into many chunk requests; 20 chunks would hit the per-minute limit.
- **Buying $10 of credits once** lifts the daily cap to 1,000. It also means a switch to the paid Qwen variant (about $0.03 per Review with full files at the estimates above) needs no further setup.
- The docs do not say whether failed requests or fallback attempts count against the daily cap. Assume they do.

## Data policy

Per-endpoint `data_policy` on OpenRouter (2026-09-30):

| Free endpoint | Trains on prompts | Retains prompts | Notes |
|---|---|---|---|
| Qwen3.8 27B (ModelRun) | no | no | [Modular privacy policy](https://www.modular.com/legal/privacy) |
| Dots3-Note Preview (AtlasCloud) | no | yes (no period stated) | [AtlasCloud privacy](https://www.atlascloud.ai/privacy) |
| Nemotron 3 Super / Ultra (Nvidia) | **yes** | yes | `requiresUserIDs: true`; [NVIDIA API Trial Terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf) |
| Laguna S 2.1 (Poolside) | **yes** | yes | the paid Poolside endpoint does not train (90-day retention) |
| Inkling (Thinking Machines) | **yes** | yes | "free research API tier" terms |
| North Mini Code (Cohere) | no | yes, 30 days | |
| Gemma 4 31B (Google AI Studio) | no | yes, 55 days | |

How this is enforced:

- OpenRouter has an account privacy setting for whether to route to providers that may train, with **separate settings for paid and free models** ([Provider Logging](https://openrouter.ai/docs/guides/privacy/provider-logging)).
- A single request can also pass `provider.data_collection: "deny"` ("use only providers which do not collect user data"). Setting that would rule out Dots (retains) and Nvidia (trains), leaving only Qwen.
- A Review sends the PR's code to the provider. For private repos, the owner should decide between two options:
  - allow training on free endpoints, which keeps the Nemotron fallback;
  - keep the fallback list to Qwen and Dots only.

## Stability and what to do when a model disappears

- OpenRouter's `expiration_date` was `null` for every free model on 2026-09-30, so there is no advance warning in the API. Free variants "may have different rate limits or availability compared to paid versions" ([Free Variant](https://openrouter.ai/docs/guides/routing/model-variants/free)).
- Risk ranking:
  1. Stealth models are the most likely to vanish.
  2. Previews are next. Dots3-Note Preview has no paid variant to fall back to.
  3. GA open-weight models with many paid hosts are the least likely: Qwen, Nemotron, Gemma.
- Over the last 30 minutes of the check, uptime was Qwen 96.7%, Dots 99.9% and Nemotron 3 Super 99.2%.

What the Action should do (to feed into the "Action configuration" ticket):

1. **Make the model list an input, not a constant.** For example, a `model` input with the default above, and an optional `fallback-models` input with the list above. Send them as OpenRouter's `models` array. "By default, any error can trigger the use of a fallback model", including rate-limiting, downtime and context-length errors. The response's `model` field says which one answered; log it and print it in the summary ([Model Fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)).
2. **Keep every fallback compatible with the request.** Every model in the list must support `structured_outputs` while the request uses `response_format`. Keep `require_parameters: true`.
3. **When every model fails, fail loudly and never silently.** A removed model returns **404 `not_found`**, "The requested resource (model, file, etc.) does not exist" ([Errors](https://openrouter.ai/docs/api_reference/errors-and-debugging)).
   - On a 404, fail the job with a message that names the model ID and points to `https://openrouter.ai/models?q=free` and this file. Do not post an empty review.
   - On 429 or 5xx after the fallbacks are used up, fail the job and say the model was rate-limited or unavailable. The owner can re-trigger with the label.
4. **Do not auto-pick a replacement.** Choosing whatever free model is available (which is what `openrouter/free` does) would make review quality vary without the owner knowing. That goes against "the owner judges quality by hand".

## What would change the recommendation

- **The owner's bake-off on real C# PRs.** If Dots3-Note or Nemotron clearly reviews C# better, swap the order. Nothing published measures C# review quality, so this outranks every benchmark above.
- **Qwen3.8's free endpoint leaves, or its schema support breaks.** Promote Dots3-Note. Alternatively, move to the paid `qwen/qwen3.8-27b` and keep the same model.
- **Dots3-Note goes GA.** A final release with a technical report and SWE-bench scores clearly above Qwen's would make it the default.
- **The owner rules out training on free endpoints.** Drop Nemotron 3 Super from the fallbacks.
- **A new free model lists `structured_outputs`** with better published SWE-bench Pro or Multilingual scores and a no-training policy. Re-run this comparison.
- **The owner accepts a forced tool call instead of a schema.** Laguna S 2.1 (SWE-bench Multilingual 78.5) becomes a candidate, but its free endpoint trains on prompts.
- **Paid models become acceptable.** The provider choice already allows it; the model input just changes.

## How to re-check

```sh
# Free text models and their JSON support
curl -s https://openrouter.ai/api/v1/models | jq '.data[]
  | select(.pricing.prompt=="0" and .pricing.completion=="0")
  | {id, context_length, max_out: .top_provider.max_completion_tokens,
     json: [.supported_parameters[] | select(.=="structured_outputs" or .=="response_format" or .=="tools")]}'

# Providers, quantization and uptime for one model
curl -s https://openrouter.ai/api/v1/models/qwen/qwen3.8-27b:free/endpoints | jq '.data.endpoints[]
  | {provider_name, quantization, status, uptime_last_30m, supported_parameters}'
```

The data policy per endpoint is shown on each model's page on openrouter.ai, under Providers.
