# History vs Future - Interactive Display Booth

## Project Overview
An interactive kiosk PWA for Singapore schools where users answer 3 MCQs, take a photo, and receive an AI-generated image placing them in historical, present-day, or futuristic Singapore scenes.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API routes + Cloudflare Workers
- **Storage**: Cloudflare R2
- **AI Services**:
  - FAL.ai PuLID FLUX (face-preserving image generation, ~91% accuracy)
  - AWS Rekognition (gender & glasses detection)

## Project Structure
```
/interactive-display1
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Welcome screen
│   │   ├── question/[id]/     # MCQ screens (1, 2, 3)
│   │   ├── camera/            # Photo capture
│   │   ├── loading/           # Generation progress + trivia quiz
│   │   ├── result/            # Final image + QR code
│   │   └── api/generate/      # Image generation API route
│   ├── components/            # Reusable UI components
│   ├── context/               # React Context (QuizContext)
│   └── lib/                   # Utilities, prompts, questions, trivia
├── worker/                    # Cloudflare Worker code
│   ├── index.ts              # Image generation pipeline
│   └── wrangler.toml         # Worker config
├── public/                   # Static assets, PWA manifest
├── next.config.js           # Next.js configuration
└── wrangler.toml            # Root Cloudflare config
```

## Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server

# Worker commands (from worker/ directory)
wrangler dev     # Start worker locally
wrangler deploy  # Deploy to Cloudflare
```

## Environment Variables

### Next.js App (`.env.local`)
```
WORKER_URL=https://riversidesec.eugene-ff3.workers.dev
WORKER_API_KEY=<your-api-key>    # Must match worker's API_KEY secret
```

### Cloudflare Worker (set via `wrangler secret put`)
```bash
wrangler secret put FAL_KEY              # FAL.ai API key
wrangler secret put AWS_ACCESS_KEY_ID    # AWS credentials for Rekognition
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put API_KEY              # API key for authenticating frontend requests
```

### Worker Environment Variables (`wrangler.toml`)
```
PUBLIC_URL        # Worker's public URL for image serving
AWS_REGION        # AWS region for Rekognition (e.g., ap-southeast-1)
ALLOWED_ORIGINS   # Comma-separated CORS origins
```

## User Flow
1. Welcome → Start button
2. Q1: Singapore aspect (4 options: Community, Culture, Innovation, Nature)
3. Q2: Singapore icon (4 options: Library, Merlion, Marina Bay, Changi)
4. Q3: Time period (3 options: Past, Present, Future)
5. Camera → Capture photo with countdown
6. Loading → Progress animation + Singapore trivia quiz
7. Result → Generated image + QR code download

## Image Generation Pipeline
The worker performs these steps:
1. **Upload photo to R2** + **Detect face attributes** (parallel)
   - AWS Rekognition detects gender and glasses
2. **Generate image with PuLID FLUX**
   - Preserves user's face identity (~91% accuracy)
   - Adds glasses to prompt if detected
   - Gender-appropriate clothing descriptions
3. **Fetch and store final image** in R2
4. Return public URL

## Prompt Generation Logic
- **Q3=A (Past)**: Nostalgic Singapore (kampung, shophouses, sepia tones)
- **Q3=B (Present)**: Modern Singapore (HDB, Marina Bay, vibrant colors)
- **Q3=C (Future)**: Futuristic Singapore (cyberpunk, neon, flying vehicles)
- Q1 determines the scene theme
- Q2 adds landmark details to the prompt

## Security Features
The application includes comprehensive security hardening:

### API Security
- **API key authentication** - Worker endpoints require `X-API-Key` header
- **Rate limiting** - 5 requests/minute per IP
- **Input validation** - Max 5MB photo size, quiz answer whitelist
- **CORS restrictions** - Only configured origins allowed (not wildcard)

### Protection Against Attacks
- **Path traversal protection** - R2 paths validated against whitelist
- **SSRF protection** - Private IPs blocked in `/test-gender` endpoint
- **Size limits** - Validates Content-Length before processing

### Security Headers
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Privacy
- Uploaded photos use `no-store` cache (kiosk privacy)
- Prompts not stored in R2 metadata
- Error details hidden from clients

## Key Features
- PWA with fullscreen kiosk mode
- Camera works on Android Chrome + iPad Safari
- Mobile-first responsive design
- Error handling with retry options
- Interactive trivia quiz during image generation
- Glasses detection for better face preservation
- School-appropriate content filtering (safety checker + negative prompts)

## Deployment
- **Frontend**: Cloudflare Pages (auto-deploys on push to main)
- **Worker**: Deploy manually with `wrangler deploy` or via GitHub Actions
