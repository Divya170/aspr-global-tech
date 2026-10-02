import StatusScreen, { primaryBtn, secondaryBtn } from '@/components/StatusScreen';

export default function NotFound() {
  return (
    <StatusScreen eyebrow="404" title="That page doesn't exist."
      body="The link may be old or mistyped. Everything we do is one click away from the home page."
      action={<><a href="/" style={primaryBtn}>Go home →</a><a href="/company#contact" style={secondaryBtn}>Contact us</a></>} />
  );
}
