'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useQuiz, ProfileType } from '@/context/QuizContext'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { profiles, Profile } from '@/types/quiz'

// Profile styling configuration
const profileStyles: Record<ProfileType, { image: string; color: string }> = {
  guardian: {
    image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1920&q=80',
    color: '#F59E0B', // Amber
  },
  steward: {
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80',
    color: '#10B981', // Emerald
  },
  shaper: {
    image: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
    color: '#6366F1', // Indigo
  },
  'guardian-steward': {
    image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1920&q=80',
    color: '#F59E0B', // Amber
  },
  'steward-shaper': {
    image: 'https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=1920&q=80',
    color: '#14B8A6', // Teal
  },
  'adaptive-guardian': {
    image: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
    color: '#8B5CF6', // Violet
  },
}

// Worker URL for R2 upload
const WORKER_URL = 'https://interactive-display.eugene-ff3.workers.dev'

// Canvas-based card generation (bypasses html-to-image for iOS Safari compatibility)
function generateCardCanvas(
  mainImg: HTMLImageElement,
  logoImg: HTMLImageElement,
  iconImg: HTMLImageElement,
  profile: Profile,
  color: string
): string {
  const W = 540, H = 960
  const canvas = document.createElement('canvas')
  canvas.width = W * 2  // 2x for retina
  canvas.height = H * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)  // Scale for retina

  // Helper: draw rounded rectangle path
  const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // Helper: draw corner bracket
  const drawBracket = (x: number, y: number, w: number, h: number, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    ctx.strokeStyle = `${color}B0`
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    const r = 8
    if (corner === 'tl') {
      ctx.moveTo(x, y + h)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.lineTo(x + w, y)
    } else if (corner === 'tr') {
      ctx.moveTo(x + w, y + h)
      ctx.lineTo(x + w, y + r)
      ctx.quadraticCurveTo(x + w, y, x + w - r, y)
      ctx.lineTo(x, y)
    } else if (corner === 'bl') {
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + h - r)
      ctx.quadraticCurveTo(x, y + h, x + r, y + h)
      ctx.lineTo(x + w, y + h)
    } else {
      ctx.moveTo(x + w, y)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x, y + h)
    }
    ctx.stroke()
  }

  // Helper: wrap text to multiple lines
  const wrapText = (text: string, maxWidth: number, lineHeight: number, y: number) => {
    const words = text.split(' ')
    let line = ''
    let currentY = y
    for (const word of words) {
      const testLine = line + word + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), W / 2, currentY)
        line = word + ' '
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line.trim(), W / 2, currentY)
    return currentY
  }

  // 1. Background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)

  // Radial gradient overlay
  const gradient = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.8)
  gradient.addColorStop(0, `${color}35`)
  gradient.addColorStop(0.3, `${color}10`)
  gradient.addColorStop(0.6, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  // 2. Logo (centered at top)
  const logoH = 52
  const logoW = logoImg.naturalWidth * (logoH / logoImg.naturalHeight)
  ctx.drawImage(logoImg, (W - logoW) / 2, 24, logoW, logoH)

  // 3. Title
  ctx.fillStyle = color
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = `${color}50`
  ctx.shadowBlur = 40
  ctx.fillText(profile.title, W / 2, 90)
  ctx.shadowBlur = 0

  // 4. Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = 'italic 15px system-ui, -apple-system, sans-serif'
  ctx.fillText(`"${profile.tagline}"`, W / 2, 130)

  // 5. Icon
  const iconSize = 48
  ctx.drawImage(iconImg, (W - iconSize) / 2, 158, iconSize, iconSize)

  // 6. Main image with rounded corners
  const imgX = 40, imgY = 224, imgW = W - 80, imgH = 480
  ctx.save()
  roundedRect(imgX, imgY, imgW, imgH, 12)
  ctx.clip()

  // Cover fit calculation
  const imgAspect = mainImg.naturalWidth / mainImg.naturalHeight
  const boxAspect = imgW / imgH
  let sx = 0, sy = 0, sw = mainImg.naturalWidth, sh = mainImg.naturalHeight
  if (imgAspect > boxAspect) {
    // Image wider than box - crop sides
    sw = mainImg.naturalHeight * boxAspect
    sx = (mainImg.naturalWidth - sw) / 2
  } else {
    // Image taller than box - crop top/bottom
    sh = mainImg.naturalWidth / boxAspect
    sy = (mainImg.naturalHeight - sh) / 2
  }
  ctx.drawImage(mainImg, sx, sy, sw, sh, imgX, imgY, imgW, imgH)
  ctx.restore()

  // Image shadow/outline
  ctx.strokeStyle = `${color}30`
  ctx.lineWidth = 1
  roundedRect(imgX, imgY, imgW, imgH, 12)
  ctx.stroke()

  // 7. Corner brackets
  const bracketSize = 28, bracketOffset = 8
  drawBracket(imgX - bracketOffset, imgY - bracketOffset, bracketSize, bracketSize, 'tl')
  drawBracket(imgX + imgW - bracketSize + bracketOffset, imgY - bracketOffset, bracketSize, bracketSize, 'tr')
  drawBracket(imgX - bracketOffset, imgY + imgH - bracketSize + bracketOffset, bracketSize, bracketSize, 'bl')
  drawBracket(imgX + imgW - bracketSize + bracketOffset, imgY + imgH - bracketSize + bracketOffset, bracketSize, bracketSize, 'br')

  // 8. Description
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '14px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const descY = wrapText(profile.description, W - 60, 22, 725)

  // 9. Strength (same padding as description)
  ctx.fillStyle = color
  ctx.font = '600 15px system-ui, -apple-system, sans-serif'
  wrapText(`Your strength: ${profile.strength}`, W - 60, 22, descY + 30)

  // 10. Footer
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '10px system-ui, -apple-system, sans-serif'
  ctx.fillText('Powered by AI • Made with love in Singapore', W / 2, H - 36)

  return canvas.toDataURL('image/png')
}

type CardStatus = 'generating' | 'uploading' | 'ready' | 'error'

// Test mode profiles for testing different profile types
const testProfiles: Record<string, ProfileType> = {
  guardian: 'guardian',
  steward: 'steward',
  shaper: 'shaper',
  'guardian-steward': 'guardian-steward',
  'steward-shaper': 'steward-shaper',
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
  const [cardCaptured, setCardCaptured] = useState(false)
  const hasStartedImagePrep = useRef(false)
  // Store preloaded Image objects to ensure iOS Safari has decoded them
  const preloadedImagesRef = useRef<{
    mainImg: HTMLImageElement | null
    logoImg: HTMLImageElement | null
    iconImg: HTMLImageElement | null
  }>({ mainImg: null, logoImg: null, iconImg: null })
  // Store displayImageUrl for retry (in case context state changes)
  const displayImageUrlRef = useRef<string | null>(null)

  const dbg = useCallback((msg: string) => { console.log('[CARD]', msg) }, [])

  // Test mode: allow passing image URL and profile via query params
  // Usage: /result?testImage=https://...&testProfile=builder
  const testImage = searchParams.get('testImage')
  const testProfile = searchParams.get('testProfile') as ProfileType | null
  const isTestMode = !!testImage

  const profile = isTestMode && testProfile && testProfiles[testProfile]
    ? profiles[testProfile]
    : getProfile()
  const profileType = isTestMode && testProfile && testProfiles[testProfile]
    ? testProfile
    : getProfileType()
  const currentStyle = profileStyles[profileType] || profileStyles.steward

  // Use FAL.ai URL for display (fast CDN), or test image in test mode
  const displayImageUrl = isTestMode ? testImage : (resultImageUrl || photoData)

  // Store displayImageUrl in ref for retry (persists even if context changes)
  useEffect(() => {
    if (displayImageUrl) {
      displayImageUrlRef.current = displayImageUrl
    }
  }, [displayImageUrl])

  // QR code shows card view page (with save button) when ready, otherwise placeholder
  const qrValue = cardUrl
    ? cardUrl.replace('/cards/', '/view/cards/')
    : 'https://interactive-display.pages.dev'

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

  // Helper to preload an image into an Image object (forces iOS Safari to decode)
  const preloadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        dbg(`Preloaded image: ${src.substring(0, 50)}... (${img.naturalWidth}x${img.naturalHeight})`)
        resolve(img)
      }
      img.onerror = (e) => {
        dbg(`Preload failed: ${src.substring(0, 50)}...`)
        reject(e)
      }
      // For data URLs, crossOrigin is not needed. For URLs, set it.
      if (!src.startsWith('data:')) {
        img.crossOrigin = 'anonymous'
      }
      img.src = src
    })
  }, [dbg])

  // Phase 1: Prepare images (fetch, preload into Image objects, then set state)
  const prepareCardImages = useCallback(async () => {
    // Use ref as fallback for retry (context state may have changed)
    const imageUrl = displayImageUrl || displayImageUrlRef.current

    console.log('prepareCardImages called', {
      displayImageUrl: imageUrl?.substring(0, 50) + '...',
      hasStarted: hasStartedImagePrep.current
    })

    if (!imageUrl || hasStartedImagePrep.current) return
    hasStartedImagePrep.current = true

    setCardStatus('generating')

    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000

    const attemptPrepare = async (attempt = 1): Promise<void> => {
      dbg(`Image preparation attempt ${attempt}/${MAX_RETRIES}`)
      dbg(`resultImageUrl: ${resultImageUrl?.substring(0, 50)}...`)
      dbg(`r2Path: ${r2Path}`)
      dbg(`imageUrl: ${imageUrl?.substring(0, 50)}...`)

      try {
        // Upload FAL.ai image to R2 first so we can use same-origin URL for canvas
        let imageUrlForCard = imageUrl
        if (resultImageUrl && r2Path && (resultImageUrl.includes('fal.media') || resultImageUrl.includes('fal.ai'))) {
          dbg('Uploading FAL.ai image to R2...')
          try {
            const timePeriod = r2Path.split('/')[1] || 'present'
            const uploadRes = await fetch(`${WORKER_URL}/upload-to-r2`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ falUrl: resultImageUrl, r2Path, timePeriod }),
            })
            if (uploadRes.ok) {
              const data = await uploadRes.json()
              imageUrlForCard = data.r2Url
              dbg(`R2 upload OK: ${imageUrlForCard.substring(0, 60)}`)
            } else {
              dbg(`R2 upload failed: ${uploadRes.status} ${uploadRes.statusText}`)
            }
          } catch (e) {
            dbg(`R2 upload error: ${e}`)
          }
        } else {
          dbg(`Skipped R2 upload: resultImageUrl=${!!resultImageUrl}, r2Path=${!!r2Path}`)
        }

        // Fetch all images as base64 first
        let mainB64: string | null = null
        let iconB64: string | null = null
        let logoB64: string | null = null

        // Convert main image to base64 using fetch (avoids canvas CORS issues on iOS Safari)
        if (imageUrlForCard && !imageUrlForCard.startsWith('data:')) {
          const urlsToTry = [imageUrlForCard]
          if (imageUrlForCard !== imageUrl && imageUrl && !imageUrl.startsWith('data:')) {
            urlsToTry.push(imageUrl)
          }
          dbg(`Will try ${urlsToTry.length} URL(s) for base64`)
          for (const url of urlsToTry) {
            dbg(`Fetching: ${url.substring(0, 60)}...`)
            try {
              const imgResponse = await fetch(url, { mode: 'cors' })
              dbg(`Response: ${imgResponse.status} ${imgResponse.statusText}, type=${imgResponse.type}`)
              if (imgResponse.ok) {
                const blob = await imgResponse.blob()
                dbg(`Blob: ${blob.size} bytes, type=${blob.type}`)
                mainB64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onloadend = () => resolve(reader.result as string)
                  reader.onerror = reject
                  reader.readAsDataURL(blob)
                })
                dbg(`Main image base64 OK: ${Math.round(mainB64.length / 1024)} KB`)
                break
              } else {
                dbg(`Fetch failed: ${imgResponse.status}`)
              }
            } catch (convErr) {
              dbg(`Fetch error: ${convErr}`)
            }
          }
        } else if (imageUrlForCard?.startsWith('data:')) {
          mainB64 = imageUrlForCard
        }

        // Convert icon to base64
        if (profile.icon) {
          try {
            const iconRes = await fetch(profile.icon)
            const iconBlob = await iconRes.blob()
            iconB64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(iconBlob)
            })
            dbg(`Icon base64 OK: ${Math.round(iconB64.length / 1024)} KB`)
          } catch (e) { dbg(`Icon base64 failed: ${e}`) }
        }

        // Convert logo to base64
        try {
          const logoRes = await fetch('/school-logo.png')
          const logoBlob = await logoRes.blob()
          logoB64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(logoBlob)
          })
          dbg(`Logo base64 OK: ${Math.round(logoB64.length / 1024)} KB`)
        } catch (e) { dbg(`Logo base64 failed: ${e}`) }

        // CRITICAL: Preload images into Image objects BEFORE setting state
        // This forces iOS Safari to decode the images into memory
        dbg('Preloading images into Image objects...')
        const preloadPromises: Promise<HTMLImageElement | null>[] = []

        if (mainB64) {
          preloadPromises.push(preloadImage(mainB64).catch(() => null))
        } else {
          preloadPromises.push(Promise.resolve(null))
        }
        if (logoB64) {
          preloadPromises.push(preloadImage(logoB64).catch(() => null))
        } else {
          preloadPromises.push(Promise.resolve(null))
        }
        if (iconB64) {
          preloadPromises.push(preloadImage(iconB64).catch(() => null))
        } else {
          preloadPromises.push(Promise.resolve(null))
        }

        const [mainImg, logoImg, iconImg] = await Promise.all(preloadPromises)
        dbg(`Preload complete: main=${!!mainImg}, logo=${!!logoImg}, icon=${!!iconImg}`)

        // Check if critical images loaded - if not, throw to trigger retry
        if (!mainImg || !logoImg || !iconImg) {
          throw new Error(`Missing images: main=${!!mainImg}, logo=${!!logoImg}, icon=${!!iconImg}`)
        }

        // Store preloaded Image objects in ref (ensures they stay in memory)
        preloadedImagesRef.current = { mainImg, logoImg, iconImg }

        // NOW set state - React will render, and images are already decoded
        if (mainB64) setImageBase64(mainB64)
        if (logoB64) setLogoBase64(logoB64)
        if (iconB64) setIconBase64(iconB64)

        dbg('Image preparation complete - images preloaded and state set')
      } catch (err) {
        console.error(`Image preparation error (attempt ${attempt}):`, err)

        if (attempt < MAX_RETRIES) {
          dbg(`Retrying in ${RETRY_DELAY}ms...`)
          await new Promise(r => setTimeout(r, RETRY_DELAY))
          return attemptPrepare(attempt + 1)
        }

        // All retries failed - show error
        dbg('All retries failed, showing error')
        setCardStatus('error')
      }
    }

    await attemptPrepare()
  }, [displayImageUrl, resultImageUrl, r2Path, profile, dbg, preloadImage])

  // Phase 2: Generate card using canvas (bypasses html-to-image for iOS Safari)
  // This effect runs when preloaded images are ready
  useEffect(() => {
    if (cardCaptured) return

    // Check if preloaded images are ready
    const { mainImg, logoImg, iconImg } = preloadedImagesRef.current
    if (!mainImg || !logoImg || !iconImg) return

    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000

    const generateAndUploadCard = async (attempt = 1): Promise<void> => {
      dbg(`Card generation attempt ${attempt}/${MAX_RETRIES}`)
      dbg(`Image sizes: main=${mainImg.naturalWidth}x${mainImg.naturalHeight}, logo=${logoImg.naturalWidth}x${logoImg.naturalHeight}, icon=${iconImg.naturalWidth}x${iconImg.naturalHeight}`)

      try {
        // Generate card using canvas (no DOM dependency)
        const cardDataUrl = generateCardCanvas(mainImg, logoImg, iconImg, profile, currentStyle.color)
        dbg(`Card generated: ${Math.round(cardDataUrl.length / 1024)} KB`)

        setCardDataUrl(cardDataUrl)
        setCardCaptured(true)
        setCardStatus('uploading')

        // Extract base64 data for upload
        const base64Data = cardDataUrl.split(',')[1]
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
          dbg('Card uploaded successfully')
        } else {
          throw new Error(`Upload failed: ${uploadResponse.status}`)
        }
      } catch (err) {
        console.error(`Card generation error (attempt ${attempt}):`, err)

        if (attempt < MAX_RETRIES) {
          dbg(`Retrying in ${RETRY_DELAY}ms...`)
          await new Promise(r => setTimeout(r, RETRY_DELAY))
          return generateAndUploadCard(attempt + 1)
        }

        // All retries failed - show error
        dbg('All retries failed, showing error')
        setCardStatus('error')
      }
    }

    generateAndUploadCard()
  // imageBase64 in deps triggers effect when prepareCardImages completes (sets state after preloading)
  }, [cardCaptured, profile, currentStyle.color, profileType, setQrUrl, dbg, imageBase64])

  // Start image preparation when display image is loaded
  useEffect(() => {
    if (imageLoaded && displayImageUrl) {
      prepareCardImages()
    }
  }, [imageLoaded, displayImageUrl, prepareCardImages])

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
    hasStartedImagePrep.current = false
    preloadedImagesRef.current = { mainImg: null, logoImg: null, iconImg: null }
    setCardCaptured(false)
    setCardStatus('generating')
    prepareCardImages()
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.icon} alt="" className="w-10 h-10 sm:w-12 sm:h-12 mt-2 mx-auto block object-contain" />
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

          {/* Profile icon - desktop only (visual separator between quote and description) */}
          <div className="hidden md:flex md:justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.icon} alt="" className="w-12 h-12 object-contain" />
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
