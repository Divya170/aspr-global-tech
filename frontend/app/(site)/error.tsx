'use client';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { Button, ButtonLink } from '@/components/ui/Button';

/** Shown when a page fails to load (e.g. the API is briefly unavailable). No technical detail is shown. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusScreen code="ERROR" title="Something went wrong." lead="Please try again. If it keeps happening, email us and we'll sort it out.">
      <Button onClick={reset}>Try again</Button>
      <ButtonLink href="/" variant="secondary">Return Home</ButtonLink>
    </StatusScreen>
  );
}
