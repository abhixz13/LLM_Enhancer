---
name: scope-intake
description: Use at the start of every bug bounty/pentest engagement, before any testing. Turns the program page + rules into an exhaustive, faithful rules.yaml. Covers extraction of scope, exclusions, allowed tools, volume caps and stop-conditions.
---

# scope-intake — analyze a program → rules.yaml

Mandatory entry point. No test starts before `rules.yaml` exists.

## Extraction checklist

1. **In-scope assets** — domains, wildcards, mobile apps (Android package, iOS app id), APIs.
2. **Exclusions** — frozen/excluded assets + **dates** ; program-wide forbidden classes (e.g. CSRF).
3. **Allowed tools** — review the ENTIRE `TOOLS_CATALOG.md`, tool by tool. The only question
   per tool: *does the program allow it?* Allow everything that is permitted (even if barely useful),
   forbid only what the program forbids (banned aggressive classes, volume too high,
   scanner/enumeration forbidden). No usefulness filter. `allowed` exhaustive. Doubt
   about authorization → exclude.
4. **Volume caps** — "single-digit per test", rate-limit, no aggressive enumeration.
5. **Signal Requirement** — if present: quality > quantity, an invalid/duplicate hurts.
6. **Novelty** — known patched reports → new variant mandatory (otherwise duplicate = $0).
7. **Stop-conditions** — real third-party data, internal resource, out-of-scope host → STOP + report.
8. **Test accounts** — convention (e.g. `<username>+x@<your-test-domain>`), number required per
   class (IDOR = 2, family-pairing = 3…).
9. **Special rules** — e.g. a mandated out-of-band callback service, body signatures that invalidate a proxy.

## Output
A `rules.yaml` conforming to `rules/SCHEMA.md`, **generated per engagement** from the real scope and
kept local (gitignored) — the repo never ships a filled-in `rules.yaml` for a real target.

## Golden rule
In case of ambiguity, decide **restrictive** and document it. `rules.yaml` is the engine's only
guardrail: better a scope too tight than an out-of-scope test.
