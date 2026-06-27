import './globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { Toaster } from 'react-hot-toast'

export default function RootLayout({ children, params: { locale } }) {
  return (
    <html lang={locale}>
      <body className="bg-gray-900 text-white">
        <NextIntlClientProvider locale={locale}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
