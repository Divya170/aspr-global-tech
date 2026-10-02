import ChatWidget from '@/components/chat/ChatWidget';
import CompanyLogic from '@/components/logic/CompanyLogic';
import StatusScreen, { primaryBtn } from '@/components/StatusScreen';
import { getCompanyContent } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'About Us', description: 'Meet ASPR Global Tech: our story, seven-step process, recent work, open roles, insights and how to start a project with us from anywhere in the world.', alternates: { canonical: '/company' } };

export default async function CompanyPage() {
  let content;
  try {
    content = await getCompanyContent();
  } catch {
    return (
      <StatusScreen eyebrow="TEMPORARILY UNAVAILABLE" title="We couldn't load this page right now."
        body="Our content service isn't responding. Please try again in a minute — or email support@asprglobaltech.com."
        action={<a href="/company" style={primaryBtn}>Try again →</a>} />
    );
  }
  return (
    <>
      <CompanyLogic content={content} />
      <ChatWidget />
    </>
  );
}
