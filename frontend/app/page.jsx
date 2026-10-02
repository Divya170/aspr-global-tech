import ChatWidget from '@/components/chat/ChatWidget';
import HomeLogic from '@/components/logic/HomeLogic';
import StatusScreen, { primaryBtn } from '@/components/StatusScreen';
import { getHomeContent } from '@/lib/api';

export const dynamic = 'force-dynamic'; // content is edited live from the admin dashboard

export default async function HomePage() {
  let content;
  try {
    content = await getHomeContent();
  } catch {
    return (
      <StatusScreen eyebrow="TEMPORARILY UNAVAILABLE" title="We couldn't load the site right now."
        body="Our content service isn't responding. Please try again in a minute — or reach us directly on +91 75399 07704."
        action={<a href="/" style={primaryBtn}>Try again →</a>} />
    );
  }
  return (
    <>
      <HomeLogic content={content} />
      <ChatWidget />
    </>
  );
}
