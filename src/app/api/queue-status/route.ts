import { NextResponse } from 'next/server'

const WORKER_URL = process.env.WORKER_URL || 'https://interactive-display.eugene-ff3.workers.dev'

export async function GET() {
  try {
    const response = await fetch(`${WORKER_URL}/queue-status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to get queue status' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}
