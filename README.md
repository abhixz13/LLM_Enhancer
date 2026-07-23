<p align="center">
  <img src="assets/llm-hunter-banner.svg" alt="LLM Hunter" width="100%">
</p>

# 🐛 LLM Hunter

**A layered, multi-agent engine that turns an LLM coding agent into a disciplined pentest / bug
bounty operator.** LLM-agnostic (Claude, GPT, or a single small model), self-improving, and built so
that the authorized scope is the only guardrail.

---

## Why this exists

This project was born out of frustration. Coding agents like Claude Code have enormous potential for
security work — but out of the box they aren't structured enough for real pentests. It was like a
**rough diamond**: the power was clearly there, but nobody quite knew how to cut it. Left alone, the
model tends to give up too early (*"this is closed, dead end"*) exactly when the finding is right in
front of it, restarts from scratch every engagement, and has no memory of what worked last time.

LLM Hunter is the cut. It wraps the raw capability in a methodology: a fixed set of agent roles, a
deterministic orchestration, hard scope discipline, and a learning loop so the engine gets sharper
every run.

## It evolves — with you

The engine **grows per user**. Every campaign feeds a learning loop: whenever an agent discovers a
bypass, a technique, or a methodology, it's captured and reformatted into a reusable skill. The more
you hunt, the deeper *your* instance's skill bank becomes — it starts to reflect how *you* work.

Power users will naturally accumulate the richest skill banks. If that's you: **please share your
skills back with the community.** That's how everyone's diamond gets sharper.

> ⚙️ This is an evolving project. Expect frequent updates, new agent roles, new skills, and broader
> LLM/runtime support over time.

## Core principle: scope is the only guardrail

There is no added "relevance" filter and no self-censorship on *"will this even work?"*. The engine
runs anything the program authorizes — and it authorizes **exactly** what the program allows, no more
and **no less**. Two filters exist; only one is applied:

| Filter | Applied? |
|---|---|
| **Authorization** — is the test permitted by `rules.yaml`? | ✅ strict, non-negotiable |
| **Relevance** — does the test have a chance of succeeding? | ❌ never |

Legitimacy is enforced up front: no campaign starts without a verified authorization (a bug bounty
program page, or a signed pentest engagement letter). **Use it only against targets you are
authorized to test.**

## How it works

<p align="center">
  <img src="assets/architecture.svg" alt="LLM Hunter architecture" width="100%">
</p>

> A styled, interactive version lives in [`docs/pipeline_schema.html`](docs/pipeline_schema.html) (open it in a browser).

**The squad formula.** Tool-agents = **N** (one per *authorized* tool, inclusive — even low-utility
tools are deployed). Orchestrators = **ceil(N/5)** (one per pool of 5). Masters aggregate into a
single conclusion.

**Anti-give-up.** A *persistence-controller* intercepts every negative verdict and retries with a
genuinely new angle as many times as needed — until it is exhausted (no new approach) or the budget
floor is hit — before a "no vulnerability" is accepted as final.

**Creative pool ("crazy agents").** A firewalled set of agents receives *only the raw attack
surface* — never prior conclusions or "already tried" verdicts — so their creativity is never
poisoned by defeatism. A *global* super-agent correlates their raw output back into the main loop.

**Learning loop.** Discoveries are captured raw by any agent, then a dedicated `skill-writer`
reformats them into clean, reusable skills. Only the skill/config layer is mutable — the base runs
(workflows, agent roles) are immutable.

**Budget modes.** `peu` / `normal` / `beaucoup` scale the creative pool size. Retry is **deep, not
capped**: in `normal`/`beaucoup` the persistence-controller retries with a genuinely new angle until
it is exhausted (no new approach) or the budget floor is hit — never a small fixed count, because the
breakthroughs come from deep retry + think-differently + crazy ideas. `peu` keeps a finite cap.

## LLM-agnostic by design

Models are expressed as **tiers** (`cheap` / `mid` / `strong`), not vendor names — see
[`docs/MODEL_STRATEGY.md`](docs/MODEL_STRATEGY.md).

- **Multi-model runtime** (Claude Code, etc.): each tier runs on its **real** model — a `cheap` role
  actually runs the small model, never a large one in disguise (tokens = money).
- **Single-model runtime**: same model everywhere, with **reasoning effort** dialed per tier
  (cheap = low … strong = high). The cost hierarchy is preserved via effort instead of model.

## Repository layout

```
.claude-plugin/plugin.json   plugin manifest (Claude Code plugin)
commands/              the /llmhunter slash command (single entry point)
agents/                one file per role (10 roles), model tier in frontmatter
skills/                reusable methodology (+ learned/ skill bank grown per run)
workflows/             orchestration scripts (recon · attack · crazy · main-loop)
rules/                 SCHEMA.md — the rules.yaml format (generated per engagement, never shipped filled-in)
docs/                  ARCHITECTURE.md · MODEL_STRATEGY.md · pipeline_schema.html
TOOLS_CATALOG.md       universal tool menu + authorization metadata
CLAUDE.md              the operating contract (guardrails & conventions)
```

## Install (Claude Code plugin)

LLM Hunter ships as a **Claude Code plugin**, driven by a single branded slash command.

**1. Add the plugin.** In Claude Code:

```
/plugin marketplace add abhixz13/LLM_Enhancer
/plugin install llm-hunter@llm-hunter
```

(Or clone the repo and add it locally: `/plugin marketplace add ./LLM_Enhancer`.)

**2. Turn on `ultracode` (recommended for best results).** LLM Hunter is a *deep* multi-agent engine.
In Claude Code, enabling **ultracode** makes Claude fully lean into the workflow orchestration — more
agents, deeper coverage, more think-differently retries — which is exactly what gives the best hunting
results. It is token-intensive by design; that's the point of deep hunting. Without ultracode it still
works, just less exhaustively.

**3. Run it.**

```
/llmhunter <program URL or scope>
```

`/llmhunter` runs the whole pipeline as one deterministic cycle, then asks whether to continue:
legitimacy gate → intake → `scope-analyst` → **deterministic `main-loop` workflow** (recon → attack →
unbounded think-differently retry → creative pool → correlation) → report → *continue?* gate → loop or
finish (learning). It runs on your **Claude Code subscription** — no API key.

## Status

⚙️ **Deterministic and runnable on your subscription.** `/llmhunter` drives the pipeline through the
**Workflow tool** — the deep orchestration runs as a deterministic script (it can't drift), spawning
real subagents on your Claude Code subscription (no API key). The orchestrator only triggers the
engine and relays its output — it never takes over and runs the tests inline, and it applies the
skills/rules to the letter. Every run **always ends with a report**, even at zero findings, then asks
whether to continue on the new findings. All 10 roles, 5 skills, and 4 workflows are wired together —
not inert stubs. Still actively evolving: expect new roles, more community skills, and broader runtime
support regularly.

## How to run

Run **`/llmhunter`** to start a campaign. It runs the legitimacy gate + asks the few config questions
(scope source, budget mode, learning), hands off to `scope-analyst` to generate a concrete
`rules.yaml`, then triggers the deterministic `main-loop` workflow for one full cycle. The pipeline
**always ends with a report**, even if zero findings, and then asks **"continue on the new
findings?"** — yes loops another cycle (reusing the recon surface), no runs the `skill-writer` and
stops. The generated `rules.yaml` is engagement-specific and stays local — it is never shipped.

## Contributing

Found a technique the engine should know? Package it as a skill under `skills/learned/` and
open a PR. Community skills make every hunter's engine sharper.

## ⚠️ Authorized use only

LLM Hunter is for **authorized** security testing: public/private bug bounty programs and pentests
under signed contract. The legitimacy gate will refuse to start without proof of authorization. Do
not point it at anything you don't have explicit permission to test.
