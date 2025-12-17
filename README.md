# Mimetype API

A modern REST API for file type detection powered by [Google Magika](https://github.com/google/magika) - a deep learning model achieving >99% accuracy across 350+ file types.

## Features

- **File Type Detection** - Identify file types from binary content or URLs
- **File Type Validation** - Verify files match expected type(s)
- **SSRF Protection** - Secure URL fetching with comprehensive IP/hostname blocking
- **OpenAPI Documentation** - Interactive Swagger UI at `/docs`

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or run in development mode with watch
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Detection

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/detect` | POST | Detect file type from binary content |
| `/detect-url?url=<url>` | GET | Detect file type from a URL |

### Validation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/validate?types=<types>` | POST | Validate binary content matches expected types |
| `/validate-url?url=<url>&types=<types>` | GET | Validate URL content matches expected types |

### Information

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/types` | GET | List all supported file types |
| `/health` | GET | Health check |
| `/docs` | GET | Interactive API documentation |

## Usage Examples

### Detect file type

```bash
curl -X POST http://localhost:3000/detect \
  -H "Content-Type: application/octet-stream" \
  --data-binary @image.png
```

Response:
```json
{
  "type": "png",
  "isText": false,
  "confidence": 0.99,
  "details": {
    "dlPrediction": "png",
    "overwriteReason": null
  }
}
```

### Detect from URL

```bash
curl "http://localhost:3000/detect-url?url=https://example.com/image.png"
```

### Validate file type

```bash
curl -X POST "http://localhost:3000/validate?types=png,jpeg,gif" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @image.png
```

Response:
```json
{
  "valid": true,
  "detectedType": "png",
  "expectedTypes": ["png", "jpeg", "gif"],
  "confidence": 0.99
}
```

### List supported types

```bash
curl http://localhost:3000/types
```

Response:
```json
{
  "count": 353,
  "types": [
    { "label": "png", "isText": false },
    { "label": "javascript", "isText": true }
  ]
}
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |

## Tech Stack

- **[Fastify](https://fastify.dev/)** - High-performance web framework
- **[Magika](https://github.com/google/magika)** - Google's deep learning file type detection
- **Node.js >= 22.0.0** - Runtime environment

## Testing

```bash
npm test
```

## License

MIT
