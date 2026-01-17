# History vs Future - Interactive Display Booth

## Project Overview
An interactive kiosk PWA for Singapore schools where users answer 3 MCQs, take a photo, and receive an AI-generated image placing them in historical or futuristic Singapore scenes.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API routes + Cloudflare Workers
- **Storage**: Cloudflare R2
- **AI Services**: remove.bg (background removal), FAL.ai Flux Schnell (image generation)

## Project Structure
```
/interactive-display
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Welcome screen
│   │   ├── question/[id]/     # MCQ screens (1, 2, 3)
│   │   ├── camera/            # Photo capture
│   │   ├── loading/           # Generation progress
│   │   ├── result/            # Final image + QR code
│   │   └── api/generate/      # Image generation API route
│   ├── components/            # Reusable UI components
│   ├── context/               # React Context (QuizContext)
│   └── lib/                   # Utilities, prompts, questions
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
Create `.env.local` for development:
```
DEMO_MODE=true              # Skip API calls in dev
WORKER_URL=http://localhost:8787
```

For production worker, set secrets via wrangler:
```bash
wrangler secret put REMOVE_BG_KEY
wrangler secret put FAL_KEY
```

## User Flow
1. Welcome → Start button
2. Q1: Singapore aspect (4 options)
3. Q2: Singapore icon (4 options)
4. Q3: Past or Future (2 options)
5. Camera → Capture photo with countdown
6. Loading → Progress animation
7. Result → Generated image + QR code download

## Prompt Generation Logic
- Q3=A (past): Nostalgic Singapore (kampung, shophouses, sepia tones)
- Q3=B (future): Futuristic Singapore (cyberpunk, neon, flying vehicles)
- Q1 determines the scene theme
- Q2 adds landmark details to the prompt

## Key Features
- PWA with fullscreen kiosk mode
- Camera works on Android Chrome + iPad Safari
- Mobile-first responsive design
- Error handling with retry options
- Demo mode for testing without API keys
