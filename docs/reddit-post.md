# Reddit post (draft — r/bugbounty)

**Title:** I built a free, open-source AI agent engine for bug bounty (runs on Claude Code, uses your own subscription)

---

Hey all — I've been building an open-source project called **LLM Hunter** and wanted to share it. It's early, and I'd love honest feedback.

**Why I built it.** When I used AI for bug bounty, two things drove me nuts:

1. It gives up way too fast — "nothing here, dead end" — right when the bug is probably close.
2. It forgets everything between sessions and starts from zero every time.

So I built a system to fix exactly those two things.

**How it works (in plain terms):**

- You point it at a program you're **authorized** to test. It reads the scope and turns it into rules. **The scope is the only guardrail** — it only does what the program allows, nothing more, nothing less.
- It spins up a bunch of small agents for recon (one per tool), then merges their results.
- When an attack looks like it failed, a "persistence" agent doesn't just repeat the same test. It retries with a **genuinely different angle**, again and again, until it truly runs out of new ideas. That deep retry is where the surprises show up.
- There's a pool of **"crazy" agents** that only see the raw attack surface — not the earlier "this is closed" conclusions — so they don't inherit the defeatism. Their whole job is to throw out weird, creative ideas.
- It **learns**: when a technique works, it saves it as a reusable skill for next time. The more you use it, the smarter your copy gets.
- **Every run ends with a report**, even when it finds nothing.

**Honest limits (important):**

- It's strong at mapping wide and generating angles. It does **not** auto-confirm access-control bugs (IDOR/BOLA) — that closing is still manual (two accounts, live). It preps the ground; you sign the finding.
- The safety layer blocks tests that *look* like abuse, even when they're legit. That's expected.

**How to use it:** it's a **Claude Code plugin**. Install it, then run `/llmhunter`. It runs on your **Claude Code subscription** (no separate API key). For the best results, turn on **ultracode** mode.

It's **MIT / free / open-source**: https://github.com/abhixz13/LLM_Enhancer

Only for **authorized** testing — public/private programs or a signed pentest. Would love feedback, and if you've got techniques worth adding as skills, PRs welcome.
