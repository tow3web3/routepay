import './globals.css'
import { Funnel_Display, Funnel_Sans, Geist_Mono } from 'next/font/google'
import Backdrop from '../components/Backdrop'
import { BRAND, DESCRIPTION, SITE_URL } from '../lib/brand'

// Funnel is one family in two cuts: Display for headings and figures, Sans for reading.
const display = Funnel_Display({ subsets: ['latin'], variable: '--font-display' })
const sans = Funnel_Sans({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

const TITLE = `${BRAND}: route your coin's fees to any page on the internet`

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'robinhood chain, creator fees, fee routing, youtube, github, domain, instagram, facebook, stock tokens, dividends, buyback, treasury',
  icons: { icon: '/brand/routepay-64.png', apple: '/brand/routepay-256.png' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: BRAND,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className={sans.className}>
        <Backdrop />
        {children}
      </body>
    </html>
  )
}
