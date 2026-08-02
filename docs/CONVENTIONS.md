# Authoring conventions

Complements the [`writing-great-skills`](../.agents/skills/writing-great-skills/SKILL.md)
contract (vocabulary: description, context load, leading word, progressive
disclosure, failure modes). When in doubt, the contract wins. Living draft —
refined with each rewrite.

## Language

Everything is English: SKILL.md, linked files, scripts, repo docs, commits.

## Invocation

- **User-invoked by default** (`disable-model-invocation: true`) — zero context load.
- Model-invoked only if: the agent must trigger it on its own, OR another skill
  must reach it.
- Model-invoked description: triggers only, one trigger per branch, no synonyms.

## Skill structure

```
skills/<name>/
  SKILL.md          # steps + minimal inline reference
  <REF>.md          # progressive disclosure (named for what it holds)
  scripts/          # co-located executable tooling, self-installs on first use
```

- Tooling is co-located INSIDE the skill, never at the repo root (portability
  at install time).
- Self-install: the skill checks/installs its deps on first run — no manual
  prerequisites.

## Granularity

- **One skill, many branches**: variants of a single capability (e.g.
  image-craft: simple, icons, deslop) are branches — one reference file per
  branch, loaded on demand. One install unit, one description.
- Split into a separate skill only if: the branch has its **own trigger** used
  on its own daily, OR the SKILL.md trunk sprawls despite disclosure.
- A base is only a skill if it has its own trigger. Shared mechanics without a
  trigger → co-located tool or reference file, never a skill.
- A skill reachable by other skills must be model-invoked (user-invoked =
  unreachable). Max dependency depth: 2.

## Backends & dependencies

- **Provider-fallback pattern**: if a suitable MCP is present, use it;
  otherwise fall back to a direct API script. One skill, several backends —
  never one skill per backend.
- **Skill→skill dependency**: named in prose at the point of use ("screenshot
  via the `agent-browser` skill") + presence check with an install instruction
  as fallback.
- No dependency on host-repo global state (env vars documented in SKILL.md).
- API keys: request only the key for the backend in use; write to the
  workspace-root `.env` (survives skill updates, shared across skills); warn
  when that `.env` is not gitignored.

## Quality before publishing

- Failure-modes pass: premature completion, duplication, sediment, sprawl,
  no-ops, negation.
- Checkable completion criteria on every step.
- Tested in a real project before pinning in `jide-toolkit`.
