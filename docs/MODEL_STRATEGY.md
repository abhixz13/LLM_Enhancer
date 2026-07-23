# Model strategy — portable multi-LLM

This engine is **LLM-agnostic**. It works with Claude, GPT, or any other provider, and
even with a single model. The cost cascade is described in **tiers**, not in model names.

## The tiers

| Tier | Reasoning load | Roles |
|---|---|---|
| **cheap** | minimal, mechanical | `tool-agent` |
| **mid** | limited synthesis | `squad-orchestrator`, `master-recon`, `master-attack` |
| **strong** | judgment / creativity / strategy | `persistence-controller`, `agent-fou`, `skill-writer`, `scope-analyst`, `super-agent-principal`, `super-agent-global` |

The `model:` field in agent frontmatter (`haiku`/`sonnet`/`opus`) is a **tier token**:
`haiku = cheap`, `sonnet = mid`, `opus = strong`. It is realized according to the runtime below.

## Realization by runtime

| Tier | Token | Claude Code / Claude API (multi-model) | GPT (multi-model) | Single-model runtime |
|---|---|---|---|---|
| cheap | `haiku` | Haiku (real) | light/mini model | **same model, effort = low** |
| mid | `sonnet` | Sonnet (real) | intermediate model | **same model, effort = medium** |
| strong | `opus` | Opus (real) | strongest model | **same model, effort = high** |

## Rules (non-negotiable)

1. **Model fidelity on multi-model runtimes.** The model announced for a role **MUST** be
   the one actually executed. A role in the `cheap` tier really runs on the small model (Haiku) —
   never a large model in disguise. Direct impact on tokens = the monetary cost. In Claude Code,
   this is guaranteed by the agent frontmatter's `model:` (honored to the letter), and the workflows
   go through `agentType` (so they inherit the role's real model).

2. **Single-model fallback = modulate the effort.** If the runtime does not offer multiple models, we
   **keep the same model everywhere** and **modulate the reasoning effort** per tier
   (`cheap → low`, `mid → medium`, `strong → high`). The cost hierarchy is preserved by the
   effort, not by the model.

3. **Selection priority.** For each role: (a) equivalent model from the provider if available →
   use it for real; (b) otherwise, single-model fallback + effort per tier. Never
   over-provision a `cheap` role on a large model "for comfort".

## Where it is wired

- **Agents** (`agents/*.md`): `model:` = tier token, honored for real by Claude Code.
- **Workflows** (`workflows/*.js`): `agent(..., { agentType })` inherits the role's real model.
  In single-model mode, pass `{ effort }` per tier instead of `{ model }`.
- **`rules.yaml.runtime`**: declares `provider` and `multi_model` → determines multi-model vs
  effort fallback.
