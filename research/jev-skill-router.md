# Can Jev route Review Skills for a PR?

Research for [#8](https://github.com/THeAkAy/github-action-ai-code-reviewer/issues/8), part of the v1 map ([#1](https://github.com/THeAkAy/github-action-ai-code-reviewer/issues/1)). Vocabulary follows `CONTEXT.md` (Review, Diff, Review Skill, Skill Router).

Sources checked on 2026-09-30 (Jev 1.13 was released 2026-09-15). Every claim below links to the page it came from. Independent sites (for example jev.pro) were used as leads only.

## Short answer

**Yes, with caveats.** Jev is built for exactly this kind of question: one state (the trimmed Diff) and many independent yes/no questions (one per Review Skill), answered in one call for about a tenth of a cent, in well under a second. It is reachable **through OpenRouter with the same OpenRouter key** v1 already uses. No TypeSafe account is needed.

What is **not** proven is quality on *code diffs*. TypeSafe's only published skill-selection result (16.8% to 7.3% wrong loads) is about picking at most one skill for a natural-language chat request, on synthetic data, with an older model version. Nothing primary measures Jev on PR diffs or on choosing several skills at once. v1 should use Jev, log every probability, and keep the extension-based fallback.

**`typesafe/jev-router` is the wrong model ID.** It is a chat-completions model router, not the decision API (see Access).

## Access

### `typesafe/jev-router` is a model router, not the decision API

- OpenRouter's model list describes it as: "Jev Router picks the best model and reasoning effort for each request, balancing quality, speed, and cost. It runs on Jev…" It is called through `POST /api/v1/chat/completions` with `messages`, and it returns a chat completion from whichever model it picked. Its pricing is `-1` (variable) and its tokenizer is `Router`. Sources: `curl -s https://openrouter.ai/api/v1/models | jq '.data[]|select(.id|test("jev"))'`, [OpenRouter Jev Router docs](https://openrouter.ai/docs/guides/routing/routers/jev-router), [model page](https://openrouter.ai/typesafe/jev-router).
- `https://openrouter.ai/api/v1/models/typesafe/jev-router/endpoints` returns `"endpoints": []`.
- Jev Router cannot answer our yes/no questions. It uses Jev internally to choose *which LLM* answers a chat prompt.

### The decision model on OpenRouter is `typesafe/jev-1.13`

- `typesafe/jev-1.13` and the alias `~typesafe/jev-latest` have modality `text->decisions`, a context of 32,000 tokens and a price of `0.000000042` per prompt token with free completion. **They are missing from the default `/api/v1/models` listing**, which is why the `test("jev")` query only finds the router. They appear with `?output_modalities=all`: `curl -s "https://openrouter.ai/api/v1/models?output_modalities=all" | jq '.data[]|select(.id|test("typesafe"))'`.
- Endpoint: `https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints` shows one provider, `TypeSafe | typesafe/jev-1.13-20260917`, with a context of 32,000 and 100% uptime over the last 5m, 30m and 1d when checked.
- OpenRouter's [Jev hub](https://openrouter.ai/docs/guides/community/jev) offers two surfaces with **the same OpenRouter API key**, billed to the same OpenRouter account:
  - **System One API**: `POST https://openrouter.ai/api/v1/systemone`, which uses TypeSafe's request and response shapes, for use with the TypeSafe SDK.
  - **Decisions API**: `POST https://openrouter.ai/api/alpha/decisions` (an **alpha** endpoint), for plain HTTP or OpenRouter's own SDKs.
- Hub FAQ: "Do I need a TypeSafe account or API key? No, an OpenRouter API key authenticates both the Decisions API and the TypeSafe SDK pointed at OpenRouter."
- Direct TypeSafe access (`https://api.typesafe.ai/v1/systemone` with `TYPESAFE_API_KEY` from console.typesafe.ai) also works ([API reference](https://docs.typesafe.ai/api), [Quick start](https://docs.typesafe.ai/introduction/quickstart)). v1 doesn't need it.
- An unauthenticated probe on 2026-09-30 confirmed that both routes exist. `POST https://openrouter.ai/api/v1/systemone` returned `401`. `POST https://api.typesafe.ai/v1/systemone` returned **`403`** with `authentication_error`, although the docs list `401` for a missing key.

### SDK: `@typesafe-ai/sdk`

- `npm view @typesafe-ai/sdk`: version `0.6.0` (published 2026-09-15; 0.5.7 was the first public release on 2026-09-11), MIT license, **no dependencies**, Node >= 20, and both ESM and CJS builds, so it works in a native JS Action. Repo: `github.com/typesafe-ai/typesafe-sdk-js`. [Changelog](https://docs.typesafe.ai/sdk/javascript/changelog): 0.6.0 has a breaking change to `Score.criteria`. The API is still moving, so pin the exact version.
- Pointing it at OpenRouter ([OpenRouter TypeSafe SDK guide](https://openrouter.ai/docs/guides/community/typesafe-sdk)): `new TypeSafeClient({ apiKey: OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api" })`. The SDK appends `/v1/systemone`. Bare IDs are mapped: `jev-1.13` becomes `typesafe/jev-1.13`, and `jev-latest` becomes `~typesafe/jev-latest`. OpenRouter adds `id`, `provider` and `usage.cost` to the response, and the SDK passes them through.
- **Don't call `client.models.list()` against OpenRouter.** It hits OpenRouter's `/api/v1/models`, whose response shape the SDK rejects (same guide).
- Defaults from the shipped type declarations (`dist/index.d.mts` in the 0.6.0 tarball): the model is `jev-latest` unless set, the timeout is **10 s per attempt** with no total budget, and there are **2 retries** on 408, 429 and 500–599 with backoff from 500 ms up to 5 s, honouring `Retry-After` for up to 60 s. Connection failures and timeouts are also retried. The SDK logs at `warn` level by default, and at `debug` it logs request bodies (the Diff).

### Version pinning

- The TypeSafe [Models page](https://docs.typesafe.ai/models) lists `jev-1.13.0` as the only current model. `jev-latest` and `jev-preview` both point to it. "An alias moves when a new release ships, so the answers behind it can change without a change on your side… If you have tuned confidence thresholds against a specific version, pin that version's ID."
- On OpenRouter the pinned ID is `typesafe/jev-1.13` (or bare `jev-1.13` through the SDK). The response `model` reports the dated build, for example `typesafe/jev-1.13-20260917`, so log it.
- **Pin `jev-1.13`.** Thresholds are tuned per version, and the Jaggedness page warns that answers shift between versions.

## Shape: many yes/no questions over one state

- Request: `{ model, state, questions }`. `state` is a string, a JSON object or an array. `questions` is a map from names you choose to typed questions. The question **key is not sent to the model** ([API reference](https://docs.typesafe.ai/api)).
- A **Noul** is a yes/no question with `instructions` and optional `criteria: { true, false }`. The answer is `{ type: "noul", noul: <P(yes) 0–1> }`, and it **carries no `confidence` value**. Only Choice and Score answers do ([Noul](https://docs.typesafe.ai/primitives/noul), [Confidence](https://docs.typesafe.ai/confidence), OpenAPI at `https://api.typesafe.ai/openapi.json`).
- "Every question in a request sees the same state, is evaluated independently… You can add or remove questions without changing the others' results" ([Primitives](https://docs.typesafe.ai/primitives)). "Questions are evaluated in parallel, so adding Nouls barely changes the response time" ([Noul](https://docs.typesafe.ai/primitives/noul), [Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out)).
- Batching does not change the answers. In the [Parallel questions cookbook](https://docs.typesafe.ai/cookbooks/parallel_questions), 13 questions in one call and 13 separate calls gave the same means. Two questions showed small run-to-run noise under both strategies, so answers are not always bit-for-bit repeatable.
- **Limits on question count:** no maximum number of questions per request is documented. A Choice allows up to 255 options and a Score up to 10 levels ([API reference](https://docs.typesafe.ai/api)). The real limit is the token budget (next section). For 10–30 Review Skills this is not a constraint.
- The multi-label pattern we need is documented on OpenRouter's [Classify and Tag Text at Scale with Jev](https://openrouter.ai/docs/cookbook/evaluate-and-optimize/jev-classification): one Noul per tag, "judged independently of the others", with "a threshold per tag from a small human-labeled sample".

### Turning a probability into yes or no

- A Noul threshold lives in your code. "Use 0.5 when yes and no are equally easy to act on. Raise it when acting on a false yes is expensive… Lower it when missing a true yes is expensive" ([Noul](https://docs.typesafe.ai/primitives/noul)).
- For the Skill Router, a missed skill costs Review quality, while a wrongly loaded skill only costs some prompt tokens. That points to a **low threshold**. TypeSafe's own skill cookbook drops candidates whose "does this skill fit" Noul is below **0.30** ([Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion)).
- Don't reuse a threshold across question types or versions. "Don't carry a threshold tuned on a Noul over to a Choice." `P(yes)` and `1 − P(not yes)` can disagree: 0.72 and 0.47 summed to 1.19 in one example ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)). Ask each skill's question one way, positively.

## Input limits and trimming

| | Via OpenRouter (v1 path) | Direct TypeSafe |
| - | - | - |
| Context | **32,000 tokens for `state` plus all questions** ([OpenRouter Jev hub](https://openrouter.ai/docs/guides/community/jev), endpoints API) | 64k per request, and 32k for `state` plus the longest question ([Models](https://docs.typesafe.ai/models)) |
| Input | Text only (string, JSON object or array) | Same |
| Too large | `413 Payload Too Large` ([Decisions API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request)) | `422` validation |

- Jev's tokenizer is not public (the OpenRouter tokenizer field is `Other`). Budget with a conservative characters-per-token estimate and keep headroom.
- A full Diff often won't fit. v1 already allows up to 100K tokens for a Review ([#4](https://github.com/THeAkAy/github-action-ai-code-reviewer/issues/4)).
- **Trimming also improves accuracy, not only fit.** "Accuracy falls as the state grows with content unrelated to the decision… retrieve and filter in code first, and send only the fields the question needs." "Jev suffers from context rot" ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)).
- Suggested state (structured object, per [State](https://docs.typesafe.ai/concepts/state)):
  - `pr`: title (and the first part of the description, capped).
  - `files`: for each file, `path`, `status` (added/modified/removed/renamed), `additions` and `deletions`. **Always include all of these.**
  - `hunks`: for each file, the `@@` hunk headers plus changed lines. Add them in order until a state budget of **about 20k tokens** is reached. Drop changed lines from the largest files first, keeping every file's path and hunk headers.
  - Questions: one per Review Skill, about 100 tokens each (instructions plus the skill's description as `criteria.true`). 30 skills come to about 3k tokens, which leaves headroom under 32k.
- Jev reads English best, and it reads high-level languages better than low-level encodings ([Models: Language support](https://docs.typesafe.ai/models), jaggedness §2). C# diffs with English identifiers suit it. Nothing primary measures it on code.

## Cost, latency, rate limits

| | Figure | Source |
| - | - | - |
| Price | $0.042 per million **input** tokens. Output is free. | [Models](https://docs.typesafe.ai/models); OpenRouter `pricing.prompt = 0.000000042`, `completion = 0` |
| Cost per routing call | about 23k input tokens ≈ **$0.001**. The exact amount is in `usage.cost` on OpenRouter. | Arithmetic from the price above |
| Latency | 0.27 s for a 53,777-character article with 13 questions (jev-1.12). 0.09–0.31 s per call in the skill cookbook, with 182-option Choice plus Nouls | [Parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions), [Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion) |
| Rate limits (direct) | 100K tokens/s and 40 requests/s, "adjusting dynamically… can change without notice" | [Models](https://docs.typesafe.ai/models) |
| Rate limits (OpenRouter) | Paid models: no fixed per-key rate. 429 comes from DDoS protection or the upstream provider. 402 comes from credit limits, including a transient **in-flight spending budget** (`limit_source: openrouter_in_flight_budget`, sent with `Retry-After`). | [OpenRouter limits](https://openrouter.ai/docs/api_reference/limits) |
| Uptime | api.typesafe.ai: **99.828%** over 90 days. Short incidents on Sep 20, 22, 23, 24 and 27 (2–18 minutes each) | [status.typesafe.ai](https://status.typesafe.ai), checked 2026-09-30 |

One Review makes one routing call, so cost and rate limits are negligible next to the roughly $0.04 Review ([#2](https://github.com/THeAkAy/github-action-ai-code-reviewer/issues/2)).

## Evidence of quality on skill selection

The primary source for "16.8% to 7.3%" is TypeSafe's cookbook [Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion).

- **Task:** pick **at most one** skill for a chat request, out of the 182 skills in the Nous Research Hermes agent roster.
- **Method:** two TypeSafe calls per request.
  1. A Choice over all 182 skills, using each one's 60-character index description, to rank them. Three "does this need a skill at all" Nouls are averaged and gated at 0.30.
  2. A Choice over the top 3, now with each skill's full description plus the first 700 characters of its instructions, plus one "does this skill fit" Noul per candidate. The candidates are dropped if the best Noul is below 0.30.
  The winner is added to the agent's system prompt as a hint, and the agent's first skill load is scored.
- **Data:** 488 single-turn requests. 315 are covered by exactly one skill (171 distinct skills) and 173 by none. The covered requests were **written by an LLM from each skill's own file**, and the cookbook itself says they are "easier than the ones users send". The model was `jev-1.12`, and the agent under test was a small commercial chat model, rendered 2026-07-31.
- **Result:** wrong loads went from 16.8% to 7.3%, and needless loads from 9.8% to 4.0%. The floor with the answer handed to the agent is 2.5% and 1.2%. The suggestion fixed 37 covered requests and broke 7.
- **How far this carries to us:** it shows Jev's probabilities over skill descriptions are useful. It does **not** cover diffs, choosing several skills at once (we want every skill that applies, not at most one), or Jev 1.13. Our library of 10–30 skills is small enough to ask one Noul per skill directly, with no ranking step, which is the documented tagging pattern above.

## Known weak spots that matter here

From [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13):

1. **Literal reading.** Review Skill descriptions must state the exact condition, for example "the diff adds or changes an EF Core LINQ query or `DbContext` usage" rather than "EF Core stuff".
2. **Indirection.** "Is this a public API change?" needs knowledge the Diff may not show, such as whether a type is public elsewhere. Expect weaker answers on skills like that.
3. **Large irrelevant state** hurts accuracy, hence the trimming.
4. **Adversarial content.** The Diff is untrusted text, and injected instructions "can move the answer". The worst case here is loading the wrong skills, which is low stakes.
5. **Generation.** Jev gives no explanations, so log the probabilities to debug routing.

## Errors the fallback must catch

Rule from [#3](https://github.com/THeAkAy/github-action-ai-code-reviewer/issues/3): Jev never blocks a Review. On any failure, load every Review Skill whose declared file types match the PR.

| Status / error | Where it comes from | SDK class | Treatment |
| - | - | - | - |
| missing key | SDK constructor | `TypeSafeError` | fallback (log "Jev not configured") |
| 400 bad request | OpenRouter | `BadRequestError` | fallback, log body |
| 401 / 403 | OpenRouter 401, TypeSafe direct returns 403 for a missing key | `AuthenticationError`, `PermissionDeniedError` | fallback, warn loudly |
| 402 | OpenRouter: out of credit, per-key limit, or in-flight budget | `APIError` (status 402) | fallback. **If it is not the in-flight budget, the main Review call will also fail.** Report it, don't hide it. |
| 404 | model ID retired or renamed | `NotFoundError` | fallback, warn (pinned version gone) |
| 413 | state too large | `APIError` (status 413) | fallback (trimming bug) |
| 422 | validation (direct TypeSafe) | `UnprocessableEntityError` | fallback |
| 429 | rate limit | `RateLimitError` | SDK retries, then fallback |
| 500 / 502 / 503 / 524 / 529 | server, provider, edge timeout, overloaded | `InternalServerError` | SDK retries, then fallback |
| network / timeout | DNS, TLS, 10 s per attempt | `APIConnectionError`, `APITimeoutError` | SDK retries, then fallback |
| malformed 200 | an answer missing for a skill key, or `noul` outside 0–1 | none (validate in code) | fallback for the whole call |

Sources: [Decisions API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request) (400, 401, 402, 403, 404, 413, 429, 500, 502, 503, 524, 529), [TypeSafe API errors](https://docs.typesafe.ai/api#errors) (401, 422, 429, 529), and the SDK error classes in `@typesafe-ai/sdk@0.6.0`.

Simplest rule in code: catch `TypeSafeError` (the base of every SDK error) plus response validation. Cap the wait at `timeout: 10_000` and `retry: { maxRetries: 1 }` so an outage adds at most about 20 s.

## Recommendation for v1

1. **Endpoint and SDK:** `@typesafe-ai/sdk` pinned to the exact `0.6.0`, with `baseURL: "https://openrouter.ai/api"`, calling `POST /api/v1/systemone`. Prefer this over the alpha `/api/alpha/decisions` endpoint.
2. **Key:** reuse the **OpenRouter API key** the Action already takes. There is no separate `TYPESAFE_API_KEY` input, and Jev is billed to the same $50 credit. Optional later: a `jev-enabled` input to turn routing off.
3. **Model:** pinned `jev-1.13`, never `jev-latest`, because thresholds are tuned per version. Log the `model` returned.
4. **Request:** one call per Review. `state` is the trimmed Diff object above. `questions` has one Noul per Review Skill, keyed by the skill's ID. Its `instructions` read "Does this pull request's diff involve <skill concern>?" and `criteria.true` is the skill's description (the skill format ticket can add an optional `criteria.false` / "not when" field).
5. **Threshold:** load a skill when `noul >= 0.30`. Make that the default, overridable per skill in the skill file. Log every skill's probability in the Action summary, so the owner can tune the threshold from real PRs using the labeled-sample method in the OpenRouter tagging cookbook.
6. **Trimming:** always send the file list with status and +/- counts plus the hunk headers. Fill changed lines up to about 20k state tokens, dropping the largest files' bodies first. Send no full file contents.
7. **Failure:** any error goes to the extension fallback (table above), with timeout 10 s and 1 retry.

## What would make Jev the wrong choice

- **It misses skills on real PRs.** If, over the owner's first 20–30 PRs, the logged probabilities show Jev regularly under-scoring skills the owner judges relevant, while extension matching would have loaded them, then Jev is adding cost and complexity for no gain. Switch to extension matching, or to asking the reviewing LLM itself.
- **Skills that need indirection dominate.** If most Review Skills are about facts the Diff doesn't show (API visibility, call sites elsewhere), Jev's literal, single-hop reading is a poor fit.
- **The library outgrows the 32k budget.** At hundreds of skills, the question text alone crowds out the Diff. That needs the cookbook's two-step rank-then-check shape, which is more than v1 wants.
- **Data policy.** Sending repository code to a second processor (TypeSafe, routed through OpenRouter) may be unacceptable for some private repos. Zero data retention is enterprise-only ([Legal](https://docs.typesafe.ai/legal)).
- **Instability.** This is a two-week-old service with dynamic rate limits, an alpha sibling endpoint and a 0.x SDK. If the fallback fires on a meaningful share of runs, the router isn't earning its place.
