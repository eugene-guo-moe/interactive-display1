import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#050505] px-4">
      <h1 className="font-display text-6xl font-bold text-white/80 mb-2">404</h1>
      <p className="text-white/50 text-lg mb-8">Page not found</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-all flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Back to Home
      </Link>
    </div>
  )
}
