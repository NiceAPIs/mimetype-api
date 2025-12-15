# AGENTS.md

## Project Overview

REST API exposing Google Magika's file type detection capabilities using deep learning.

## Tech Stack

- Node.js >= 22 (LTS)
- Fastify 5 (web framework)
- Google Magika (file type detection)
- JavaScript ES Modules (no TypeScript)

## Project Structure

```
src/
├── index.js              # Entry point
├── app.js                # Fastify app builder
├── services/
│   ├── magika.js         # Magika singleton service
│   └── fetch.js          # Secure fetch with SSRF protection
└── routes/
    ├── index.js          # Routes aggregator
    ├── types.js          # GET /types
    ├── detect.js         # POST /detect
    ├── detect-url.js     # GET /detect-url
    ├── validate.js       # POST /validate
    ├── validate-url.js   # GET /validate-url
    └── health.js         # GET /health
tests/
├── helpers.js            # Test utilities and fixtures
├── fetch.test.js         # SSRF protection tests
└── routes/
    ├── health.test.js    # GET /health tests
    ├── types.test.js     # GET /types tests
    ├── detect.test.js    # POST /detect tests
    ├── detect-url.test.js # GET /detect-url tests
    ├── validate.test.js  # POST /validate tests
    ├── validate-url.test.js # GET /validate-url tests
    └── not-found.test.js # 404 handler tests
```

## Development

```bash
npm install     # Install dependencies
npm run dev     # Run in watch mode
npm start       # Run in production
npm test        # Run unit tests (node:test)
```

## API Endpoints

- `GET /types` - List supported file types
- `POST /detect` - Detect file type (binary body)
- `GET /detect-url?url=...` - Detect file type from URL
- `POST /validate?types=png,jpg` - Validate file type (binary body)
- `GET /validate-url?url=...&types=png,jpg` - Validate file type from URL
- `GET /health` - Health check
- `GET /docs` - OpenAPI documentation (Swagger UI)

## Code Conventions

- Vanilla JavaScript, no TypeScript
- ES Modules (`import`/`export`)
- Async/await for asynchronous code
- Fastify JSON schemas for validation and serialization
- Singleton pattern for Magika instance

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Listening host (default: 0.0.0.0)
- `MAX_FILE_SIZE` - Max file size in bytes (default: 10 MB)
- `FETCH_TIMEOUT` - Timeout for URL fetch in ms (default: 10000)

## Key Dependencies

- `fastify` - High-performance web framework
- `@fastify/swagger` - OpenAPI spec generation
- `@fastify/swagger-ui` - Swagger UI integration
- `magika` - Google's deep learning file type detection

## Testing

Unit tests use Node.js native test runner (`node:test`):

```bash
npm test        # Run all tests
```

Manual testing with curl:

```bash
curl http://localhost:3000/types
curl -X POST --data-binary @file.png http://localhost:3000/detect
curl -X POST --data-binary @file.png "http://localhost:3000/validate?types=png,jpeg"
curl "http://localhost:3000/detect-url?url=https://example.com/image.png"
curl "http://localhost:3000/validate-url?url=https://example.com/image.png&types=png,jpeg"
```

Note: Magika uses `jpeg` (not `jpg`) as the label for JPEG files.

## OpenAPI Documentation

- Swagger UI available at `/docs`
- OpenAPI 3.0 spec auto-generated from route schemas
- Endpoints grouped by tags: `detection`, `validation`, `info`

## Security

URL-based endpoints (`/detect-url`, `/validate-url`) include SSRF protection:
- Blocks private/internal IP ranges (127.x, 10.x, 192.168.x, etc.)
- Blocks cloud metadata endpoints (169.254.169.254)
- Blocks localhost and internal hostnames
- DNS resolution validation before fetch
- Timeout and size limits on downloads
