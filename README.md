# jide-skills

Atelier de skills — source de vérité de mes skills génériques pour agents de coding.

Consommation (une fois publié sur GitHub) :

```bash
npx skills@latest add jide/jide-skills --skill <nom>
```

## Principes

- **Rien n'est copié ici tel quel.** Chaque skill est réécrit minutieusement sous le contrat
  [`writing-great-skills`](.agents/skills/writing-great-skills/SKILL.md) (dev-dependency, voir plus bas).
- **Générique par construction** : aucun couplage à un projet (Ludiz, HotDesigner…) — les
  spécificités projet restent dans les repos projet.
- **Un skill = une responsabilité.** Découpage justifié par invocation ou séquence, jamais par confort.
- Les skills externes recommandés ne vivent PAS ici — ils sont référencés par la distro
  [`jide-toolkit`](../jide-toolkit/) (registry + setup).

## Layout

```
skills/            # les skills publiés (source de vérité)
docs/CONVENTIONS.md# règles d'authoring au-delà du contrat writing-great-skills
.agents/skills/    # dev-dependencies d'authoring (non publiées) — restaurées via lock
skills-lock.json   # pin des dev-deps
```

Restaurer les dev-deps après clone :

```bash
npx skills@latest experimental_install
```

⚠️ Quirk `skills` CLI : à l'install d'une dev-dep il peut déposer une copie dans `skills/`
(le dossier publiable) en plus de `.agents/skills/`. Supprimer la copie de `skills/` —
seuls nos skills authored y vivent.

## Boucle d'authoring

1. Choisir un skill du backlog ci-dessous.
2. Relire le contrat `writing-great-skills` + `docs/CONVENTIONS.md`.
3. Écrire/réécrire dans `skills/<nom>/`.
4. Tester dans un vrai projet (`npx skills add` depuis le chemin local ou la branche).
5. Publier, puis pinner dans le registry de `jide-toolkit`.

## Backlog

Sources d'inspiration — à réécrire, pas à copier :

| Skill cible | Source d'inspiration | Domaine | Statut |
|---|---|---|---|
| `image-craft` | `ludiz-image-gen` + `ludiz-step-icon` + evals `ludiz-vibe-smallcore` | assets | **v0 complet** — tronc + 8 branches + scripts (outils locaux testés ; backends API à tester en réel) |
| `video-gen` | `ludiz-reveal-video` généralisé (Seedance/Kling/Veo/TTS, keyframe grids, assembly sync-locked) | vidéo | **v0 complet** — 5 docs + 8 scripts ; TTS + chaîne audio testés en réel ; génération vidéo non testée (coûteux) |
| `design-to-html` | `HotDesigner/design-to-html` + CLI `dt` | design→code | à écrire |
| ~~`generate-design`~~ | — | — | abandonné : couvert par image-craft (tronc + WIREFRAMES + SHEETS §5 + KITS) |
| ~~`vision-detect`~~ | — | — | absorbé : `detect.mjs` est un outil interne d'image-craft ; skill standalone seulement si besoin hors génération |
| `preview-branch` | `skillfab-mono/ludiz-preview-branch` | infra | à évaluer |
| `browser-session` | `skillfab-mono/ludiz-browser-access` | infra | à évaluer |
