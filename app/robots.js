import { SITE_URL } from '@/lib/site'

// Le pagine dell'area condominio (/edificio/[id]/condominio/*) NON sono in
// disallow: hanno meta noindex (vedi il loro layout), e Google deve poterle
// scansionare per vederlo e toglierle dall'indice.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/test-db',
        '/profilo',
        '/notifiche',
        '/reimposta-password',
        '/fornitore',
        '/fornitori/invito/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
