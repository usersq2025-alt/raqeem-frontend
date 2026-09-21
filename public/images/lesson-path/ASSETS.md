# Lesson path assets — Unit Learning Journey

## Shipped art (science + shared gates)

| Path | Notes |
|------|--------|
| `science/background.webp` | 576×1024 scene (from source JPG) |
| `shared/start-gate.webp` | 1024×950 with alpha (black knockout) |
| `shared/review-gate.webp` | 1024×837 with alpha (black knockout) |

Source originals kept beside them as `*.source.*` — do not delete until WebP is verified in UI.

## Remaining to generate

See previous checklist for other subjects' background/foreground and shared clouds/chest.


## Folder layout

```text
public/images/lesson-path/
├── shared/
│   ├── start-gate.webp
│   ├── review-gate.webp
│   ├── reward-chest.webp
│   ├── cloud-01.webp
│   ├── cloud-02.webp
│   ├── sparkle-01.svg
│   └── sparkle-02.svg
├── science/
│   ├── background.webp
│   ├── foreground.webp
│   └── decorations/
├── mathematics/
│   ├── background.webp
│   ├── foreground.webp
│   └── decorations/
├── arabic/
├── english/
├── french/
├── social-studies/
└── religious-education/
```

## Required images (still to generate)

| File | Size (1x) | 2x | Notes |
|------|-----------|----|-------|
| `{subject}/background.webp` | 780×1600 | 1560×3200 | Soft vertical scene, no text/titles, edge-safe for crop |
| `{subject}/foreground.webp` | 780×420 | 1560×840 | Transparent PNG/WebP strip for bottom foliage/ground |
| `shared/start-gate.webp` | 160×160 | 320×320 | Transparent start marker |
| `shared/review-gate.webp` | 220×180 | 440×360 | Transparent review portal |
| `shared/reward-chest.webp` | 140×140 | 280×280 | Mid-path reward prop |
| `shared/cloud-01.webp` | 220×120 | 440×240 | Transparent cloud |
| `shared/cloud-02.webp` | 180×100 | 360×200 | Transparent cloud |
| `shared/sparkle-01.svg` | 64×64 | — | Vector sparkle |
| `shared/sparkle-02.svg` | 64×64 | — | Vector sparkle |

Subjects needing background + foreground: science, mathematics, arabic, english, french, social-studies, religious-education.

## Adding a subject theme

Edit `src/lib/config/lessonPathThemes.ts` only — no JSX changes.
