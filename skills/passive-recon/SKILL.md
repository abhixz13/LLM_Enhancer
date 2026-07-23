---
name: passive-recon
description: Use for the passive reconnaissance phase of an engagement, before any active contact with the target. Covers surface inventory via third-party sources (CT logs, archives, dev docs) without sending any request to the target's hosts.
---

# passive-recon — mapping without touching

**Passive-only** recon: no request sent to any of the target's hosts. All data
comes from public third-party sources. This is the raw surface that will feed both the main
campaign and the Agents Fous firewall.

## Passive sources
- **Certificate Transparency** (`crt.sh`) → inventory of hosts/subdomains.
- **Archives** (`waybackurls`, `gau`) → historical URLs and endpoints.
- **Disclosed reports** (H1/Bugcrowd JSON) → vuln classes already found (and patched).
- **Public reverse-engineering repos**, developer docs → auth architecture, ID formats,
  signature layers.

## Product
A factual surface map:
- categorized hosts (in-scope / internal / excluded),
- auth model (cookies/tokens, signature layers),
- object ID formats,
- API entry points.

## Discipline
- Never enumerate/attack an internal resource.
- Move to active only when `rules.yaml` allows it, rate-limited, never on internal targets.
- Cleanly separate **raw surface** (reusable by the Agents Fous) and **interpretation**.
