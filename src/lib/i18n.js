export function useTranslation(locale = 'en') {
  const en = require('../../public/locales/en.json')
  const si = require('../../public/locales/si.json')
  const ta = require('../../public/locales/ta.json')
  const translations = { en, si, ta }
  const t = (key) => translations[locale]?.[key] || key
  return { t }
}
