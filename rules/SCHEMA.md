# `rules.yaml` Format

`rules.yaml` is **generated per engagement** by the `scope-analyst` agent from the analysis of the
program scope, then **injected into all agents**. It is the engine's single guardrail.

An agent reads this file before any action and: (1) uses only the tools in `tools.allowed`,
(2) respects the caps in `limits`, (3) applies the `stop_conditions`, (4) frames its findings within
`scope.in` / `vuln_focus` classes.

## Schema

```yaml
# --- Engagement authorization (filled in + VERIFIED by pentest-intake BEFORE any test) ---
authorization:
  engagement_type: "bug_bounty"   # "bug_bounty" | "pentest"
  # Proof of legitimacy provided at intake:
  #   bug_bounty → URL / screenshot / copy of the program page (public scope)
  #   pentest    → engagement letter / signed contract (to be verified)
  proof: "..."
  verified: false                 # if false → the engine does NOT start (blocked at intake)

program:
  name: string                 # e.g.: "Acme Bug Bounty"   (fictional — fill from the real scope)
  platform: string             # e.g.: "HackerOne" | "Bugcrowd" | "private"
  url: string
  signal_requirement: bool     # if true → quality > quantity, one invalid hurts
  novelty_required: bool       # if true → a fresh variant is mandatory (patched = duplicate = $0)

scope:
  in:                          # in-scope assets (fictional placeholders)
    - "acme.example"
    - "*.assets.acme.example"
  out:                         # explicit exclusions
    - "Legacy Billing API (access-control excluded)"
    - "CSRF (program-wide)"
  internal_forbidden: true     # DEPENDS ON THE PROGRAM, not a default.
                               #   true  → the program forbids internal: out of bounds, no
                               #           scan/enum, + stop-condition if encountered.
                               #   false → the program ALLOWS internal: then test it
                               #           fully — that is often where the value is. Do not
                               #           self-restrict under the pretext of caution.

tools:
  # PHILOSOPHY: the scope-analyst is a JUDGE OF AUTHORIZATION, not of usefulness. It reviews the ENTIRE
  # TOOLS_CATALOG and: allows EVERYTHING the program permits (even the little/not-useful tools),
  # forbids ONLY what the program forbids. Usefulness never enters into it.
  # SYMMETRIC FIDELITY: exactly the authorized perimeter — no more, NO LESS. Known model bias
  # = cutting too much / under-authorizing out of caution. To correct: if the program allows it
  # (aggressive tool, internal resource, powerful class), it is ALLOWED, put it in `allowed`.
  # At execution: a tool absent from `allowed` = forbidden (enforcement guardrail).
  allowed:
    - id: burp
    - id: mitmproxy
    - id: ffuf
      constraints: { mode: "targeted-only", max_requests: 9 }   # allowed but bounded by the program
  forbidden:                   # ONLY what the program forbids (reason mandatory)
    - id: sqlmap
      reason: "automated active scanner forbidden by the program"
    - id: gobuster
      reason: "aggressive enumeration forbidden by the program"

limits:
  volume_per_test: "single-digit"   # number of requests per test
  rate_limited: true
  no_aggressive_enum: true

vuln_focus:                    # framed classes (impacts report framing)
  - broken-access-control
  - idor-bola
  - ssrf
  exclude_classes:
    - csrf                     # never submit

stop_conditions:               # immediate STOP + report
  - third_party_real_data
  - internal_resource
  - out_of_scope_host

testing_accounts:
  self_owned_only: true
  convention: "<username>+x@<your-test-domain>"

reporting:
  provide_test_ip: true
  poc_naming: "H1 handle in file name + comment"
  quality: "summary + repro + PoC + impact + root cause + fix"

special_rules:                 # program-specific rules (structured free text)
  - id: oob_callback
    desc: "SSRF only via the program's mandated out-of-band callback service (flag-based)"

# --- Skills bank (read by EVERY agent before executing) --------------
skills:
  bank: "skills/"              # menu of skills to consult before acting
  learned: "skills/learned/"   # skills learned over the runs
  read_before_execute: true            # the agent MUST browse the bank before executing

# --- Learning loop (auto-skill) ----------------------------------
learning:
  enabled: true
  capture_inbox: "skills/learned/_inbox/"
  notify: true                         # notify as soon as a discovery is captured
  # Write rights BY ROLE:
  # Tier 1 — atomic agents: raw capture only, nothing else.
  agent_writable_paths: ["skills/learned/_inbox/"]
  # Tier 2 — skill-writer: reformats AND can PROMOTE into the global config
  #   (base skills bank + tools catalog).
  skillwriter_writable_paths: ["skills/", "TOOLS_CATALOG.md"]
  # IMMUTABLE FOR ALL (skill-writer included): the base runs are NEVER modified.
  immutable_paths: ["workflows/", "agents/", "rules/"]

# --- Budget: drives the crazy pool size AND the retry depth -------
budget:
  mode: "normal"        # peu | normal | beaucoup   (normal = default, depends on budget)
  base_fou: 3           # base number of crazy agents
  token_target: null    # optional: cap on exploratory tokens (retry + crazy pool)

# --- Runtime / multi-LLM portability (see docs/MODEL_STRATEGY.md) -----------
runtime:
  provider: "claude_code"   # "claude_code" | "claude_api" | "gpt" | "other"
  multi_model: true         # true  → each tier runs on its REAL model (real haiku/sonnet/opus)
                            # false → a single model everywhere, effort modulated per tier
                            #          (cheap=low, mid=medium, strong=high)
  # Derived values computed by the workflows (see the `foPlan` helper in crazy/attack-pipeline):
  #   peu      → poolSize = max(1, floor(base_fou/2)),  max_retry = 3        (token-conscious)
  #   normal   → poolSize = base_fou,                    max_retry = UNBOUNDED
  #   beaucoup → poolSize = 2 * base_fou,                max_retry = UNBOUNDED
  # UNBOUNDED retry = keep reinjecting a genuinely NEW angle until the persistence-controller is
  # exhausted (no new approach) or the budget floor / anti-runaway backstop is hit — never a fixed
  # count. Deep retry + think-differently + crazy ideas is where the breakthroughs come from.
```

## Interpretation rules for the agents

- **Absence = prohibition (enforcement).** At execution, a tool absent from `tools.allowed` is
  blocked. This is why `allowed` must be **exhaustive**: the scope-analyst puts ALL the tools
  permitted by the program in it, not only those it deems useful.
- **Authorization ≠ usefulness.** A useless but permitted tool stays in `allowed`. Deciding
  usefulness is nobody's role at this stage (inclusive policy at deployment).
- **`constraints` takes precedence.** An allowed tool that has `constraints` must be driven within
  those bounds (mode, max_requests…).
- **`stop_conditions` = hard stop.** No conclusion, no "just one more request" overrides it. The
  agent stops and reports up.
- **No self-censorship ≠ out of bounds.** An agent does not hold back on "this won't work", but
  never crosses `limits` / `scope.out` / `stop_conditions`.
