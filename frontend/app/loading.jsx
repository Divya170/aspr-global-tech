import StatusScreen from '@/components/StatusScreen';

export default function Loading() {
  return <StatusScreen spinner eyebrow="LOADING" title="Think it. Build it. Scale it." body="Getting everything ready…" />;
}
