import type { Metadata, Viewport } from 'next'
import './globals.css'
import { QuizProvider } from '@/context/QuizContext'

export const metadata: Metadata = {
  title: 'Past, Present, Future - Riverside Secondary\'s Interactive Experience',
  description: 'An interactive booth experience exploring Singapore\'s past, present and future',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Past, Present, Future',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans kiosk-container">
        <QuizProvider>
          <main className="h-screen h-dvh flex flex-col overflow-hidden">
            {children}
          </main>
        </QuizProvider>
      </body>
    </html>
  )
}
