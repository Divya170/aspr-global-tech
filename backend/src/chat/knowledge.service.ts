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

/** Synonyms visitors actually type, keyed by service slug. Feeds each doc's `Related terms`. */
const SERVICE_TERMS: Record<string, string> = {
  'website-development': 'website web site webpage landing page corporate site wordpress nextjs react ecommerce e-commerce online store shopify frontend responsive redesign',
  '3d-website-development': '3d three.js threejs webgl interactive immersive animation product viewer configurator blender react three fiber',
  'web-application-development': 'web app application saas dashboard portal platform subscription crm erp mvp startup product admin panel',
  'custom-software-development': 'custom software bespoke system internal tool enterprise integration api backend automation workflow',
  'mobile-app-development': 'app apps mobile ios android iphone flutter react native play store app store application',
  'ui-ux-design': 'ui ux design user interface user experience figma prototype wireframe usability redesign design system',
  'business-automation': 'automation automate workflow business management systems erp inventory billing crm spreadsheet operations',
  'branding-digital-design': 'brand branding logo identity graphics graphic design social media posts flyer brochure packaging print stationery',
  'ai-and-chatbot-solutions': 'ai artificial intelligence chatbot chat bot agent agents gpt llm whatsapp bot voice assistant',
  'game-development': 'game games gaming unity mobile game c# 3d 2d multiplayer',
  'graphics-design': 'graphics graphic design poster social media posts flyer brochure packaging print creatives banner',
  'video-editing': 'video editing edit reels youtube trailer ad film motion graphics shorts',
  seo: 'seo search engine optimisation optimization google ranking rank traffic keywords local seo google business profile',
};

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

  /** The quote form's project types, offered in the chat lead form. */
  projectTypes(): string[] {
    return (this.content.settings(['projectTypes']).projectTypes as string[]) || ['Other'];
  }

  private buildDocs(): KbDoc[] {
    const c = this.content;
    const st = c.settings();
    const services = c.items('services');
    const techs = new Map(c.items('technologies').map((t) => [t.id, t.name as string]));
    const docs: KbDoc[] = [];

    docs.push(makeDoc('services/overview', 'Services overview', '/services', `# Services overview

ASPR Global Tech builds websites, 3D experiences, web applications, custom software and mobile apps, and designs the interfaces and brands around them. One team, one point of contact.

${services.map((s) => `- **${s.name}**: ${s.line} (/services/${s.slug})`).join('\n')}

## Related terms

services service offer offering offerings what do you do capabilities build design list all everything`));

    for (const s of services) {
      const pairs = (v: unknown) => (v as string[][]) || [];
      docs.push(makeDoc(`services/${s.slug}`, String(s.name), `/services/${s.slug}`, `# ${s.name}

${s.tagline || s.line}

${s.intro}

What we build:
${bullets(s.deliverables || [])}

Ideal for:
${bullets(s.idealFor || [])}
${s.timeline ? `\nTypical timeline: ${s.timeline}.` : ''}${s.budget ? ` Typical budget: ${s.budget}.` : ''} The exact price is fixed in a written quote after a short discovery call.
Process: ${pairs(s.process).map(([k, v]) => `${k}: ${v}`).join(' ')}
Technologies: ${(s.technologies as number[]).map((id) => techs.get(id)).filter(Boolean).join(', ')}.${(s.addOns || []).length ? ` Add-ons: ${s.addOns.join(', ')}.` : ''}

${pairs(s.faqs).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

## Related terms

${SERVICE_TERMS[s.slug as string] || String(s.name).toLowerCase()}`));
    }

    const projects = c.items('projects');
    if (projects.length) docs.push(makeDoc('portfolio', 'Our work', '/portfolio', `# Our work

Published projects:

${projects.map((p) => `- **${p.title}**: ${p.summary} (/portfolio/${p.slug})`).join('\n')}

## Related terms

work portfolio projects case study case studies examples samples clients past previous show me results experience`));

    const groups = new Map<string, string[]>();
    for (const t of c.items('technologies')) groups.set(t.grp, [...(groups.get(t.grp) || []), t.name]);
    docs.push(makeDoc('technologies', 'Technologies we use', '/technologies', `# Technologies we use

${[...groups].map(([g, names]) => `- ${g}: ${names.join(', ')}`).join('\n')}

## Related terms

technology tech stack languages frameworks react nextjs node python php java database postgres mysql mongodb redis three.js webgl blender flutter aws cloud git`));

    const products = c.items('products');
    const pd = (st.productDetails || {}) as Row;
    docs.push(makeDoc('products', 'Ready-made products', '/services/custom-software-development', `# Ready-made products

Besides custom builds, ASPR offers ready-made software that can be tailored and demoed:

${products.map((p) => `- **${p.name}**: ${p.tag}.${pd[p.name as string] ? ` Features: ${(pd[p.name as string].features || []).join('; ')}. Best for: ${pd[p.name as string].bestFor}.` : ''}`).join('\n')}

To see one, ask for a demo through the contact page at /contact.

## Related terms

products product ready made off the shelf billing invoice invoicing employee hr payroll inventory stock finance fintech demo software license`));

    docs.push(makeDoc('industries', 'Industries we work with', '/about', `# Industries we work with

${c.items('industries').map((i) => `- **${i.name}**: problem we solve: ${i.problem} What we build: ${(i.builds as string[]).join(', ')}.`).join('\n')}

## Related terms

industry industries sector retail shop store healthcare clinic hospital doctor education school college real estate property manufacturing factory logistics delivery transport hospitality restaurant cafe hotel startup startups`));

    const stageGroups = (st.processGroups || []) as Row[];
    docs.push(makeDoc('process', 'How we run a project', '/process', `# How we run a project

Three stages, seven steps:

${stageGroups.map((g) => `**${g.verb}** ${g.sum}`).join('\n\n')}

${c.items('steps').map((s) => `- **${s.num} ${s.title}**: ${s.description} Outputs: ${(s.outputs as string[]).join('; ')}.`).join('\n')}

## Related terms

process method methodology how do you work steps stages workflow discover define design develop test deploy support launch handover staging revisions agile project management`));

    const faqs = c.items('faqs').filter((q) => q.answer);
    docs.push(makeDoc('faq', 'Frequently asked questions', '/faq', `# Frequently asked questions

${faqs.map((q) => `## ${q.question}\n\n${q.answer}`).join('\n\n')}

## Related terms

faq questions cost costs price prices pricing charge fee fees budget quote rate how much expensive cheap afford how long timeline deadline duration weeks months ownership own code handover support maintenance care plan existing team rescue fix outside abroad international usa us uk dollars currency`));

    docs.push(makeDoc('quote', 'Getting a quote', '/quote', `# Getting a quote

Request a quote at /quote: pick the project type, budget and timeline, describe the project and attach any files. You get an inquiry ID straight away and a reply within one working day.

Project types: ${(st.projectTypes || []).join(', ')}.
Budget ranges: ${(st.budgets || []).join(', ')}.
Timelines: ${(st.timelines || []).join(', ')}.
Every project gets a fixed written quote after a short discovery call.

## Related terms

quote estimate proposal price pricing cost budget start project hire how much request`));

    const roles = c.items('roles');
    docs.push(makeDoc('careers', 'Careers', '/careers', `# Careers

${roles.length ? `Open roles:\n\n${roles.map((r) => `- **${r.title}** (${(r.meta as string[]).join(', ')})`).join('\n')}` : 'There are no open roles right now.'}

Hiring process: ${((st.hiring || []) as Row[]).map((h) => h.t).join(' → ')}.
Apply on the careers page at /careers with a portfolio link or files. Careers email: ${st.company?.careersEmail}.

## Related terms

job jobs career careers hiring hire vacancy vacancies opening openings role roles internship intern apply application work for you join team salary`));

    docs.push(makeDoc('about', 'About ASPR', '/about', `# About ASPR

${((st.why || []) as Row[]).map((w) => `- **${w.t}**: ${w.d}`).join('\n')}

Values:
${((st.values || []) as Row[]).map((v) => `- **${v.t}**: ${v.d}`).join('\n')}

## Related terms

why choose you different better trust reliable values about company team who are you story`));

    const articles = c.items('articles');
    if (articles.length) docs.push(makeDoc('insights', 'Insights articles', '/insights', `# Insights articles

${articles.map((a) => `- [${a.title}](/insights/${a.slug}) (${a.category})`).join('\n')}

## Related terms

blog articles insights read reading posts writing guide tips`));

    return docs;
  }
}
