import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Worker URL from environment variable
const WORKER_URL = 'https://interactive-display.eugene-ff3.workers.dev'
const WORKER_API_KEY = process.env.WORKER_API_KEY || '5CSVqaHCxtWPL1PSEbMlMbI3AVeZmQh5'

/**
 * Warm-up endpoint - triggers a minimal FAL.ai request to reduce cold starts
 * Called from the welcome page when users first arrive
 * By the time they complete the quiz (~90-120s), the model will be warm
 */
export async function POST() {
  try {
    const res = await fetch(`${WORKER_URL}/warm-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WORKER_API_KEY && { 'X-API-Key': WORKER_API_KEY }),
      },
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Warm-up API error:', error)
    // Silent failure - warm-up is best-effort
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
