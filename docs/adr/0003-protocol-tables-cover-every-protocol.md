# ADR-0003: Every protocol pi-ai serves is a first-class route protocol

- **Status:** accepted
- **Date:** 2026-11-13

## Context

The page offered three wire protocols — `openai-completions`,
`openai-responses`, and `anthropic-messages` — and derived the choice list
twice: a compiled `PROTOCOLS` constant used before the first describe answer
lands, and `unionValues(schema, …)` reading the adapter's own schema union at
runtime. Both were right until DSH 0.2.2-rc.2, which added
`google-generative-ai` to the adapter's `PROTOCOLS` table.

An upgrade that adds a protocol fails quietly here in the worst way: the
runtime list picks it up (the schema answer is authoritative), so the select
offers it, but every table the page owns still assumes the old three. A Gemini
route would have received the OpenAI Completions compat switches, whose write
the adapter silently skips at route level and refuses at model level, and the
reasoning picker would have offered `off`, `xhigh` and `max`, which pi-ai's
Gemini implementation throws on when it resolves them.

## Decision

Treat protocol membership as data with three consequences, all declared in one
place each:

1. `PROTOCOLS` is the page's list, in the adapter's own order, and a drift gate
   compares it against the runtime table read out of `lib/index.js` — not
   against a declaration file, which only says `readonly string[]`.
2. `COMPAT_PROTOCOL_FIELDS` names every protocol explicitly, including the ones
   whose set is empty. An absent key falls back to the default set, so Gemini's
   "no compat at all" has to be written down to be true. A second gate compares
   each protocol's page list against that protocol's own gate in the adapter.
3. Gemini's reasoning vocabulary is a protocol fact, not a UI preference:
   `GEMINI_REASONING_LEVELS` narrows the level picker, seeds a new effort map,
   and the validator refuses a level or wire value outside it. The route-level
   `reasoning` select is left alone: it feeds the same clamping pi-ai applies.

## Consequences

- The protocol select, the compat card, the effort card and the validator now
  all read one table each, so the next protocol is additive in one place.
- Gemini routes show no compatibility card at all. That is correct rather than
  unfinished: `Model<'google-generative-ai'>['compat']` is `never` upstream.
- A Gemini route's endpoint placeholder is its own (`…/v1beta`), because that
  base URL carries the API version and the OpenAI-compatible example does not.
- The page still cannot require an API key on a Gemini route. Whether one is
  configured is a credential-store fact and whether one is *needed* is a
  profile fact — the route may inherit `apiKeyEnv` from the composition base —
  so the requirement stays where pi-ai enforces it, at request time, and the
  page shows the credential posture it always showed.
