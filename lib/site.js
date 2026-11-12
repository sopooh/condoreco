// Dominio canonico del sito. Sovrascrivibile via NEXT_PUBLIC_SITE_URL
// (es. per staging), altrimenti condoreco.com.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.condoreco.com').replace(/\/$/, '')
export const SITE_NAME = 'CondoReco'
