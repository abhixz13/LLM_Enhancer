# CLAUDE.md — Repo rules (Pentest / Bug Bounty engine)

This repo is an **AI agent engine for authorized bug bounty / pentest**. Usage context:
**authorized** security testing (bug bounty programs, pentest engagements under contract, CTF,
defensive research). Each campaign operates within an explicit scope.

## The fundamental contract

0. **Legitimacy gate (intake).** No campaign starts without an engagement proven legitimate:
   `bug_bounty` with proof of the program, or `pentest` with a verified signed engagement letter. The
   block is at intake (`pentest-intake`, step 0) — not verified → we do not proceed further.
1. **`rules.yaml` is the law.** It is generated per engagement (agent `scope-analyst`) from the
   program's scope, and injected into ALL agents. An agent never uses a tool absent from the
   authorized list, never exceeds the volume caps, and respects all stop-conditions.
2. **Scope = sole guardrail, but absolute guardrail.** No "relevance" filter (we do not
   self-censor on the probability of success), BUT the authorization filter is strict.
   **Symmetric fidelity: exactly what is authorized — no more, NO LESS.** Out of scope =
   forbidden. But what the scope authorizes (aggressive tool, internal resource if the program
   permits it) **must** be done — never under-authorize out of excessive caution.
3. **Non-negotiable stop-conditions** (inherited from bug bounty discipline, encoded in
   `rules.yaml`): immediate STOP + report if real third-party data, an internal resource, or an
   out-of-scope host is encountered. Never DoS/degradation. Volume compliant with the program's cap.
4. **Test accounts/objects of one's own only.** PoCs use accounts created for the test,
   never real users.

## Skills & learning protocol (ALL agents)

1. **Read the skill bank before executing.** `rules.yaml.skills.read_before_execute: true` →
   each agent browses `skills/` (base + `learned/`) before acting, to reuse a
   technique already known rather than starting from scratch.
2. **Capture discoveries (stage 1).** As soon as an agent finds a bypass / a method / a
   methodology not planned at the start, it **drops a raw note** (rough draft OK) into
   `skills/learned/_inbox/` and **notifies**. We never lose a find.
3. **Reformatting (stage 2).** The `skill-writer` agent goes back over the inbox at the end of the
   campaign and transforms it into clean, reusable skills.
4. **Immutability by role.** Atomic agents write ONLY to `skills/learned/_inbox/`
   (raw capture). The **`skill-writer`** can, for its part, write to the global config: skill bank
   `skills/` (including promoting a `learned/` to the base) and `TOOLS_CATALOG.md`. But
   **nobody, skill-writer included, touches the base runs**: `workflows/`,
   `agents/`, `rules/` remain immutable. Knowledge/config grows, the orchestration
   stays stable.
5. **Learn constructively — never blacklist.** Learning is POSITIVE: capture what *worked* (a novel
   approach → a skill to redo) and, from a failure, the *alternative approaches to try next time*.
   Never encode "this failed N times, stop trying". A past failure only **adds** angles to try; it
   never suppresses a future attempt. No learned skill may say "don't try X" — the learned bank is an
   additive playbook of approaches, not a dead-end list. (This mirrors the persistence-controller:
   its final negatives are per-run only, never persisted as a do-not-retry rule.)

## Multi-LLM portability (Claude, GPT, single-model) — cf `docs/MODEL_STRATEGY.md`

Models are expressed in **tiers** (`cheap`/`mid`/`strong`), not in proper names. An agent's `model:`
(`haiku`/`sonnet`/`opus`) is a **tier token** realized according to `rules.yaml.runtime`:

- **Multi-model runtime** (Claude Code, etc.): the announced model **MUST** be the real model.
  A `cheap`/Haiku role runs *for real* on Haiku — never a large model in disguise. It's tokens,
  hence money. In Claude Code this is guaranteed by the frontmatter + `agentType`.
- **Single-model runtime**: same model everywhere, we **modulate the effort** per tier (cheap=low,
  mid=medium, strong=high). Cost hierarchy preserved by the effort, not by the model.

## Budget & mode (Crazy Pool + retry)

The Crazy Pool size is set by `rules.yaml.budget.mode`: `peu` / `normal` (default) / `beaucoup` (≈ ×2),
via the `pentest-intake` questionnaire.

**Retry is deep, not capped.** For bug bounty the retry is **unbounded** in `normal`/`beaucoup`: the
persistence-controller keeps reinjecting a genuinely NEW angle (think-differently) until it is
genuinely **exhausted** (no new approach left), or the budget floor / anti-runaway backstop is hit —
never a small fixed count. The breakthroughs come from deep retry + think-differently + crazy ideas,
so we do not stop early. `peu` keeps a small finite cap for token-conscious runs.

## Conventions

- **Agents**: `agents/*.md`, one role per file, model in frontmatter (cost cascade).
- **Workflows**: `workflows/*.js`, deterministic orchestration scripts (Workflow tool).
- **Skills**: `skills/*/SKILL.md`, reusable methodology.
- **Squad formula**: tool-agents = N (1 per authorized tool, inclusive); orchestrators = ceil(N/5).
  The crazy pipeline uses the SAME full workforce as the main recon/attack pipeline.
- **Orchestration is delegated, never inlined.** The orchestrator MUST follow the playbook and
  spawn real subagents for each role and tool — it never takes over and performs the testing
  itself inline. Steering stays at the orchestrator; the work happens in the spawned agents.
- **Every run ends with a report.** A campaign ALWAYS terminates with a report, even when zero
  findings — a clean "no vulnerability found" is a valid, mandatory outcome, never a silent exit.
- The working language of the repo is English (docs, conclusions).

## Target-agnostic — no real target in the repo

The repo ships the **generator and the method**, never a real target.

- **No filled-in `rules.yaml`.** The concrete `rules.yaml` is generated per engagement by the
  `scope-analyst` from the real scope, and kept **local (gitignored)** — never committed. The repo
  ships only the format (`rules/SCHEMA.md`, with fictional placeholder values) and the generator.
- **Skills stay target-agnostic.** A skill states the *method* ("for example…"), never a real
  target, real endpoint, or engagement-specific signature/header. Anything target-specific belongs in
  the local `rules.yaml`, not in a shared skill — a skill tied to a real vuln/target is traceable if
  someone reuses the framework.

## What this repo is NOT

Not a tool for attacking unauthorized targets. Every target must be covered by a public/private
bug bounty program or a pentest engagement under contract. In the absence of an authorized scope,
the engine does not run.
