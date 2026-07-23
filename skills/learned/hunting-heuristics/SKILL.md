---
name: hunting-heuristics
description: Use during campaign steering (super-agent-principal) and in ideation. Recurring, high-signal hunting heuristics — where to look, what to avoid, how to get out of duplicates. Meta-advice, not an execution procedure.
---

# hunting-heuristics — where to look, what to avoid

Meta-heuristics to steer the campaign. To be used by the `super-agent-principal` (choosing
leads) and to keep in mind during ideation.

## Anti-duplicate (crucial given the Signal Requirement)
- What a standard tool scan (raw nuclei, scanners) finds trivially is a **duplicate ~90%
  of the time**. Look **where the tools skip**: JS analysis, param manipulation, business
  logic, multi-step flows.
- **Automation = coverage; manual = real finds.** Paying bugs come mostly from
  deep understanding, not scanning.

## Where to focus effort
- **Understand the app thoroughly before automating**: become an expert of the business domain, aim for
  business logic. (Recurring among top earners.)
- **Target internal / sales / high object-ratio apps** for IDOR/BOLA.
- **Lesser-known / self-hosted programs** (outside mainstream H1/Bugcrowd) = less competition,
  fewer duplicates. (see bugbountydirectory.com)
- **Reuse a bug across the target's variants** (web / mobile / preprod) → sometimes paid
  multiple times for the same root cause (respect the program's "1 cause = 1 bounty" rule).

## Level up (beyond the OWASP Top 10)
Deserialization, race conditions, prototype pollution, zip slip, OAuth misconfig, path traversal —
classes less saturated than basic XSS/IDOR.

## Link with the pipeline
- These heuristics feed the `super-agent-principal`'s choice of leads, **not** the Agents Fous
  firewall (they stay fresh eyes, without preconceived conclusions).
- Reference resources: The Bug Hunter's Methodology (Jason Haddix), Th3G3nt3lman recon
  (Shodan + GitHub), PortSwigger Web Security Academy.
