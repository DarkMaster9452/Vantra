import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        // Platí aj pre vložené prehrávače: video, fullscreen a PiP ostávajú povolené,
        // nesúvisiace funkcie zariadenia (kamera, mikrofón, poloha...) nie
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=(), display-capture=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), midi=(), web-share=()',
        },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self'" },
      ],
    }]
  },
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
