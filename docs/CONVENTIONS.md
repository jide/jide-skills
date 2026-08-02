# Conventions d'authoring

Complète le contrat [`writing-great-skills`](../.agents/skills/writing-great-skills/SKILL.md)
(vocabulaire : description, context load, leading word, progressive disclosure, failure modes).
En cas de doute, le contrat prime. Brouillon — à affiner ensemble au fil des réécritures.

## Langue

- `SKILL.md` et fichiers liés : **anglais** (portabilité cross-agents, priors du modèle).
- Docs du repo (README, ce fichier) : français.

## Invocation

- **User-invoked par défaut** (`disable-model-invocation: true`) — zéro context load.
- Model-invoked seulement si : l'agent doit déclencher seul, OU un autre skill doit l'atteindre.
- Description model-invoked : déclencheurs uniquement, un trigger par branche, pas de synonymes.

## Structure d'un skill

```
skills/<nom>/
  SKILL.md          # steps + référence inline minimale
  <REF>.md          # progressive disclosure (nommé pour ce qu'il contient)
  scripts/          # outillage exécutable co-localisé, self-install au premier usage
```

- Outil co-localisé DANS le skill, jamais à la racine du repo (portabilité à l'install).
- Self-install : le skill vérifie/installe ses deps au premier run, pas de prérequis manuel.

## Granularité

- **Un skill, des branches** : les variantes d'une même capability (ex. image-craft : simple,
  icônes, deslop) sont des branches — un fichier de référence par branche, chargé à la
  demande. Une seule unité d'install, une seule description.
- Splitter en skill séparé seulement si : la branche a son **propre déclencheur** utilisé
  seul au quotidien, OU le tronc SKILL.md sprawle malgré la disclosure.
- Une base n'est un skill que si elle a son propre déclencheur. Mécanique partagée sans
  déclencheur → outil co-localisé ou fichier de référence, jamais un skill.
- Un skill atteignable par d'autres skills doit être model-invoked (user-invoked =
  inatteignable). Profondeur de dépendance max : 2.

## Backends & dépendances

- **Pattern provider-fallback** : si un MCP adapté est présent (ex. fal), l'utiliser ; sinon
  fallback script direct (API Gemini/OpenAI…). Un seul skill, plusieurs backends — jamais
  un skill par backend.
- **Dépendance skill→skill** : nommée en prose au point d'usage ("screenshot via the
  `agent-browser` skill") + vérification de présence avec instruction d'install en fallback.
- Pas de dépendance à un état global du repo hôte (env vars documentées dans le SKILL.md).

## Qualité avant publication

- Passage failure modes : premature completion, duplication, sédiment, sprawl, no-ops, négation.
- Critères de complétion vérifiables à chaque step.
- Testé dans un vrai projet avant pin dans `jide-toolkit`.
