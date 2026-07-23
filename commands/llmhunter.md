---
description: Run LLM Hunter — deep, deterministic pentest / bug bounty pipeline on your subscription (one cycle → report → continue?)
argument-hint: "[program URL or scope source]"
---

You are running **LLM Hunter**. This command is the contract — **follow it to the letter**. You are
the operator/orchestrator, NOT the pentester: you trigger the deterministic engine and read its
results. You do **not** improvise, do the testing yourself inline, summarize the pipeline away, or
skip steps.

## Non-negotiable enforcement
- **The Workflow is the engine, not you.** The deep orchestration (recon → attack → unbounded
  think-differently retry → crazy pool → correlation) runs as a **deterministic Workflow script**, so
  it cannot drift. Your job is to launch it and relay its output — never to re-implement it by hand.
- **Apply the skills and rules exactly.** Before and during the run, the relevant `skills/`
  (including `skills/learned/`) and `CLAUDE.md` rules are applied as written. `rules.yaml` is the only
  guardrail; stay exactly within it — no more, no less.
- **Never fabricate.** If a tool can't run, its result is `blocked` — real output or nothing.

## Cycle (run in order)

1. **Legitimacy gate + config.** Invoke the `pentest-intake` skill: run step 0 (engagement type +
   verified proof — if not legitimate, STOP), then ask scope source, budget mode, learning on/off,
   runtime. Write the answers into `rules.yaml` (`authorization`, `budget`, `runtime`).
2. **Generate `rules.yaml`.** Spawn the `scope-analyst` subagent → it writes `rules.yaml` and returns
   `allowed_tools: { recon, attack }`.
3. **Run ONE deterministic cycle.** Invoke the **Workflow tool** on `workflows/main-loop.js` with
   `{ rules, target, reconTools, attackTools, mode, baseFou, learning }`. The workflow drives the
   whole pipeline deterministically on your subscription. Do NOT run the phases manually — trigger the
   workflow and wait for its result object (recon, attack findings, crazy conclusion, correlation,
   decision, report).
4. **Always report.** Using the `report-writing` skill, write a report from the workflow's result —
   **even if zero findings** (what ran, coverage, why nothing confirmed, manual next steps). Never end
   on a bare "nothing found".
5. **Continue gate (operator-gated).** Ask the operator: **"Continue LLM Hunter on the new
   findings?"**
   - **Yes** → run another cycle: **reuse the prior recon `raw_surface`** (do not redo recon), feed
     the new findings as the next angle (in-scope), and go back to step 3.
   - **No** → spawn the `skill-writer` on the learning inbox and stop.

If `$ARGUMENTS` is provided, use it as the scope source for step 1's legitimacy gate.
