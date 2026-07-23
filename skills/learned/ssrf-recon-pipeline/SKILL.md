---
name: ssrf-recon-pipeline
description: Use to hunt an SSRF (or reflected XSS) starting from a URL surface. Chains recon→filtering→fuzzing→OOB validation, plus classic WAF bypasses (decimal IP, cloud metadata).
---

# ssrf-recon-pipeline — from URL surface to proven SSRF

Only execute if `rules.yaml` allows the tools involved and the volume. Many of these
tools are `active-heavy` → often out of scope. Verify beforehand.

## Injectable-parameter discovery pipeline
```
waybackurls <target> | gf ssrf | qsreplace "FUZZ" | httpx -mc 200
```
- `waybackurls`/`gau` → historical URLs (passive).
- `gf <pattern>` → filters URLs with risky params (patterns `ssrf`, `xss`, `redirect`…).
- `qsreplace` → replaces query-string values with a marker/payload.
- `Gxss` / `httpx -mc 200` → keeps live / reflected responses.

## Out-Of-Band validation (mandatory for blind)
- Use **Interactsh** (free) or **Burp Collaborator**: inject a callback URL, confirm
  the SSRF via an incoming DNS/HTTP hit. (If the program mandates its own out-of-band callback
  service, use that instead — see `rules.yaml.special_rules`.)

## WAF bypass / recurring SSRF techniques
- **Decimal IP**: `169.254.169.254` → `2852039166` to bypass a regex filter.
- **Cloud metadata**: target `http://169.254.169.254/latest/meta-data/` (AWS) once the SSRF is
  confirmed — often the pivot to Critical.
- **Port detection by timing**: ~29–30 s delay ≈ closed/filtered port, fast response ≈ open.
- **Indirect vectors**: PDF generation, connectors (e.g. Teams), URL preview, webhooks →
  blind SSRF.
- **HTML-injection → SSRF/LFI when XSS is blocked**: `<META HTTP-EQUIV="refresh" CONTENT="0;URL=...">`.

## Guardrails
- Stay within `rules.yaml`: volume, allowed tools, and above all the program's specific SSRF
  rule (any mandated out-of-band callback service, forbidden internal targets). Never attack real
  metadata outside an explicitly authorized test channel.
