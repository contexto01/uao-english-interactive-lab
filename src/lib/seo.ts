import type { Metadata } from 'next';

export const SITE_URL = 'https://uao-english-interactive-lab.vercel.app';
export const SITE_NAME = 'UAO English Interactive Lab';
export const SITE_DESCRIPTION =
  'Practice English 5 at Universidad Autónoma de Occidente through interactive challenges in grammar and communication.';

const SOCIAL_IMAGE_URL = `${SITE_URL}/og-image.png`;
const SOCIAL_IMAGE_ALT = 'UAO English Interactive Lab: interactive English 5 challenges';

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const pageTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = new URL(path, `${SITE_URL}/`).toString();

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: SOCIAL_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [{ url: SOCIAL_IMAGE_URL, alt: SOCIAL_IMAGE_ALT }],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
