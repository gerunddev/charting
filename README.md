# Charting

Charts for musicians: Nashville notation as the base layer, with tab/notation
inserts and annotations layered over a measure grid. Charts are stored
key-independently, so transposition is a rendering choice — never a mutation.

## Quick start (local)

```bash
npm install
npm run db:up     # DynamoDB Local in Docker (port 8000)
npm run seed      # create table + demo user + a published sample chart
npm run dev       # http://localhost:3000
```

Demo login: `demo@example.com` / `demo1234`

## What's here

- **Public catalog** (`/`) — search published charts by title/author/tag, no account needed
- **Public chart view** (`/chart/[id]`) — shareable; signed-in users can copy to their catalog
- **My charts** (`/me`) — private catalog, organized by tags; publish/unpublish/delete
- **Editor** (`/me/edit/[id]`) — Nashville shorthand per section (`1 | 5 | 6m 4 | 1`),
  tags, inserts/annotations (JSON for now), live preview

## Architecture

- **Next.js (App Router, TypeScript)** — server-rendered public pages + client editor
- **DynamoDB Local** via Docker — single-table design (`lib/repo.ts`); on AWS this is the
  same code pointed at real DynamoDB (env vars in `.env.example`)
- **Auth** — local email/password sessions (`lib/auth.ts`) as a stand-in; the app only
  ever calls `currentUser()`, so swapping to Cognito/Clerk later touches one file
- **Chart model** (`lib/types.ts`) — key-independent chords (scale degrees), sections,
  measure grid, sparse inserts + annotations; `lib/music.ts` renders any key from it

### Table layout

| PK          | SK          | item                              |
| ----------- | ----------- | --------------------------------- |
| `USER#<id>` | `PROFILE`   | user (GSI1: `EMAIL#<email>`)      |
| `USER#<id>` | `CHART#<id>`| private chart record              |
| `PUB`       | `CHART#<id>`| published snapshot (public catalog) |

Publishing copies the doc, so private edits don't change the public version
until you republish.
