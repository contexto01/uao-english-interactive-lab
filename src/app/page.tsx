import ChallengesSection from '@/features/home/ChallengesSection';
import Hero from '@/features/home/Hero';
import HowItWorks from '@/features/home/HowItWorks';
import { createPageMetadata, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  path: '/',
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <ChallengesSection />
      <HowItWorks />
    </>
  );
}
