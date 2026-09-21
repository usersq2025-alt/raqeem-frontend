# Unit Learning Journey — local fixtures

Development only. Not a production seeder.

## Enable

Fixtures load only when `NODE_ENV === "development"` (default in `next dev`).
They are disabled in production builds.

## Routes (real path page)

| Case | URL |
|------|-----|
| 8 lessons, mid progress, review locked | `/ar/units/9101/path?fixture=progress&childId=9001` |
| 8 lessons all done, review available | `/ar/units/9102/path?fixture=complete&childId=9001` |
| 15 lessons mixed (tall map) | `/ar/units/9103/path?fixture=long&childId=9001` |
| English | `/en/units/9101/path?fixture=progress&childId=9001` |

Source: `src/lib/path/journeyFixtures.ts`
