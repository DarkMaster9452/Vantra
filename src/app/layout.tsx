import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import AccountProvider from '@/components/vantra/AccountProvider'
import AppChrome from '@/components/vantra/AppChrome'
import SpatialNav from '@/components/tv/SpatialNav'
import TVInputKeyboard from '@/components/tv/TVInputKeyboard'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
})

export const metadata: Metadata = {
  title: { default: 'VANTRA', template: '%s | VANTRA' },
  description: 'Your private movie, TV and anime library.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
}

// TV režim sa nastaví ešte pred prvým vykreslením (žiadne preblikovanie
// štýlov): Android TV appka má v user-agente "VantraTV", v prehliadači ?tv=1
const tvBootstrap = `try{var p=new URLSearchParams(location.search).get('tv');if(p==='1'||p==='0')localStorage.setItem('vantra_tv_mode',p);var f=localStorage.getItem('vantra_tv_mode');if(f!==null?f==='1':/VantraTV|Android TV|AFT[A-Z]|BRAVIA|GoogleTV/i.test(navigator.userAgent))document.documentElement.dataset.tv='1'}catch(e){}`

// Hlavička a účet sú mimo prechodu stránok (template), animuje sa len obsah
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: tvBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AccountProvider>
          <SpatialNav />
          <AppChrome />
          {children}
          <TVInputKeyboard />
        </AccountProvider>
      </body>
    </html>
  )
}
