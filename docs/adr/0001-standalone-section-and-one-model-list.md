# ADR-0001: A standalone settings section, and one model list instead of one per namespace

- **Status:** accepted
- **Date:** 2026-10-17
- **Deciders:** plugin maintainer

## Context

DSH 0.2.1 publishes a `settings.models.provider-card` slot, and its own
`dsh-client-ui-settings-models` plugin fills it. That page has been through two
architecture reviews of this plugin, and both surfaced the same two questions.

**First: should this plugin contribute cards to the official Models page instead
of owning a section?** The official page derives its provider set from
`llm/listConfigurableProviders` and renders one card per route, using the
namespace's own schema for its fields. Folding into it would inherit its
navigation, its first-run dialog and its naming.

**Second: should the two model-list editors be one module?** At the time they
were `models/model-list.ts` (array-shaped, 230 lines) and
`models/official-models.ts` (337 lines), each with its own clone, remove and
add handlers and its own copy of a ten-line `setField`.

## Decision

**Keep the standalone section.** It is registered as `settings.section` with id
`model-advanced`, wrapped in `configForms.whileServed([...])` so a deployment
without either LLM adapter shows no trace of it.

**Unify the model lists behind per-namespace field adapters.** One
`ModelList` handles both storage shapes (`array` and `record`); the per-namespace
difference is a list of `ModelField` descriptors, not a second list module.

## Why the standalone section stays

- The section exists to expose **fields the official page does not render**. A
  card contributed to that page would have to fit its layout and its
  per-route chrome while showing a different field set.
- The official card derives its fields from the namespace schema. This page
  deliberately renders a *subset* with override checkboxes: the distinction
  between "inherited" and "explicitly set to the same value" is a first-class
  concept here, and it is what `buildProfileOps`/however `planSave` expresses.
  The official card has no such concept.
- Owning the section keeps the navigation label, the pen icon and the
  credential posture display under this plugin's control, which matters because
  the section is bilingual in a way the official page's copy is not.

## Why the model lists merged

- **The duplication was real and mechanical.** `setField` was byte-identical in
  two files (confirmed by hashing). The clone-with-unique-suffix loop was the
  same algorithm twice, plus a third, differently-implemented variant for the
  record shape. Removing one implementation means one place where an id
  collision is decided.
- **The difference is data, not structure.** The two lists disagreed about the
  key that carries modalities — `input` for a pi-ai route's own catalog,
  `inputModalities` for an official catalog entry — and about which per-model
  fields exist. Those are facts about the two namespaces, so they belong in two
  `ModelField[]` tables (`PI_AI_MODEL_FIELDS`, `OFFICIAL_MODEL_FIELDS`) behind one
  list shell.
- **The measured payoff was small, and that was known.** A shared module
  absorbs roughly 92 of the 700 lines the two files held (13%); the 331 lines of
  field rendering stay, because the field sets genuinely differ. The merge was
  taken for **locality** — one id-allocation rule, one clone handler, one
  remove handler — not for line count.

## Consequences

- The unified list takes `shape` and `fields` as required props. A new namespace
  adds a descriptor table, not a module.
- `models/model-form.ts` and `models/official-models.ts` are gone. Their field
  rendering lives in `models/model-fields.ts`.
- The record shape keeps insertion order by rebuilding the object around the
  copied entry, which matches what the array shape does with indexes.
- `input` and `inputModalities` remain two distinct keys. Unifying them would be
  a change to what the adapter stores, not to this page, and is out of scope
  here.
- Reopening the "contribute to the official page" question requires first
  showing that the official card can express inherited-versus-explicit fields.
  Without that, this decision stands.
