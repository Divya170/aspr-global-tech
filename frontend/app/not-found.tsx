import { StatusScreen } from '@/components/layout/StatusScreen';
import { Logo } from '@/components/layout/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { PointerEffects } from '@/components/ui/PointerEffects';

export const metadata = { title: 'Page not found', robots: { index: false } };

/** Unknown URLs outside the site layout (it brings its own pointer listener for the grid spotlight). */
export default function NotFound() {
  return (
    <main id="main">
      <div className="absolute left-4 top-5 z-10 sm:left-8"><Logo /></div>
      <StatusScreen full code="404" title="This page doesn't exist." lead="The link may be old or mistyped. Everything we do is one click away from the home page.">
        <ButtonLink href="/" arrow>Return Home</ButtonLink>
      </StatusScreen>
      <PointerEffects />
    </main>
  );
}
