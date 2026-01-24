'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useQuiz, ProfileType } from '@/context/QuizContext'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { toPng } from 'html-to-image'

// Profile styling configuration
const profileStyles: Record<ProfileType, { image: string; color: string }> = {
  guardian: {
    image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1920&q=80',
    color: '#F59E0B', // Amber
  },
  builder: {
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80',
    color: '#10B981', // Emerald
  },
  shaper: {
    image: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
    color: '#6366F1', // Indigo
  },
  'guardian-builder': {
    image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1920&q=80',
    color: '#F59E0B', // Amber
  },
  'builder-shaper': {
    image: 'https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=1920&q=80',
    color: '#14B8A6', // Teal
  },
  'adaptive-guardian': {
    image: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
    color: '#8B5CF6', // Violet
  },
}

// Worker URL for R2 upload
const WORKER_URL = 'https://riversidesec.eugene-ff3.workers.dev'

type CardStatus = 'generating' | 'uploading' | 'ready' | 'error'

// Test mode profiles for testing different profile types
const testProfiles: Record<string, ProfileType> = {
  guardian: 'guardian',
  builder: 'builder',
  shaper: 'shaper',
  'guardian-builder': 'guardian-builder',
  'builder-shaper': 'builder-shaper',
  'adaptive-guardian': 'adaptive-guardian',
}

function ResultPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resultImageUrl, qrUrl, setQrUrl, r2Path, getProfile, getProfileType, resetQuiz, photoData, hydrated } = useQuiz()
  const [showContent, setShowContent] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cardStatus, setCardStatus] = useState<CardStatus>('generating')
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [iconBase64, setIconBase64] = useState<string | null>(null)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [canShare, setCanShare] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasStartedCardGeneration = useRef(false)

  // Test mode: allow passing image URL and profile via query params
  // Usage: /result?testImage=https://...&testProfile=builder
  const testImage = searchParams.get('testImage')
  const testProfile = searchParams.get('testProfile') as ProfileType | null
  const isTestMode = !!testImage

  const profile = isTestMode && testProfile && testProfiles[testProfile]
    ? require('@/types/quiz').profiles[testProfile]
    : getProfile()
  const profileType = isTestMode && testProfile && testProfiles[testProfile]
    ? testProfile
    : getProfileType()
  const currentStyle = profileStyles[profileType] || profileStyles.builder

  // Use FAL.ai URL for display (fast CDN), or test image in test mode
  const displayImageUrl = isTestMode ? testImage : (resultImageUrl || photoData)

  // QR code shows card view page (with save button) when ready, otherwise placeholder
  const qrValue = cardUrl
    ? cardUrl.replace('/cards/', '/view/cards/')
    : 'https://riversidesec.pages.dev'

  // Detect Web Share API support (mobile save-to-gallery)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare)
  }, [])

  useEffect(() => {
    // Skip redirect in test mode
    if (isTestMode) {
      const timer = setTimeout(() => setShowContent(true), 500)
      return () => clearTimeout(timer)
    }

    // Wait for sessionStorage restoration before deciding to redirect
    if (!hydrated) return

    // If no result image and no photo, redirect to start
    if (!resultImageUrl && !photoData) {
      router.push('/')
      return
    }

    // Show content after a delay
    const timer = setTimeout(() => setShowContent(true), 500)
    return () => clearTimeout(timer)
  }, [resultImageUrl, photoData, router, isTestMode, hydrated])

  // Convert image URL to base64 to avoid CORS issues with html-to-image
  const convertImageToBase64 = useCallback(async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'))
      }, 15000) // 15 second timeout

      img.onload = () => {
        clearTimeout(timeout)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png')
          console.log('Image converted to base64 successfully, size:', Math.round(dataUrl.length / 1024), 'KB')
          resolve(dataUrl)
        } catch (err) {
          console.error('Canvas conversion error:', err)
          reject(err)
        }
      }
      img.onerror = (e) => {
        clearTimeout(timeout)
        console.error('Image load error for URL:', url, e)
        reject(new Error('Failed to load image: ' + url))
      }
      img.src = url
    })
  }, [])

  // Generate card and upload to R2 when image is loaded
  const generateAndUploadCard = useCallback(async () => {
    console.log('generateAndUploadCard called', {
      hasCardRef: !!cardRef.current,
      displayImageUrl: displayImageUrl?.substring(0, 50) + '...',
      hasStarted: hasStartedCardGeneration.current
    })

    if (!cardRef.current || !displayImageUrl || hasStartedCardGeneration.current) return
    hasStartedCardGeneration.current = true

    setCardStatus('generating')
    console.log('Card generation started')

    try {
      // Upload FAL.ai image to R2 first so we can use same-origin URL for canvas
      let imageUrlForCard = displayImageUrl
      if (resultImageUrl && r2Path && (resultImageUrl.includes('fal.media') || resultImageUrl.includes('fal.ai'))) {
        console.log('Uploading FAL.ai image to R2 for CORS-safe card generation...')
        try {
          const timePeriod = r2Path.split('/')[1] || 'present' // e.g. "generated/past/123.jpg" → "past"
          const uploadRes = await fetch(`${WORKER_URL}/upload-to-r2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ falUrl: resultImageUrl, r2Path, timePeriod }),
          })
          if (uploadRes.ok) {
            const data = await uploadRes.json()
            imageUrlForCard = data.r2Url
            console.log('R2 upload done, using:', imageUrlForCard)
          }
        } catch (e) {
          console.warn('R2 upload failed, falling back to FAL URL:', e)
        }
      }

      // Convert all images to base64 to avoid html-to-image loading issues
      let base64Img = imageBase64
      if (!base64Img && imageUrlForCard && !imageUrlForCard.startsWith('data:')) {
        console.log('Converting image to base64...')
        try {
          base64Img = await convertImageToBase64(imageUrlForCard)
          setImageBase64(base64Img)
          console.log('Base64 conversion successful')
        } catch (convErr) {
          console.warn('Could not convert image to base64:', convErr)
        }
      }

      // Convert icon and logo to base64 for reliable card rendering
      if (!iconBase64 && profile.icon) {
        try {
          const iconB64 = await convertImageToBase64(profile.icon)
          setIconBase64(iconB64)
        } catch (e) { console.warn('Icon base64 failed:', e) }
      }
      if (!logoBase64) {
        try {
          const logoB64 = await convertImageToBase64('/school-logo.png')
          setLogoBase64(logoB64)
        } catch (e) { console.warn('Logo base64 failed:', e) }
      }

      // Wait for React to re-render with base64 state
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Generate base card image - skip fonts to avoid CSP blocking external font fetch
      const baseCardDataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        backgroundColor: '#0a0a0a',
      })

      console.log('Card generated successfully')
      setCardDataUrl(baseCardDataUrl)
      setCardStatus('uploading')

      // Extract base64 data for upload
      const base64Data = baseCardDataUrl.split(',')[1]
      const cardPath = `cards/${profileType}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`

      // Upload to R2 via worker
      const uploadResponse = await fetch(`${WORKER_URL}/upload-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardData: base64Data,
          cardPath: cardPath,
          profileType: profileType,
        }),
      })

      if (uploadResponse.ok) {
        const data = await uploadResponse.json()
        setCardUrl(data.cardUrl)
        setQrUrl(data.cardUrl)
        setCardStatus('ready')
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      console.error('Card generation error:', err)
      // Log more details
      if (err instanceof Error) {
        console.error('Error name:', err.name)
        console.error('Error message:', err.message)
        console.error('Error stack:', err.stack)
      }
      setCardStatus('error')
    }
  }, [displayImageUrl, resultImageUrl, r2Path, profileType, setQrUrl, imageBase64, iconBase64, logoBase64, convertImageToBase64, currentStyle, profile])

  // Start card generation when image is loaded
  useEffect(() => {
    if (imageLoaded && displayImageUrl) {
      generateAndUploadCard()
    }
  }, [imageLoaded, displayImageUrl, generateAndUploadCard])

  const handleStartOver = () => {
    router.push('/')
    resetQuiz()
  }

  const handleDownload = async () => {
    const fileName = `riverside-${profileType}-${Date.now()}.png`

    // Try Web Share API first (mobile - opens native share sheet with "Save Image")
    if (navigator.share && cardDataUrl) {
      try {
        const response = await fetch(cardDataUrl)
        const blob = await response.blob()
        const file = new File([blob], fileName, { type: 'image/png' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] })
          return
        }
      } catch (err) {
        // User cancelled share or share failed - fall through to download
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    // Fallback: direct download
    if (cardDataUrl) {
      const link = document.createElement('a')
      link.download = fileName
      link.href = cardDataUrl
      link.click()
    } else if (cardUrl) {
      window.open(cardUrl, '_blank')
    }
  }

  const handleRetryCard = () => {
    hasStartedCardGeneration.current = false
    setCardStatus('generating')
    generateAndUploadCard()
  }

  // Render QR section based on card status
  const renderQRSection = () => {
    if (cardStatus === 'generating' || cardStatus === 'uploading') {
      return (
        <div className="flex items-center gap-4 mb-3 max-w-md mx-auto md:mx-0 w-full">
          <div
            className="flex-shrink-0 p-2.5 rounded-xl"
            style={{
              backgroundColor: `${currentStyle.color}15`,
              outline: `1px solid ${currentStyle.color}25`
            }}
          >
            <div className="bg-white/10 p-2 rounded-lg w-[96px] h-[96px] flex items-center justify-center">
              <div
                className="w-8 h-8 border-2 border-white/20 rounded-full animate-spin"
                style={{ borderTopColor: currentStyle.color }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg style={{ color: currentStyle.color }} className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-white/90 font-medium">
                {cardStatus === 'generating' ? 'Creating your card...' : 'Uploading...'}
              </p>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Please wait while we prepare your shareable card
            </p>
          </div>
        </div>
      )
    }

    if (cardStatus === 'error') {
      return (
        <div className="flex items-center gap-4 mb-3 max-w-md mx-auto md:mx-0 w-full">
          <div
            className="flex-shrink-0 p-2.5 rounded-xl"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              outline: '1px solid rgba(239, 68, 68, 0.25)'
            }}
          >
            <div className="bg-white/10 p-2 rounded-lg w-[96px] h-[96px] flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-white/90 font-medium mb-1">Card generation failed</p>
            <button
              onClick={handleRetryCard}
              className="text-sm font-medium hover:underline"
              style={{ color: currentStyle.color }}
            >
              Tap to try again
            </button>
          </div>
        </div>
      )
    }

    // Card is ready
    return (
      <div className="flex items-center gap-4 mb-3 max-w-md mx-auto md:mx-0 w-full">
        <div
          className="flex-shrink-0 p-2.5 rounded-xl"
          style={{
            backgroundColor: `${currentStyle.color}15`,
            outline: `1px solid ${currentStyle.color}25`
          }}
        >
          <div className="bg-white p-2 md:p-3 rounded-lg">
            <QRCodeSVG
              value={qrValue}
              size={80}
              level="M"
              includeMargin={false}
              className="w-[80px] h-[80px] md:w-[120px] md:h-[120px]"
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <svg style={{ color: currentStyle.color }} className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-white/90 font-medium">Scan to Download</p>
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            Scan the QR code with your phone camera to save your card
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col page-transition overflow-hidden" style={{ backgroundColor: '#050505' }}>
      {/* Background - generated image, heavily blurred */}
      {displayImageUrl && (
        <div
          className="fixed inset-[-10%] bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url(${displayImageUrl})`,
            filter: 'blur(40px)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      {/* Fallback to profile image if no generated image */}
      {!displayImageUrl && (
        <div
          className="fixed inset-[-5%] bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${currentStyle.image})` }}
        />
      )}
      {/* Dark overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      />
      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${currentStyle.color}25 0%, transparent 60%)`
        }}
      />
      {/* Vignette effect */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* Two-column layout on desktop, single column on mobile */}
      <div className="relative z-10 flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden max-w-6xl mx-auto w-full">

        {/* Left column: Image (+ header on mobile) */}
        <div className="flex-1 min-h-0 flex flex-col md:w-[58%] md:flex-none">

          {/* School logo - mobile only */}
          <div className="md:hidden flex justify-center pt-2 px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/school-logo.png" alt="Riverside Secondary School" className="h-8 sm:h-9 object-contain" />
          </div>

          {/* Profile Header - mobile only */}
          <div className="md:hidden px-4 pt-2 pb-1 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.icon} alt="" className="w-10 h-10 sm:w-12 sm:h-12 mb-1 mx-auto block object-contain" />
            <h1
              className="font-display text-xl sm:text-2xl font-semibold mb-1"
              style={{
                color: currentStyle.color,
                textShadow: `0 0 40px ${currentStyle.color}40`
              }}
            >
              {profile.title}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm max-w-md mx-auto italic">
              &ldquo;{profile.tagline}&rdquo;
            </p>
          </div>

          {/* Generated image */}
          <div className="flex items-center justify-center px-3 md:px-8 py-1 md:py-6 flex-1 min-h-0">
            <div className="relative w-[85vw] max-w-sm md:w-full md:max-w-[480px] h-full max-h-full">
              {/* Decorative frame corners */}
          <div
            className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 rounded-tl-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />
          <div
            className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 rounded-tr-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />
          <div
            className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 rounded-bl-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 rounded-br-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />

          {/* Image container */}
          <div
            className="relative rounded-xl overflow-hidden shadow-2xl h-full"
            style={{
              boxShadow: `0 25px 50px -12px ${currentStyle.color}40`,
              outline: `1px solid ${currentStyle.color}30`
            }}
          >
            {displayImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImageUrl}
                  alt="Your Singapore moment"
                  className={`w-full h-full object-contain md:object-cover transition-opacity duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                    <div
                      className="w-10 h-10 border-2 border-white/10 rounded-full animate-spin"
                      style={{ borderTopColor: currentStyle.color }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-[3/4] bg-white/5 flex items-center justify-center">
                <p className="text-white/20">Image not available</p>
              </div>
            )}

            {/* Success badge */}
            {imageLoaded && (
              <div
                className="absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5"
                style={{ backgroundColor: `${currentStyle.color}E6` }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-white text-xs font-medium">AI Generated</span>
              </div>
            )}
          </div>
        </div>
      </div>

          {/* Profile Description - mobile only */}
          {showContent && (
            <div className="md:hidden px-4 pt-2 text-center max-w-md mx-auto">
              <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-1">
                {profile.description}
              </p>
              <p className="text-xs sm:text-sm font-medium" style={{ color: currentStyle.color }}>
                Your strength: {profile.strength}
              </p>
            </div>
          )}
        </div>

        {/* Right column: Profile info + QR + buttons (desktop) / Bottom section (mobile) */}
        <div className="md:w-[42%] md:flex md:flex-col md:justify-center md:items-start md:pl-8 md:pr-6 md:py-6 shrink-0 md:shrink md:min-h-0">

          {/* Desktop glass card wrapper */}
          <div className="hidden md:block w-full bg-white/[0.04] backdrop-blur-md rounded-2xl p-6 border border-white/[0.08]">

          {/* School logo - desktop only */}
          <div className="hidden md:flex md:justify-center mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/school-logo.png" alt="Riverside Secondary School" className="h-10 object-contain" />
          </div>

          {/* Profile Header - desktop only */}
          <div className="hidden md:block mb-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.icon} alt="" className="w-14 h-14 mb-3 mx-auto block object-contain" />
            <h1
              className="font-display text-3xl font-semibold mb-2"
              style={{
                color: currentStyle.color,
                textShadow: `0 0 40px ${currentStyle.color}40`
              }}
            >
              {profile.title}
            </h1>
            <p className="text-white/70 text-base italic">
              &ldquo;{profile.tagline}&rdquo;
            </p>
          </div>

          {/* Profile Description - desktop only */}
          {showContent && (
            <div className="hidden md:block mb-5 max-w-md text-center mx-auto">
              <p className="text-white/60 text-sm leading-relaxed mb-2">
                {profile.description}
              </p>
              <p className="text-sm font-medium" style={{ color: currentStyle.color }}>
                Your strength: {profile.strength}
              </p>
            </div>
          )}

          {/* Desktop QR + buttons inside glass card */}
          {showContent && (
            <div className="hidden md:block mt-5 pt-5 border-t border-white/[0.08]">
              {renderQRSection()}
              <div className="flex gap-3 max-w-md w-full">
                <button
                  onClick={handleStartOver}
                  className="btn-press flex-1 py-3.5 rounded-full bg-white/10 border border-white/20 text-white/70 font-medium hover:bg-white/15 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Over
                </button>
                <button
                  onClick={handleDownload}
                  disabled={cardStatus !== 'ready' && cardStatus !== 'error'}
                  className="btn-press flex-1 py-3.5 rounded-full bg-white/95 hover:bg-white text-[#1e3a5f] font-semibold shadow-2xl shadow-white/20 hover:shadow-white/40 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {cardStatus === 'generating' || cardStatus === 'uploading' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#1e3a5f]/30 border-t-[#1e3a5f] rounded-full animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {canShare ? 'Save' : 'Download'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-white/30 text-xs mt-3 tracking-wide text-center">
                Powered by AI • Made with love in Singapore
              </p>
            </div>
          )}

          {/* Desktop loading placeholder inside glass card */}
          {!showContent && (
            <div className="hidden md:block mt-5 pt-5 border-t border-white/[0.08]">
              <div className="flex items-center gap-4 mb-3 max-w-md w-full">
                <div className="w-[96px] h-[96px] bg-white/10 rounded-xl shimmer" />
                <div className="flex-1">
                  <div className="w-32 h-5 bg-white/10 rounded mb-2 shimmer" />
                  <div className="w-full h-4 bg-white/10 rounded shimmer" />
                  <div className="w-2/3 h-4 bg-white/10 rounded mt-1 shimmer" />
                </div>
              </div>
              <div className="flex gap-3 max-w-md">
                <div className="flex-1 h-12 bg-white/10 rounded-xl shimmer" />
                <div className="flex-1 h-12 bg-white/10 rounded-xl shimmer" />
              </div>
            </div>
          )}

          </div>{/* End desktop glass card */}

          {/* Mobile bottom section with QR + buttons */}
          {showContent && (
            <div className="md:hidden pt-3 px-4 pb-4 rounded-t-3xl slide-up mt-auto backdrop-blur-sm bg-black/40 border-t" style={{ borderColor: `${currentStyle.color}15`, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-3 max-w-md mx-auto w-full">
                <button
                  onClick={handleStartOver}
                  className="btn-press flex-1 py-3.5 rounded-full bg-white/10 border border-white/20 text-white/70 font-medium hover:bg-white/15 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Over
                </button>
                <button
                  onClick={() => window.open(qrValue, '_blank')}
                  disabled={cardStatus !== 'ready'}
                  className="btn-press flex-1 py-3.5 rounded-full bg-white/95 hover:bg-white text-[#1e3a5f] font-semibold shadow-2xl shadow-white/20 hover:shadow-white/40 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {cardStatus === 'generating' || cardStatus === 'uploading' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#1e3a5f]/30 border-t-[#1e3a5f] rounded-full animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Save Photo
                    </>
                  )}
                </button>
              </div>
              <p className="text-center text-white/30 text-xs mt-2 tracking-wide">
                Powered by AI • Made with love in Singapore
              </p>
            </div>
          )}

          {/* Mobile loading placeholder */}
          {!showContent && (
            <div className="md:hidden p-4 glass-card rounded-t-3xl shrink-0 mt-auto">
              <div className="flex items-center gap-4 mb-3 max-w-md mx-auto w-full">
                <div className="w-[96px] h-[96px] bg-white/10 rounded-xl shimmer" />
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
      </div>

      {/* Hidden card for generation - positioned behind main content */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '540px',
          height: '960px',
          background: `radial-gradient(circle at 50% 35%, ${currentStyle.color}35 0%, ${currentStyle.color}10 30%, transparent 60%), #0a0a0a`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          zIndex: -9999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Card content - mirrors the page display layout */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          padding: '24px 28px',
        }}>
          {/* School logo + name at top */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '14px',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoBase64 || '/school-logo.png'}
              alt="Riverside Secondary School"
              style={{
                height: '52px',
              }}
            />
          </div>

          {/* Profile icon */}
          <div style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconBase64 || profile.icon}
              alt=""
              style={{
                width: '56px',
                height: '56px',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Profile title */}
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: currentStyle.color,
            textAlign: 'center',
            marginBottom: '6px',
            textShadow: `0 0 40px ${currentStyle.color}50`,
          }}>
            {profile.title}
          </h2>

          {/* Tagline in quotes */}
          <p style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.7)',
            fontStyle: 'italic',
            textAlign: 'center',
            marginBottom: '16px',
            padding: '0 20px',
          }}>
            &ldquo;{profile.tagline}&rdquo;
          </p>

          {/* Image with decorative corner brackets */}
          <div style={{
            position: 'relative',
            width: '90%',
            maxWidth: '460px',
            marginBottom: '18px',
            flex: '1 1 auto',
            minHeight: 0,
          }}>
            {/* Corner decorations */}
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              width: '28px',
              height: '28px',
              borderLeft: `2.5px solid ${currentStyle.color}B0`,
              borderTop: `2.5px solid ${currentStyle.color}B0`,
              borderTopLeftRadius: '8px',
            }} />
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '28px',
              height: '28px',
              borderRight: `2.5px solid ${currentStyle.color}B0`,
              borderTop: `2.5px solid ${currentStyle.color}B0`,
              borderTopRightRadius: '8px',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              left: '-8px',
              width: '28px',
              height: '28px',
              borderLeft: `2.5px solid ${currentStyle.color}B0`,
              borderBottom: `2.5px solid ${currentStyle.color}B0`,
              borderBottomLeftRadius: '8px',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              right: '-8px',
              width: '28px',
              height: '28px',
              borderRight: `2.5px solid ${currentStyle.color}B0`,
              borderBottom: `2.5px solid ${currentStyle.color}B0`,
              borderBottomRightRadius: '8px',
            }} />

            {/* Image container */}
            <div style={{
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: `0 25px 50px -12px ${currentStyle.color}50`,
              outline: `1px solid ${currentStyle.color}30`,
              height: '100%',
            }}>
              {(imageBase64 || displayImageUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageBase64 || displayImageUrl || ''}
                  alt="Your Singapore moment"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  crossOrigin="anonymous"
                />
              )}
            </div>
          </div>

          {/* Description */}
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
            textAlign: 'center',
            marginBottom: '10px',
            padding: '0 16px',
          }}>
            {profile.description}
          </p>

          {/* Strength */}
          <p style={{
            fontSize: '15px',
            fontWeight: 600,
            color: currentStyle.color,
            textAlign: 'center',
            marginBottom: '8px',
          }}>
            Your strength: {profile.strength}
          </p>

          {/* Footer */}
          <div style={{
            marginTop: 'auto',
            textAlign: 'center',
            paddingTop: '8px',
          }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
              Powered by AI • Made with love in Singapore
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#050505]">
      <div className="w-10 h-10 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>}>
      <ResultPageContent />
    </Suspense>
  )
}
