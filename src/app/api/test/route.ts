import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Test fetch to the worker
    const workerResponse = await fetch('https://riversidesec.eugene-ff3.workers.dev/health')
    const workerStatus = await workerResponse.json()

    return NextResponse.json({
      received: body,
      workerStatus,
      timestamp: Date.now()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
