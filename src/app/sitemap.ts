import type { MetadataRoute } from 'next';
import { challenges } from '@/features/challenges/data/challenges';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      priority: 1,
    },
    ...challenges.map((challenge) => ({
      url: `${SITE_URL}/desafios/${challenge.id}`,
      priority: 0.8,
    })),
  ];
}
