// Shapes of the public API payloads (backend/src/content/content.service.ts).

export type Pair = [string, string];

export interface Company {
  name: string; website: string; websiteUrl: string; email: string; careersEmail: string; phone: string; phoneHref: string;
  whatsappUrl: string; address: string; hours: string; instagramUrl?: string; facebookUrl?: string; linkedinUrl?: string;
}

export interface Settings {
  company: Company;
  hero?: { eyebrow: string; headline: string; sub: string };
  stats?: { projects?: number; clients?: number; specialistsMin?: number; specialistsMax?: number; services?: number };
  why?: { n: string; t: string; d: string }[];
  timeline?: { k: string; t: string }[];
  values?: { t: string; d: string }[];
  facts?: { k: string; v: string }[];
  teamRoles?: string[];
  hiring?: { n: string; t: string; d: string; icon?: string }[];
  budgets: string[];
  timelines: string[];
  projectTypes: string[];
  heardFrom: string[];
  processGroups?: { stage: number; label: string; verb: string; stageLabel: string; sum: string }[];
  productDetails?: Record<string, { features: string[]; bestFor: string }>;
}

export interface ServiceCard {
  id: number; slug: string; num: string; name: string; pillar: 'Build' | 'Brand' | 'Grow'; icon: string; line: string; tagline: string;
}

export interface Technology { id: number; name: string; group: string }

export interface ProjectCard {
  id: number; slug: string; title: string; client: string; year: number | null; summary: string;
  category: { id: number; slug: string; name: string } | null; technologies: Technology[];
  coverImage: string | null; coverAlt: string; coverPos: string; videoUrl: string; caseStudy: boolean; featured: boolean; liveUrl: string;
}

export interface Testimonial {
  id: number; clientName: string; company: string; position: string; body: string; image: string | null; rating: number | null;
  projectId: number | null; featured: boolean;
}

export interface Step { id: number; num: string; title: string; description: string; stage: number; outputs?: string[] }

export interface Faq { slug: string; question: string; answer: string }
export interface FaqGroup { id: number; title: string; faqs: Faq[] }

export interface Site {
  settings: Settings; services: ServiceCard[]; hasProjects: boolean; hasTestimonials: boolean; openRoles: number;
}

export interface HomeData {
  services: ServiceCard[]; projects: ProjectCard[]; testimonials: Testimonial[]; steps: Step[]; technologies: Technology[]; faqs: Faq[];
}

export interface ServiceDetail extends ServiceCard {
  intro: string; outcomes: Pair[]; deliverables: string[]; idealFor: string[]; process: Pair[]; timeline: string; budget: string;
  addOns: string[]; faqs: Pair[]; img: string | null; alt: string; pos: string; seoTitle: string; seoDescription: string; updatedAt: string;
  technologies: Technology[]; projects: ProjectCard[]; related: ServiceCard[];
  products: { name: string; tag: string; icon: string; features?: string[]; bestFor?: string }[];
}

export interface ProjectDetail extends ProjectCard {
  overview: string; challenge: string; solution: string; features: string[]; results: string[]; process: Pair[];
  gallery: { src: string; alt: string }[]; seoTitle: string; seoDescription: string; services: ServiceCard[];
  testimonial: Testimonial | null; next: ProjectCard | null;
}

export interface Block { type: 'standfirst' | 'p' | 'h2' | 'quote' | 'takeaways' | 'list' | 'checklist' | 'callout'; text: string }

export interface ArticleCard {
  id: number; slug: string; title: string; category: string; author: string; publishedAt: string; readTime: string;
  img: string | null; alt: string; pos: string; standfirst: string;
}
export interface Article extends ArticleCard { blocks: Block[]; more: ArticleCard[] }

export interface Page { slug: string; title: string; summary: string; blocks: Block[]; updatedAt: string }

export interface Role { id: number; title: string; meta: string[]; description: string }

export interface Industry { id: number; name: string; problem: string; builds: string[] }
