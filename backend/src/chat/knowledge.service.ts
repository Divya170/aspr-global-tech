import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { Row } from '../database/database.service';
import { KbDoc, KbHit, KbStore, makeDoc } from './kb-store';

/** How long generated documents are reused before the content tables are read again. */
const REFRESH_MS = 60_000;
/** Hard ceiling on injected context, so a long conversation cannot inflate cost. */
const MAX_CONTEXT_CHARS = 12000;
/** Further hits are injected only if they score near the best one. */
const RELATIVE_SCORE_FLOOR = 0.6;

/** Synonyms visitors actually type, keyed by service name. Feeds each doc's `Related terms`. */
const SERVICE_TERMS: Record<string, string> = {
  'Website Development': 'website web site webpage landing page wordpress nextjs react ecommerce e-commerce online store shopify web platform frontend responsive redesign',
  'App Development': 'app apps mobile ios android iphone flutter react native play store app store application',
  'SaaS & Software Solutions': 'saas software platform subscription custom software web app dashboard portal crm erp mvp startup product',
  'AI & Chatbot Solutions': 'ai artificial intelligence chatbot chat bot agent agents gpt llm automation whatsapp bot voice assistant',
  'Game Development': 'game games gaming unity mobile game c# 3d 2d multiplayer',
  'Logo Design': 'logo brand identity mark branding icon symbol rebrand',
  'Graphics Design': 'graphics graphic design poster social media posts flyer brochure packaging print creatives banner',
  'Video Editing': 'video editing edit reels youtube trailer ad film motion graphics shorts',
  SEO: 'seo search engine optimisation optimization google ranking rank traffic keywords local seo google business profile',
  'Business Management': 'business management systems erp inventory billing crm automation workflow spreadsheet operations',
};

/** Mirrors SHOW_WORK in frontend/lib/flags.js. */
const SHOW_WORK = false;

const bullets = (xs: unknown[]) => xs.map((x) => `- ${x}`).join('\n');

/**
 * Turns the live content tables into knowledge-base documents and answers retrieval
 * queries. Documents are regenerated at most once a minute, so admin edits reach the
 * assistant without a restart.
 */
@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger('KnowledgeBase');
  readonly kb = new KbStore();
  private builtAt = 0;

  constructor(private readonly content: ContentService) {}

  onModuleInit(): void {
    this.kb.loadFiles();
    this.refresh(true);
    this.logger.log(`Knowledge base ready: ${this.kb.size} documents`);
  }

  private refresh(force = false): void {
    if (!force && Date.now() - this.builtAt < REFRESH_MS) return;
    try {
      this.kb.setLiveDocs(this.buildDocs());
      this.builtAt = Date.now();
    } catch (err) {
      // Keep serving the previous documents rather than failing the question.
      this.logger.error(`Could not rebuild live documents: ${(err as Error).message}`);
    }
  }

  /** Documents to inject, and the sources to record against the answer. */
  retrieve(question: string): { context: string; sources: KbHit[] } {
    this.refresh();
    let hits: KbHit[];
    try {
      hits = this.kb.search(question, 3);
    } catch (err) {
      this.logger.error(`Knowledge-base search failed: ${(err as Error).message}`);
      return { context: '', sources: [] };
    }
    if (!hits.length) return { context: '', sources: [] };

    const floor = hits[0].score * RELATIVE_SCORE_FLOOR;
    const chosen = hits.filter((h, i) => i === 0 || h.score >= floor);
    let context = '';
    const used: KbHit[] = [];
    for (const hit of chosen) {
      const block = `# ${hit.title} (${hit.url})\n${hit.content}`;
      if (context.length + block.length > MAX_CONTEXT_CHARS) break;
      context += (context ? '\n\n' : '') + block;
      used.push(hit);
    }
    return { context, sources: used };
  }

  bestUrl(question: string): string {
    this.refresh();
    return this.kb.bestUrl(question);
  }

  /** The "what do you need" options, offered in the chat lead form. */
  needs(): string[] {
    return this.content.items('needs').map((n) => n.label as string);
  }

  private buildDocs(): KbDoc[] {
    const c = this.content;
    const st = c.settings();
    const services = c.items('services');
    const docs: KbDoc[] = [];

    docs.push(makeDoc('services/overview', 'Services overview', '/#services', `# Services overview

ASPR Global Tech offers ${services.length} services under one roof, grouped as Build, Brand and Grow. One team, one point of contact.

${services.map((s) => `- **${s.name}** (${s.pillar}): ${s.line}`).join('\n')}

## Related terms

services service offer offering offerings what do you do capabilities build brand grow list all everything`));

    for (const s of services) {
      const slug = String(s.name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const industries = c.items('industries').filter((i) => (i.builds || []).length).map((i) => `${i.name}: ${(i.builds as string[]).join(', ')}`);
      const det = ((st.serviceDetails || {}) as Row)[slug] as Row | undefined;
      const extra = det ? `
${det.intro}

What's included:
${bullets(det.deliverables || [])}

Ideal for:
${bullets(det.idealFor || [])}

Typical timeline: ${det.timeline}. Typical budget: ${det.budget}. Exact price is fixed in a written quote after the Discover call.
Process: ${((det.process || []) as string[][]).map(([k, v]) => `${k} — ${v}`).join(' ')}
Technologies: ${(det.tech || []).join(', ')}. Add-ons: ${(det.addOns || []).join(', ')}.

${((det.faqs || []) as string[][]).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}
` : '';
      docs.push(makeDoc(`services/${slug}`, String(s.name), `/services/${slug}`, `# ${s.name}

${det?.tagline || s.line}
${extra}
- Service ${s.num} of ${services.length}, in the ${s.pillar} pillar.
- Delivered through the seven-step process (Discover, Define, Design, Develop, Test, Deploy, Support).
- Scope, price and timeline are written down and signed off before any build starts.
- Can be combined with any other service, from the same team on one timeline.
${s.name === 'Website Development' || s.name === 'App Development' ? `\nIndustry builds we do:\n${bullets(industries)}\n` : ''}
## Related terms

${SERVICE_TERMS[s.name as string] || String(s.name).toLowerCase()}`));
    }

    const products = c.items('products');
    const pd = (st.productDetails || {}) as Row;
    docs.push(makeDoc('products', 'Ready-made products', '/#products', `# Ready-made products

Besides custom builds, ASPR offers ready-made software products that can be customised and demoed:

- **AI Voice Agent**: an AI agent that answers calls, books appointments and qualifies leads.${pd['AI Voice Agent'] ? ` Features: ${(pd['AI Voice Agent'].features || []).join('; ')}.` : ''}
${products.map((p) => `- **${p.name}**: ${p.tag}.${pd[p.name as string] ? ` Features: ${(pd[p.name as string].features || []).join('; ')}. Best for: ${pd[p.name as string].bestFor}.` : ''}`).join('\n')}

To see one, ask for a product demo through the contact form at /company#contact.

## Related terms

products product ready made off the shelf billing invoice invoicing employee hr payroll inventory stock finance fintech voice agent demo software license`));

    docs.push(makeDoc('industries', 'Industries we work with', '/#services', `# Industries we work with

${c.items('industries').map((i) => `- **${i.name}**: problem we solve: ${i.problem} What we build: ${(i.builds as string[]).join(', ')}.`).join('\n')}

## Related terms

industry industries sector retail shop store healthcare clinic hospital doctor education school college real estate property manufacturing factory logistics delivery transport hospitality restaurant cafe hotel startup startups`));

    const groups = (st.processGroups || []) as Row[];
    docs.push(makeDoc('company/process', 'How we run a project', '/company#process', `# How we run a project

Three stages, seven steps:

${groups.map((g) => `**${g.verb}** ${g.sum}`).join('\n\n')}

${c.items('steps').map((s) => `- **${s.num} ${s.title}**: ${s.description} Outputs: ${(s.outputs as string[]).join('; ')}.`).join('\n')}

## Related terms

process method methodology how do you work steps stages workflow discover define design develop test deploy support launch handover staging revisions agile project management`));

    const faqs = c.items('faqs').filter((q) => q.answer);
    docs.push(makeDoc('company/faq', 'Frequently asked questions', '/company#faq', `# Frequently asked questions

${faqs.map((q) => `## ${q.question}\n\n${q.answer}`).join('\n\n')}

## Related terms

faq questions cost costs price prices pricing charge fee fees budget quote rate how much expensive cheap afford how long timeline deadline duration weeks months ownership own code handover support maintenance care plan existing team rescue fix outside abroad international usa us uk dollars currency`));

    docs.push(makeDoc('company/packages', 'Packages and budgets', '/company#contact', `# Packages and budgets

Common combinations of services:

${c.items('packages').map((p) => `- **${p.name}** (${(p.services as string[]).join(' + ')}): ${p.outcome}. Pricing: ${p.price}.`).join('\n')}

Budget ranges a client can pick on the brief form: ${(st.budgets || []).join(', ')}.
Launch timelines a client can pick: ${(st.timelines || []).join(', ')}.
Every project gets a fixed written quote after the Discover call. Quotes are in US dollars, or the client's local currency on request.

## Related terms

package packages bundle combo plan plans budget budgets price pricing cost quote dollars usd range launch replace be found ship`));

    // The Work page is hidden on the site for now (frontend lib/flags.js SHOW_WORK), so the
    // assistant neither links to it nor quotes individual projects.
    if (SHOW_WORK) docs.push(makeDoc('company/work', 'Our work', '/company#work', `# Our work

Selected recent projects (client names are kept private):

${c.items('work').map((w) => `- **${w.client}** (${(w.scope as string[]).join(', ')}): ${w.outcome}`).join('\n')}

Track record: ${st.stats?.projects ?? 300}+ projects delivered for ${st.stats?.clients ?? 150}+ clients.

## Related terms

work portfolio projects case study case studies examples samples clients past previous show me results experience`));

    const roles = c.items('roles').filter((r) => r.isOpen);
    docs.push(makeDoc('company/careers', 'Careers', '/company#careers', `# Careers

Open roles:

${roles.map((r) => `- **${r.title}** (${(r.meta as string[]).join(', ')})`).join('\n')}

Hiring process: ${((st.hiring || []) as Row[]).map((h) => h.t).join(' → ')}.
Apply on the careers page at /company#careers with a portfolio link or files. Careers email: ${st.company?.careersEmail}.

## Related terms

job jobs career careers hiring hire vacancy vacancies opening openings role roles internship intern apply application work for you join team salary`));

    docs.push(makeDoc('company/why', 'Why ASPR', '/company#about', `# Why ASPR

${((st.why || []) as Row[]).map((w) => `- **${w.t}**: ${w.d}`).join('\n')}

Values:
${((st.values || []) as Row[]).map((v) => `- **${v.t}**: ${v.d}`).join('\n')}

Technology we build with:
${((st.stack || []) as Row[]).map((s) => `- ${s.h}: ${(s.items as string[]).join(', ')}`).join('\n')}

## Related terms

why choose you different better trust reliable values technology tech stack languages frameworks react nextjs node python django flutter unity aws`));

    const articles = c.items('articles').filter((a) => a.status === 'published');
    docs.push(makeDoc('company/insights', 'Insights articles', '/company#insights', `# Insights articles

${articles.map((a) => `- [${a.title}](/company#insights/${a.slug}) (${a.category})`).join('\n')}

## Related terms

blog articles insights read reading posts writing guide tips`));

    return docs;
  }
}
