# jide-skills

Hand-crafted agent skills — the source of truth for my generic coding-agent
skills.

Install:

```bash
npx skills@latest add jide/jide-skills --skill <name>
```

## Skills

| Skill | What it does |
|---|---|
| [`image-craft`](skills/image-craft/SKILL.md) | Production image generation & editing — variants, coherent sheets (assets, icon sets, multi-screen designs), UI kits, wireframes, edits/masks/outpaint, element isolation (layers), deslop. Backends: OpenAI, fal (Grok, Seedream, Ideogram, FLUX), Gemini. |
| [`video-gen`](skills/video-gen/SKILL.md) | AI video clips — Seedance 2.0 reference-to-video (lip-sync), Kling v3, Veo 3.1, Gemini TTS, keyframe-grid camera control, sync-locked multi-clip assembly. |

API keys are requested on first use only, for the backend actually used, and
written to the workspace-root `.env` (see each skill's SKILL.md).

## Principles

- **Nothing is copied as-is.** Every skill is carefully written under the
  [`writing-great-skills`](https://github.com/mattpocock/skills) contract
  (dev-dependency, pinned in `skills-lock.json`).
- **Generic by construction**: no coupling to any specific project — project
  specifics stay in project repos.
- **One skill = one responsibility.** Splits are justified by invocation or
  sequence, never by convenience.

## Layout

```
skills/            # published skills (source of truth)
docs/CONVENTIONS.md# authoring rules beyond the writing-great-skills contract
.agents/skills/    # authoring dev-dependencies (not published) — restored via lock
skills-lock.json   # dev-deps pin
```

Restore dev-deps after cloning:

```bash
npx skills@latest experimental_install
```

⚠️ `skills` CLI quirk: when installing a dev-dep it may drop a copy into
`skills/` (the published folder) in addition to `.agents/skills/`. Delete the
`skills/` copy — only authored skills live there.

## Authoring loop

1. Pick a skill from the backlog below.
2. Re-read the `writing-great-skills` contract + `docs/CONVENTIONS.md`.
3. Write/rewrite in `skills/<name>/`.
4. Test in a real project (`npx skills add` from the local path or a branch).
5. Publish, then pin in the `jide-toolkit` registry.

## Backlog

Inspiration sources — to be rewritten, not copied:

| Target skill | Inspiration source | Domain | Status |
|---|---|---|---|
| `image-craft` | private prior art + eval learnings | assets | **shipped v0** |
| `video-gen` | private prior art (fal Seedance pipeline) | assets | **shipped v0** |
