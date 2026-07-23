# AI pipeline architecture — Pentest / Bug Bounty (spec v3)

## Context and philosophy

Generic, reusable framework for automating bug bounty / pentest campaigns using AI
agents orchestrated across several layers. Founding principle: **the scope authorized by the
program is the sole guardrail**. No additional security layer is added on
top — the agents execute what is permitted, without judging the perceived probability of success.
The creative workflow has **no relevance filter**, only an authorization filter.

## Overview

1. A rules/scope file (`rules.yaml`) is **generated per engagement** from the analysis of the
   program's scope (agent `scope-analyst`), then injected as input to all agents. The agents
   never use an unauthorized tool nor exceed the volume caps it sets.
2. A Recon Workflow and an Attack Workflow, each organized into tool-agents → pool orchestrators
   (small conclusion) → Master agent (large conclusion).
3. A Main Super-Agent drives the Recon ⇄ Attack loop: launches recon, decides which
   attacks to test, decides whether to continue / stop / pivot the scope based on the conclusions.
4. Each negative conclusion from the Attack Master passes through a **Persistence Controller** before
   propagating up: if it detects a sign of dubious execution, it sends the test back with a genuinely
   NEW angle — retrying as many times as needed until the angle space is exhausted (or the budget
   floor is hit), before accepting a "no vulnerability" as definitive. No small fixed count.
5. In parallel, a **Pool of Crazy Agents** generates deliberately extreme attack hypotheses,
   **with no memory of the work already done**. These hypotheses traverse their own Crazy Recon
   Workflow then Crazy Attack (same structure), with no relevance filter — only the authorization filter.
6. A **Global Super-Agent**, subordinate to the Main Super-Agent, receives the state of the main
   attack + the raw conclusion of the creative workflow. It decides on its own whether there is a
   relevant correlation and redistributes it to the Main Super-Agent — which stays focused solely on
   driving the main recon/attack.

## The squad formula (v3.1)

> Correction vs the initial diagram: the number of tool-agents **is not fixed at 5**.

- **Tool-agents = N**, N = number of tools deemed useful for the target. **1 agent = 1 tool.**
- **Inclusive** policy: a tool with low perceived usefulness is deployed anyway (no self-censorship).
- **Orchestrators = `ceil(N/5)`**: one orchestrator per pool of 5 tool-agents. The "5" is the
  fan-in ratio, not the squad size.

## Components

**Tool-agents** — one agent = one tool (see `TOOLS_CATALOG.md`). Executes its mission, returns a
structured result. Model: Haiku.

**Pool orchestrators** — group up to 5 tool-agents, cross-reference their results, produce
a "small conclusion". Model: Sonnet.

**Master agents** (Recon / Attack, main and creative) — aggregate the small conclusions of all
the pools of a phase into a "large conclusion". Model: strong.

**Persistence Controller** — intercepts each negative conclusion from an Attack Master. Checks
whether there is a signal of uncertainty (poorly executed test, misinterpreted payload, ambiguous response). If so,
sends it back with a genuinely new angle — retrying as many times as needed until the angle space is
exhausted (or the budget floor is hit) — before accepting the negative as definitive. Model: strong.

**Main Super-Agent** — drives the main Recon ⇄ Attack loop, decides
continue/stop/pivot the scope, receives the correlations redistributed by the Global Super-Agent.
Model: Opus.

**Crazy Agents Pool** — generate extreme attack hypotheses, with no memory of the work already done,
with no relevance filter — only filtered by what the scope authorizes. Model: the most creative.

**Crazy Recon / Crazy Attack Workflow** — same structure as the main workflow, dedicated to testing
the hypotheses of the Crazy Agents Pool.

**Global Super-Agent** — subordinate to the Main Super-Agent. Receives the state of the main attack +
the raw creative conclusion, decides whether there is a relevant correlation and redistributes. Model: Opus.

## Cross-cutting principles

- **Scope = sole guardrail.** `rules.yaml` injected into all agents; they execute what is
  authorized, without judging the perceived probability of success.
- **Creative ≠ relevant.** The creative workflow has no relevance filter, only an authorization
  filter. Its purpose is to test everything.
- **No premature abandonment.** The Persistence Controller retries with a new angle as many times as
  needed — until genuinely exhausted or the budget floor — before any definitive negative, on both
  the main and creative sides.
- **Strict separation of responsibilities.** The Main Super-Agent does not do the correlation
  itself — that is the role of the Global Super-Agent.

## Open points (to be decided at implementation)

- Context given to the Crazy Agents Pool: **zero context by default** (surface + `rules.yaml`
  only), option for a minimal tech stack.
- Persistence Controller: designed **on the Attack side only** for now. To be seen whether we
  reuse it on the Recon side (misconfigured scan that finds nothing).
- Per-asset/IP layer: deferred to a future iteration.

## Associated reference files

- `TOOLS_CATALOG.md` — catalog of recon/attack/cross-cutting tools, with authorization metadata
  (class, aggressiveness, volume profile). It is the agent, via `rules.yaml`, that judges
  the authorization.
- `docs/pipeline_schema.html` — visual diagram of the architecture (v3, with Persistence Controller).
