'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

export default function ResultPage() {
  const router = useRouter()
  const { resultImageUrl, getTimePeriod, resetQuiz, photoData } = useQuiz()
  const [showContent, setShowContent] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const timePeriod = getTimePeriod()

  // Use the result image URL directly
  const displayImageUrl = resultImageUrl || photoData

  useEffect(() => {
    // If no result image and no photo, redirect to start
    if (!resultImageUrl && !photoData) {
      router.push('/')
      return
    }

    // Show content after a delay
    const timer = setTimeout(() => setShowContent(true), 500)
    return () => clearTimeout(timer)
  }, [resultImageUrl, photoData, router])

  const handleStartOver = () => {
    resetQuiz()
    router.push('/')
  }

  const handleDownload = async () => {
    if (!resultImageUrl) return

    try {
      // Open in new tab for download
      window.open(resultImageUrl, '_blank')
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  const downloadUrl = resultImageUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/download/demo`

  return (
    <div className="flex-1 flex flex-col page-transition overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Background decorations - subtle gold shimmer */}
      <div className={`fixed top-0 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none ${
        timePeriod === 'past' ? 'bg-gold' : 'bg-silver'
      }`} />
      <div className={`fixed bottom-1/4 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none ${
        timePeriod === 'past' ? 'bg-gold-light' : 'bg-silver-light'
      }`} />

      {/* Header */}
      <div className="relative z-10 p-4 md:p-5 text-center shrink-0">
        {/* Elegant status indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/20 bg-gold/5 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="text-gold/70 text-xs font-medium tracking-wider uppercase">Complete</span>
        </div>
        <h1 className={`font-display text-2xl md:text-3xl font-semibold mb-2 ${
          timePeriod === 'past' ? 'gradient-text-past' : 'gradient-text-future'
        }`}>
          {timePeriod === 'past' ? 'Your Singapore Heritage' : 'Your Singapore Future'}
        </h1>
        <p className="text-white/40 text-sm">
          {timePeriod === 'past'
            ? 'A glimpse into the warmth of kampung days'
            : 'Welcome to tomorrow\'s smart nation'}
        </p>
      </div>

      {/* Generated image */}
      <div className="relative z-10 flex items-center justify-center px-4 py-2 shrink-0">
        <div className="relative max-w-xs md:max-w-sm w-full">
          {/* Decorative frame corners - elegant gold/silver */}
          <div className={`absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 rounded-tl-lg ${
            timePeriod === 'past' ? 'border-gold/70' : 'border-silver/70'
          }`} />
          <div className={`absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 rounded-tr-lg ${
            timePeriod === 'past' ? 'border-gold/70' : 'border-silver/70'
          }`} />
          <div className={`absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 rounded-bl-lg ${
            timePeriod === 'past' ? 'border-gold/70' : 'border-silver/70'
          }`} />
          <div className={`absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 rounded-br-lg ${
            timePeriod === 'past' ? 'border-gold/70' : 'border-silver/70'
          }`} />

          {/* Image container */}
          <div className={`relative rounded-xl overflow-hidden ${
            timePeriod === 'past'
              ? 'shadow-2xl shadow-gold/30 ring-1 ring-gold/20'
              : 'shadow-2xl shadow-silver/30 ring-1 ring-silver/20'
          }`}>
            {displayImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImageUrl}
                  alt="Your Singapore moment"
                  className={`w-full h-auto max-h-[40vh] object-contain transition-opacity duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-white/10 border-t-gold rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-[3/4] bg-white/5 flex items-center justify-center">
                <p className="text-white/20">Image not available</p>
              </div>
            )}

            {/* Success badge - luxury gold */}
            {imageLoaded && (
              <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 ${
                timePeriod === 'past' ? 'bg-gold/90' : 'bg-silver/90'
              }`}>
                <svg className={`w-4 h-4 ${timePeriod === 'past' ? 'text-black' : 'text-black'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-black text-xs font-medium">AI Generated</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom section - luxury dark glass */}
      {showContent && (
        <div className="relative z-10 p-4 md:p-5 pb-6 glass-card rounded-t-3xl slide-up shrink-0 mt-auto border-t border-gold/10" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {/* QR Code and info */}
          <div className="flex items-center gap-5 mb-5 max-w-md mx-auto">
            <div className={`flex-shrink-0 p-2.5 rounded-xl ${
              timePeriod === 'past' ? 'bg-gold/10 ring-1 ring-gold/20' : 'bg-silver/10 ring-1 ring-silver/20'
            }`}>
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG
                  value={downloadUrl}
                  size={80}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg className={`w-5 h-5 ${timePeriod === 'past' ? 'text-gold' : 'text-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-white/90 font-medium">Scan to Download</p>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                Scan the QR code with your phone camera to save your Singapore moment
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={handleStartOver}
              className="btn-press flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10 hover:text-white hover:border-gold/30 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Over
            </button>
            <button
              onClick={handleDownload}
              className={`btn-glow btn-press flex-1 py-3.5 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all ${
                timePeriod === 'past'
                  ? 'bg-gold text-black shadow-gold/30 hover:bg-gold-light'
                  : 'bg-silver text-black shadow-silver/30 hover:bg-silver-light'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>

          {/* Footer text */}
          <p className="text-center text-white/20 text-xs mt-4 tracking-wide">
            Powered by AI • Made with love in Singapore
          </p>
        </div>
      )}

      {/* Loading placeholder */}
      {!showContent && (
        <div className="relative z-10 p-4 md:p-5 glass-card rounded-t-3xl shrink-0 mt-auto">
          <div className="flex items-center gap-5 mb-5 max-w-md mx-auto">
            <div className="w-[104px] h-[104px] bg-white/10 rounded-xl shimmer" />
            <div className="flex-1">
              <div className="w-32 h-5 bg-white/10 rounded mb-2 shimmer" />
              <div className="w-full h-4 bg-white/10 rounded shimmer" />
              <div className="w-2/3 h-4 bg-white/10 rounded mt-1 shimmer" />
            </div>
          </div>
          <div className="flex gap-3 max-w-md mx-auto">
            <div className="flex-1 h-12 bg-white/10 rounded-xl shimmer" />
            <div className="flex-1 h-12 bg-white/10 rounded-xl shimmer" />
          </div>
        </div>
      )}
    </div>
  )
}
