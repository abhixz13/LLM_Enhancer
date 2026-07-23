---
name: idor-testing
description: Use to test object-level authorization vulnerabilities (IDOR/BOLA) cleanly and admissibly. Covers setup of self-owned accounts, capture of auth material, identifier substitution, and confirmation of real impact.
---

# idor-testing — testing IDOR/BOLA cleanly

## Account setup (self-owned only)
- IDOR/BOLA → **2 accounts**: A (attacker) and B (victim), both self-owned.
- Family-pairing / relations → **3 accounts** (A parent, B teen paired, C non-paired).
- Test email convention per `rules.yaml` (e.g. `<username>+a@<your-test-domain>`).
- Prove impact without ever touching a third party.

## The account ↔ request link = auth material
Session cookies + signatures attached to each request prove identity. Capture **your
own** tokens (A and B) via an interception proxy (Burp/mitmproxy) or DevTools.

## Method
1. Capture an authenticated request from A to an endpoint that reads/modifies a resource by ID.
2. Replace the object identifier with that of one of B's resources, **keeping A's session**.
3. Send. Obtaining/modifying B's data = IDOR proven (without touching anyone).
4. **Confirm the real effect on the target side** (B's session), not just via the response code: a
   cosmetic `200` with no actual change ≠ vuln.

## Signature pitfalls
Some apps sign the request **body** with custom signature headers (app and web often use different
ones) →
modifying a param in a proxy invalidates the signature. In that case test via a **real signed client**
(browser, or app + Frida hook that re-signs), not raw curl. Web first (simpler), app
next.

## Admissibility
- Single-digit volume, self-owned accounts/objects, per-session log (IP, date, asset, result).
- Frame strictly as broken-access-control / auth bypass. Never CSRF if excluded by the program.
