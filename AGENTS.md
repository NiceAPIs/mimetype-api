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
├── index.js              # Entry point, Fastify setup
├── services/
│   └── magika.js         # Magika singleton service
└── routes/
    ├── index.js          # Routes aggregator
    ├── types.js          # GET /types
    ├── detect.js         # POST /detect
    ├── validate.js       # POST /validate
    └── health.js         # GET /health
```

## Development

```bash
npm install     # Install dependencies
npm run dev     # Run in watch mode
npm start       # Run in production
```

## API Endpoints

- `GET /types` - List supported file types
- `POST /detect` - Detect file type (binary body)
- `POST /validate?types=png,jpg` - Validate file type (binary body)
- `GET /health` - Health check

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

## Key Dependencies

- `fastify` - High-performance web framework
- `magika` - Google's deep learning file type detection

## Testing

```bash
curl http://localhost:3000/types
curl -X POST --data-binary @file.png http://localhost:3000/detect
curl -X POST --data-binary @file.png "http://localhost:3000/validate?types=png,jpg"
```
