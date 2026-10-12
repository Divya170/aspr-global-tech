import { StatusScreen } from '@/components/layout/StatusScreen';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <StatusScreen code="404" title="This page doesn't exist." lead="The link may be old or mistyped. Everything we do is one click away from the home page.">
      <ButtonLink href="/" arrow>Return Home</ButtonLink>
      <ButtonLink href="/contact" variant="secondary">Contact us</ButtonLink>
    </StatusScreen>
  );
}
