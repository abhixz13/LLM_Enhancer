# _inbox — raw learning captures (stage 1)

Inbox of the self-learning loop. **Any agent** that discovers during
a campaign a technique, a bypass, a method or a methodology it had not explored at
the start **drops a raw note here** — draft tolerated, the point is to lose nothing — and
notifies the operator.

## Format of a raw capture
A file `<timestamp-or-slug>.md` (or append to a log) containing, unstructured:
- what was attempted / discovered,
- why it worked (or why it is promising),
- the concrete endpoint/context,
- anything that helps reproduce it.

Capture **constructively**, from both successes and failures:
- On success → "this novel approach worked, redo it like this".
- On failure → "approach X didn't land, the alternative angles to try next are Y, Z".

Never write a dead-end / "this never works, stop trying" note. A failure feeds the *next approach to
try*, never a blacklist. The `skill-writer` turns these into an additive playbook, not a do-not-try list.

## Next
At the end of the campaign, the **`skill-writer`** agent (stage 2) goes back over these captures, reformats them into
clean, reusable skills in `skills/learned/<slug>/SKILL.md`, deduplicates, then empties
this inbox.

## Immutability
The captures and learned skills write ONLY under `skills/learned/`. The base runs
(`workflows/`, `agents/`, `rules/`, base `SKILL.md`) are **never** modified by
learning.
