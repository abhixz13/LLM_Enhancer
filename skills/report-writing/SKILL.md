---
name: report-writing
description: Use to turn a verified finding into a high-quality bug bounty report (H1/Bugcrowd). Covers the summary/repro/PoC/impact/root-cause/fix structure, framing of the vuln class, and admissibility discipline (Signal).
---

# report-writing — high-quality report

An admissible, well-rated report (Signal) follows a strict structure and proves real impact.

## Structure
1. **Summary** — one sentence: which vuln, which asset, which impact.
2. **Steps to reproduce** — numbered, reproducible by triage without guessing.
3. **PoC** — minimal, clean. Naming: H1 handle in the filename + comment (per
   `rules.yaml.reporting`). Provide the test IP/domain.
4. **Impact** — concrete, aligned with the program's severity table.
5. **Root cause** — why it is vulnerable (not just "it works").
6. **Fix** — proposed remediation.

## Framing
- Frame the vuln within a **class accepted** by the program (e.g. broken-access-control), never
  in an excluded class (e.g. CSRF).
- If `novelty_required`: show how it is a **new variant** vs the known patched
  reports (otherwise duplicate = $0).

## Discipline (Signal)
- 1 vuln per report, unless chaining is necessary for the impact. Same root cause → 1 bounty.
- Quality > quantity: an invalid/duplicate report lowers Signal and can block future
  submissions. Only submit what is proven, with real effect demonstrated.

## Report even with zero findings

A report is **ALWAYS produced at the end of a campaign**, even when nothing is confirmed. A
zero-finding run is not a non-event — it is a documented result the operator needs. Never end on a
bare "nothing found".

The zero-finding report is **internal** (it is not submitted to the program — there is nothing
admissible to submit) and must cover:

1. **What was run** — the tools actually executed and the **coverage**: which hosts, subdomains,
   endpoints, parameters, and auth surfaces were reached; which were in scope but not reached, and
   why (blocked tool, rate limit, out-of-scope, no credentials).
2. **What was tried and why it was negative/ambiguous** — per lead/vuln class: the angle tested,
   the retries attempted (including the think-differently variants), and the concrete reason it did
   not confirm — clean negative vs ambiguous signal that could not be closed.
3. **Manual next steps the engine cannot do itself** — the work that requires a live human (with
   Claude assisting) rather than the autonomous pipeline. For example:
   - **authenticated 2-account BOLA/IDOR closing** — provisioning two real self-owned accounts,
     capturing each session, and confirming cross-account impact live;
   - flows needing signed mobile clients / Frida re-signing, MFA, payment, or hardware;
   - business-logic chains needing human judgment across multi-step flows;
   - anything gated by credentials, OOB callbacks, or manual verification.

This section makes the negative result **actionable**: the operator knows exactly what was covered,
what remains ambiguous, and what to pick up by hand.
