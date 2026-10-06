/**
 * Registry of the editable content collections. One definition drives:
 *  - row ⇄ API object mapping (snake_case columns → camelCase keys, JSON columns)
 *  - validation for admin create/update
 *  - the public read endpoints and the admin dashboard's generated forms
 */
export type FieldType =
  | 'text' | 'textarea' | 'number' | 'boolean' | 'list' | 'blocks' | 'select' | 'image' | 'ref'
  /** [label, text] rows, e.g. FAQ question/answer or process step/description */
  | 'pairs'
  /** [{ src, alt }] images and videos */
  | 'gallery'
  /** many-to-many link through a join table (no column of its own) */
  | 'refs';

export interface FieldDef {
  key: string;
  column: string;
  type: FieldType;
  label: string;
  required?: boolean;
  nullable?: boolean;
  options?: (string | number)[];
  ref?: { collection: string; labelKey: string };
  /** refs: join table, this collection's id column, the other collection's id column */
  through?: { table: string; own: string; other: string };
  /** pairs: labels for the two inputs */
  pairLabels?: [string, string];
  pattern?: RegExp;
  patternHint?: string;
  help?: string;
  max?: number;
  min?: number;
  /** admin form grouping */
  section?: string;
}

export interface CollectionDef {
  name: string;
  table: string;
  label: string;
  titleKey: string;
  fields: FieldDef[];
  search: string[]; // columns searched by ?q=
  filters: string[]; // api keys filterable by exact value (?pillar=Build)
  orderBy: string;
  /** Path on the public site for an item, used for "view on site" links. */
  publicPath?: string;
}

const f = (key: string, type: FieldType, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  column: key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()),
  type,
  label,
  ...extra,
});
const common = [
  f('sort', 'number', 'Sort order', { help: 'Lower numbers show first', section: 'Publishing' }),
  f('active', 'boolean', 'Published', { help: 'Unpublished items are hidden from the website', section: 'Publishing' }),
];
const media = [
  f('img', 'image', 'Image', { nullable: true, help: 'Upload in Media, or a path such as /assets/ecommerce.png', section: 'Image' }),
  f('alt', 'text', 'Image alt text', { max: 200, help: 'Describe the image for screen readers', section: 'Image' }),
  f('pos', 'text', 'Image focal point', { help: 'CSS object-position, e.g. "center 40%"', section: 'Image' }),
];
const seo = [
  f('seoTitle', 'text', 'SEO title', { max: 70, help: 'Leave empty to use the name. Around 60 characters.', section: 'SEO' }),
  f('seoDescription', 'textarea', 'SEO description', { max: 170, help: 'Shown in search results. Around 155 characters.', section: 'SEO' }),
];
const PILLARS = ['Build', 'Brand', 'Grow'];
const SLUG = { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, patternHint: 'lowercase letters, numbers and dashes' };
/** Icon names the website knows how to draw (lucide icon set). */
export const ICONS = ['globe', 'box', 'layout-dashboard', 'cpu', 'smartphone', 'pen-tool', 'workflow', 'palette', 'bot', 'gamepad-2',
  'clapperboard', 'search', 'code', 'layers', 'shopping-cart', 'database', 'cloud', 'sparkles', 'receipt', 'users', 'package', 'landmark',
  'shield-check', 'rocket', 'zap', 'line-chart'];
export const TECH_GROUPS = ['frontend', 'backend', 'database', 'mobile', '3d', 'infrastructure', 'design', 'platforms'];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: 'services', table: 'services', label: 'Services', titleKey: 'name', orderBy: 'sort, id', publicPath: '/services/:slug',
    search: ['name', 'line', 'tagline'], filters: ['pillar'],
    fields: [
      f('name', 'text', 'Name', { required: true, max: 80 }),
      f('slug', 'text', 'URL slug', { required: true, max: 80, ...SLUG, help: 'The page lives at /services/<slug>' }),
      f('num', 'text', 'Number', { required: true, max: 4 }),
      f('pillar', 'select', 'Pillar', { required: true, options: PILLARS }),
      f('icon', 'select', 'Icon', { required: true, options: ICONS }),
      f('line', 'textarea', 'Short description', { max: 240, help: 'One sentence for cards and menus' }),
      f('tagline', 'text', 'Page headline', { max: 160, section: 'Detail page' }),
      f('intro', 'textarea', 'Introduction', { max: 1200, section: 'Detail page' }),
      f('outcomes', 'pairs', 'Highlights', { pairLabels: ['Value', 'Label'], help: 'Short facts shown under the headline, e.g. "Mobile" / "fallbacks for every device"', section: 'Detail page' }),
      f('deliverables', 'list', 'What we build', { help: 'One per line', section: 'Detail page' }),
      f('idealFor', 'list', 'Ideal for', { help: 'One per line', section: 'Detail page' }),
      f('process', 'pairs', 'Process', { pairLabels: ['Step', 'Description'], section: 'Detail page' }),
      f('timeline', 'text', 'Typical timeline', { max: 120, section: 'Detail page' }),
      f('budget', 'text', 'Typical budget', { max: 200, section: 'Detail page' }),
      f('addOns', 'list', 'Add-ons', { help: 'One per line', section: 'Detail page' }),
      f('technologies', 'refs', 'Technologies', { ref: { collection: 'technologies', labelKey: 'name' }, through: { table: 'service_technologies', own: 'service_id', other: 'technology_id' }, section: 'Detail page' }),
      f('faqs', 'pairs', 'FAQs', { pairLabels: ['Question', 'Answer'], section: 'Detail page' }),
      ...media, ...seo, ...common,
    ],
  },
  {
    name: 'projects', table: 'projects', label: 'Portfolio', titleKey: 'title', orderBy: 'sort, id', publicPath: '/portfolio/:slug',
    search: ['title', 'client', 'summary'], filters: ['categoryId', 'featured', 'caseStudy'],
    fields: [
      f('title', 'text', 'Project title', { required: true, max: 140 }),
      f('slug', 'text', 'URL slug', { required: true, max: 100, ...SLUG, help: 'The case study lives at /portfolio/<slug>' }),
      f('client', 'text', 'Client', { max: 140, help: 'Only name a client who has agreed to it' }),
      f('categoryId', 'ref', 'Category', { required: true, ref: { collection: 'project-categories', labelKey: 'name' } }),
      f('year', 'number', 'Year', { nullable: true, min: 2000, max: 2100 }),
      f('summary', 'textarea', 'Short description', { max: 300, help: 'One or two sentences for the portfolio card' }),
      f('technologies', 'refs', 'Technologies', { ref: { collection: 'technologies', labelKey: 'name' }, through: { table: 'project_technologies', own: 'project_id', other: 'technology_id' } }),
      f('services', 'refs', 'Services', { ref: { collection: 'services', labelKey: 'name' }, through: { table: 'project_services', own: 'project_id', other: 'service_id' }, help: 'Shown as example work on these service pages' }),
      f('coverImage', 'image', 'Cover image', { nullable: true, section: 'Media' }),
      f('coverAlt', 'text', 'Cover alt text', { max: 200, section: 'Media' }),
      f('coverPos', 'text', 'Cover focal point', { help: 'CSS object-position, e.g. "center top"', section: 'Media' }),
      f('gallery', 'gallery', 'Gallery', { help: 'Large screenshots or videos for the case study', section: 'Media' }),
      f('videoUrl', 'text', 'Video URL', { max: 500, pattern: /^(\/api\/media\/[\w.-]+|https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/\S+)?$/, patternHint: 'an uploaded video (/api/media/…) or a YouTube or Vimeo link', help: 'Optional. An uploaded video (/api/media/…) or a YouTube/Vimeo link', section: 'Media' }),
      f('liveUrl', 'text', 'Live site URL', { max: 500, pattern: /^(https?:\/\/\S+)?$/, patternHint: 'a full https:// address', section: 'Media' }),
      f('caseStudy', 'boolean', 'Has a case study page', { help: 'Turn on once overview, challenge and solution are written', section: 'Case study' }),
      f('overview', 'textarea', 'Project overview', { max: 3000, section: 'Case study' }),
      f('challenge', 'textarea', 'Challenge', { max: 3000, section: 'Case study' }),
      f('solution', 'textarea', 'Solution', { max: 3000, section: 'Case study' }),
      f('features', 'list', 'Key features', { help: 'One per line', section: 'Case study' }),
      f('process', 'pairs', 'Development process', { pairLabels: ['Stage', 'What happened'], section: 'Case study' }),
      f('results', 'list', 'Results', { help: 'Only real, measurable results. One per line.', section: 'Case study' }),
      f('featured', 'boolean', 'Feature on the home page', { section: 'Publishing' }),
      ...seo, ...common,
    ],
  },
  {
    name: 'project-categories', table: 'project_categories', label: 'Portfolio categories', titleKey: 'name', orderBy: 'sort, id',
    search: ['name'], filters: [],
    fields: [
      f('name', 'text', 'Name', { required: true, max: 40 }),
      f('slug', 'text', 'Filter slug', { required: true, max: 40, ...SLUG }),
      ...common,
    ],
  },
  {
    name: 'technologies', table: 'technologies', label: 'Technologies', titleKey: 'name', orderBy: 'grp, sort, id',
    search: ['name'], filters: ['grp'],
    fields: [
      f('name', 'text', 'Name', { required: true, max: 40 }),
      f('grp', 'select', 'Group', { required: true, options: TECH_GROUPS }),
      ...common,
    ],
  },
  {
    name: 'testimonials', table: 'testimonials', label: 'Testimonials', titleKey: 'clientName', orderBy: 'sort, id',
    search: ['client_name', 'company', 'body'], filters: ['featured'],
    fields: [
      f('clientName', 'text', 'Client name', { required: true, max: 120 }),
      f('company', 'text', 'Company', { max: 120 }),
      f('position', 'text', 'Position', { max: 120 }),
      f('body', 'textarea', 'Testimonial', { required: true, max: 1200, help: "The client's own words, unedited apart from typos" }),
      f('image', 'image', 'Photo', { nullable: true }),
      f('rating', 'number', 'Rating (1–5)', { nullable: true, min: 1, max: 5, help: 'Only if the client gave one' }),
      f('projectId', 'ref', 'Related project', { nullable: true, ref: { collection: 'projects', labelKey: 'title' } }),
      f('consent', 'boolean', 'Client approved publishing', { help: 'Required before the testimonial can be published' }),
      f('featured', 'boolean', 'Feature on the home page'),
      ...common,
    ],
  },
  {
    name: 'products', table: 'products', label: 'Products', titleKey: 'name', orderBy: 'sort, id',
    search: ['name', 'tag'], filters: [],
    fields: [
      f('name', 'text', 'Name', { required: true, max: 80 }),
      f('tag', 'text', 'Tagline', { max: 120 }),
      f('icon', 'text', 'Icon', { help: 'Icon name, e.g. receipt' }),
      ...media, ...common,
    ],
  },
  {
    name: 'industries', table: 'industries', label: 'Industries', titleKey: 'name', orderBy: 'sort, id',
    search: ['name', 'problem'], filters: [],
    fields: [
      f('name', 'text', 'Industry', { required: true, max: 60 }),
      f('problem', 'textarea', 'The problem', { max: 240 }),
      f('builds', 'list', 'What we build', { help: 'One per line' }),
      ...media, ...common,
    ],
  },
  {
    name: 'steps', table: 'process_steps', label: 'Process steps', titleKey: 'title', orderBy: 'stage, sort, id',
    search: ['title', 'description'], filters: ['stage'],
    fields: [
      f('num', 'text', 'Number', { required: true, max: 4 }),
      f('title', 'text', 'Title', { required: true, max: 60 }),
      f('description', 'textarea', 'Description', { max: 300 }),
      f('outputs', 'list', 'You get', { help: 'One per line' }),
      f('stage', 'select', 'Stage', { required: true, options: [1, 2, 3], help: '1 Think it · 2 Build it · 3 Scale it' }),
      ...common,
    ],
  },
  {
    name: 'roles', table: 'roles', label: 'Open roles', titleKey: 'title', orderBy: 'sort, id',
    search: ['title', 'description'], filters: [],
    fields: [
      f('title', 'text', 'Role', { required: true, max: 80 }),
      f('meta', 'list', 'Tags', { help: 'Location, type, stack — one per line' }),
      f('description', 'textarea', 'Description', { max: 4000 }),
      ...common,
    ],
  },
  {
    name: 'articles', table: 'articles', label: 'Insights', titleKey: 'title', orderBy: 'sort, id', publicPath: '/insights/:slug',
    search: ['title', 'author', 'blocks'], filters: ['category'],
    fields: [
      f('slug', 'text', 'URL slug', { required: true, max: 120, ...SLUG }),
      f('title', 'text', 'Title', { required: true, max: 160 }),
      f('category', 'select', 'Category', { required: true, options: ['Build', 'Brand', 'Grow', 'Process', 'Studio'] }),
      f('author', 'text', 'Author'),
      f('publishedAt', 'text', 'Date', { help: 'Shown as written, e.g. 12 Sep 2026' }),
      f('readTime', 'text', 'Read time', { help: 'e.g. 4 min read' }),
      f('blocks', 'blocks', 'Body', { help: 'Standfirst, paragraphs, subheadings and pull quotes' }),
      ...media, ...common,
    ],
  },
  {
    name: 'faq-groups', table: 'faq_groups', label: 'FAQ groups', titleKey: 'title', orderBy: 'sort, id',
    search: ['title'], filters: [],
    fields: [f('title', 'text', 'Group title', { required: true, max: 80 }), ...common],
  },
  {
    name: 'faqs', table: 'faqs', label: 'FAQs', titleKey: 'question', orderBy: 'sort, id',
    search: ['question', 'answer'], filters: ['groupId', 'featured'],
    fields: [
      f('slug', 'text', 'Link id', { required: true, max: 60, ...SLUG }),
      f('groupId', 'ref', 'Group', { required: true, ref: { collection: 'faq-groups', labelKey: 'title' } }),
      f('question', 'text', 'Question', { required: true, max: 200 }),
      f('answer', 'textarea', 'Answer', { nullable: true, max: 2000, help: 'Questions without an answer are hidden on the website' }),
      f('featured', 'number', 'Home page position', { help: '1–4 shows it in the home page FAQ; 0 hides it there' }),
      ...common,
    ],
  },
  {
    name: 'pages', table: 'pages', label: 'Pages', titleKey: 'title', orderBy: 'sort, id', publicPath: '/:slug',
    search: ['title', 'blocks'], filters: [],
    fields: [
      f('title', 'text', 'Title', { required: true, max: 120 }),
      f('slug', 'text', 'URL slug', { required: true, max: 80, ...SLUG }),
      f('summary', 'textarea', 'Summary', { max: 300, help: 'Used as the search-result description' }),
      f('blocks', 'blocks', 'Body'),
      ...common,
    ],
  },
];

export function getCollection(name: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.name === name);
}

/** JSON-safe description for the admin UI. */
export function describeCollections() {
  return COLLECTIONS.map((c) => ({
    name: c.name, label: c.label, titleKey: c.titleKey, filters: c.filters, publicPath: c.publicPath,
    fields: c.fields.map(({ pattern, column, through, ...rest }) => ({ ...rest, pattern: pattern ? pattern.source : undefined })),
  }));
}
