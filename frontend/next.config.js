/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // smaller Docker image — see frontend/Dockerfile

  // ── Fix: Cross-Origin-Opener-Policy for Google OAuth popup ───────────────
  // Next.js 14 defaults to `same-origin` which blocks Google's OAuth popup
  // from communicating back via window.postMessage / window.closed.
  // `same-origin-allow-popups` allows popups opened by this page (Google OAuth)
  // to send messages back while still protecting against other cross-origin
  // openers.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
