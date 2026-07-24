import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/chat/', '/settings', '/memory', '/profile'], // Protected routes
    },
    sitemap: 'https://dreyzfarid.online/sitemap.xml',
  };
}
