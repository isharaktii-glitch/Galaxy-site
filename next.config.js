/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: ['localhost'] },
  i18n: {
    locales: ['en', 'si', 'ta'],
    defaultLocale: 'en'
  }
}
module.exports = nextConfig
