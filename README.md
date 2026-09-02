# Pluma

Pluma is a MERN reading, writing, and reader-community platform. It combines multi-book authoring, a persistent planning board and visual story canvas, a Story Bible, AI-assisted drafting and continuity tools, immersive reading, a real-book catalog, hybrid recommendations, direct messages, notifications, posts, and topic/fan-club channels.

## What is included

- Multiple private writing projects with autosave, explicit publishing, per-book Kanban plans, and per-book canvas state.
- LangChain-powered BYOK AI for OpenAI, Anthropic, and Gemini. Stored keys are encrypted with AES-256-GCM and are never returned in API responses.
- Story Bible entities for characters, locations, factions, items, snippets, and world rules; continuity audit, character chat, beta readers, relationship web, show-don't-tell review, focus mode, timeline branching, and scene weaving.
- Public-domain and bibliographic discovery through Open Library, with a curated Project Gutenberg fallback. External books are saved as snapshots in the user's library; copyrighted text is not copied into Pluma.
- A two-stage-style, zero-cost hybrid recommender combining implicit user preferences, collaborative co-library signals, quality/popularity, novelty, negative feedback, and diversity reranking.
- Full-screen, chapter-oriented reader with durable progress, typography controls, keyboard navigation, and safe rich-text rendering.
- Social feed, likes, comments, follows, notifications, direct messages, book/topic groups, and discussion channels.
- Light, dark, and system themes.

## Architecture

```text
React client
    |
Express API --- MongoDB (required system of record)
    |  |
    |  +--- Open Library (cached, low-volume metadata discovery)
    |
    +--- Gemini / OpenAI / Anthropic (optional BYOK AI)
    +--- Redis (optional distributed cache/rate limits)
    +--- Kafka + Python/Milvus service (optional high-scale semantic pipeline)
```

The core application requires only MongoDB. Redis, Kafka, Milvus, and the Python service are optional; the API has local cache/rate-limit fallbacks and the main recommendation endpoint runs directly in Node. This keeps local and small deployments free while leaving a scale-out path.

## Local setup

Prerequisites: Node.js 20.19+ (or 22.12+), npm, and MongoDB. Copy the example environment files first:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item client/.env.example client/.env
```

Install and run the API:

```powershell
Set-Location backend
npm install
npm run dev
```

In another terminal, run the client:

```powershell
Set-Location client
npm install
npm start
```

Open `http://localhost:3000`. The API exposes liveness and dependency-aware readiness checks at `http://localhost:5000/health/live` and `http://localhost:5000/health/ready`.

## AI setup and cost boundaries

AI is optional. Users can save their own provider key under **Settings > AI Models**, select models by task, and test the configuration. A server-level provider key can be supplied as a fallback. `AI_KEYS_ENCRYPTION_SECRET` should be a separate high-entropy production secret; if omitted, `JWT_SECRET` is used as the encryption root.

A ChatGPT, Codex, or Google consumer subscription is not an API credential and is not read by this app. Provider API quotas and billing are separate. Gemini's developer API may offer a free tier subject to Google's current limits; Pluma also works without AI keys.

## Real-book catalog policy

The live catalog proxy sends an identifying user agent, limits requested fields, caches results, times out upstream calls, and falls back to a curated public-domain collection. Open Library explicitly describes its APIs as low-volume, human-facing services; a high-traffic deployment should ingest its monthly data dumps into a local search index instead of increasing live API traffic. Project Gutenberg links are used for public-domain reading where available.

## Optional infrastructure

Start Redis only:

```powershell
docker compose up -d redis
```

Start Kafka for event streaming:

```powershell
docker compose --profile streaming up -d
```

Start Milvus and its dependencies for the optional semantic service:

```powershell
docker compose --profile semantic up -d
```

The Python service's base dependencies are in `ml_service/requirements.txt`; Kafka and Milvus adapters are separated into `ml_service/requirements-optional.txt`.

## Production checklist

- Use HTTPS behind a reverse proxy and set `CLIENT_URLS` to exact allowed origins.
- Store `JWT_SECRET`, `AI_KEYS_ENCRYPTION_SECRET`, database credentials, and provider keys in a secret manager; never commit `.env` files.
- Run MongoDB with authentication, automated backups, and replica-set/high-availability settings appropriate for traffic.
- Use Redis when running multiple API instances so rate limits and cache state are shared.
- Ingest Open Library dumps into a local index before operating the catalog at high traffic.
- Add centralized logs, metrics, error reporting, uptime checks, and restore drills before a public launch.
- Put uploads behind object storage/CDN when user-uploaded media is introduced.

## Verification

```powershell
# Frontend production build
Set-Location client
npm run build

# Backend JavaScript syntax
Set-Location ..
$files = rg --files backend/src -g '*.js'
$files | ForEach-Object { node --check $_ }

# Optional Python service syntax
python -m py_compile ml_service/main.py ml_service/embeddings.py ml_service/milvus_client.py
```

The current implementation has also been exercised end-to-end against MongoDB for registration/authentication, multi-project persistence and ownership, planning and canvas persistence, publishing, library items, reading progress, catalog search, recommendations, social posting, messaging authorization, notifications, BYOK encryption/masking, and a live Gemini configuration check.
