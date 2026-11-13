# ADR-0002: The nav glyph comes from `settings.section.icon`, not from the shell's DOM

- **Status:** accepted
- **Date:** 2026-11-05
- **Supersedes:** the nav-icon paragraph of [ADR-0001](./0001-standalone-section-and-one-model-list.md)

## Context

ADR-0001 justified owning a standalone settings section partly because it kept
"the navigation label, the pen icon and the credential posture display under this
plugin's control". The label and the posture still are; the icon was never
really owned.

The settings shell renders one nav glyph per section id and falls back to a gear
for ids it does not know. To show its own mark, this plugin scanned
`document.querySelectorAll('button')`, matched a button whose `<span>` text
equalled the localized nav label, and replaced its `<svg>` with a freshly
built one — gated on `document.querySelector('[role="dialog"]')` and re-run from
a `MutationObserver` with a `requestAnimationFrame` throttle.

That worked, and it was fragile in four independent ways: the shell's DOM shape,
the localized label string, the dialog being open, and the observer's timing.

DSH 0.2.2 added `settings.section.icon`: a list-scoped, inline slot the shell
renders inside its own icon wrapper and addresses by the section id. The shell
passes `{ size, active }`, keeps its default glyph when no icon is registered
for that id, and restores the glyph when the contribution is disposed.

## Decision

Register the mark into `settings.section.icon` with `id: 'model-advanced'` —
the same id the section registers — and delete the DOM scan, the observer, and
the fake-DOM scaffolding that tested them.

## Consequences

- The mark is a plain component: an `<svg viewBox="0 0 24 24">` with one stroked
  path, `fill="none"`, `stroke="currentColor"`, sized from the `size` prop. It
  follows the shell's colour and geometry because the shell owns the wrapper.
- The label option is not registered: the shell never displays an icon's label,
  and the section already owns the accessible text.
- ADR-0001's "pen icon under this plugin's control" justification no longer
  holds. Its other reasons — a field set the official card does not render, the
  inherited-versus-explicit distinction, and the bilingual copy — are untouched,
  so the decision to keep a standalone section stands.
- A shell that predates the slot would render its own glyph and log no error,
  which is why `package.json` requires `>= 0.2.2-rc.2` — the release this plugin
  now targets exclusively, with no compatibility path for 0.2.1 or 0.2.2-rc.1.
