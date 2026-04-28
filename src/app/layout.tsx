// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Flex Scholar',
    template: '%s | Flex Scholar',
  },
  description:
    'Flex Scholar by Torres Academy — expert-guided learning, human feedback, and real academic growth.',
  applicationName: 'Flex Scholar',
  keywords: [
    'Flex Scholar',
    'Torres Academy',
    'online learning',
    'expert-guided learning',
    'human feedback',
    'portfolio learning',
    'qualitative grading',
    'IB teaching',
    'Cambridge teaching',
    'student portfolio',
    'parent progress reports',
  ],
  authors: [{ name: 'Torres Academy' }],
  creator: 'Torres Academy',
  publisher: 'Torres Academy',
  icons: {
    icon: [
      {
        url: '/icon.png',
        type: 'image/png',
      },
    ],
    shortcut: ['/icon.png'],
    apple: [
      {
        url: '/apple-icon.png',
        type: 'image/png',
      },
    ],
  },
  openGraph: {
    title: 'Flex Scholar',
    description:
      'Expert-guided learning. Human feedback. Real academic growth.',
    siteName: 'Flex Scholar',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flex Scholar',
    description:
      'Expert-guided learning. Human feedback. Real academic growth.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  )
}