'use client';
import StatusScreen, { primaryBtn, secondaryBtn } from '@/components/StatusScreen';

export default function Error({ reset }) {
  return (
    <StatusScreen eyebrow="SOMETHING WENT WRONG" title="This page hit an unexpected error."
      body="It's on us, not you. Try again, or head back to the home page."
      action={<><button type="button" onClick={() => reset()} style={primaryBtn}>Try again →</button><a href="/" style={secondaryBtn}>Home</a></>} />
  );
}
