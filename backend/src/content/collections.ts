/**
 * Registry of the editable content collections. One definition drives:
 *  - row ⇄ API object mapping (snake_case columns → camelCase keys, JSON columns)
 *  - validation for admin create/update
 *  - the public read endpoints and the admin dashboard's generated forms
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'list' | 'blocks' | 'select' | 'image' | 'ref';

export interface FieldDef {
  key: string;
  column: string;
  type: FieldType;
  label: string;
  required?: boolean;
  nullable?: boolean;
  options?: (string | number)[];
  ref?: { collection: string; labelKey: string };
  pattern?: RegExp;
  patternHint?: string;
  help?: string;
  max?: number;
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
}

const f = (key: string, type: FieldType, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  column: key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()),
  type,
  label,
  ...extra,
});
const common = [
  f('sort', 'number', 'Sort order', { help: 'Lower numbers show first' }),
  f('active', 'boolean', 'Published', { help: 'Unpublished items are hidden from the website' }),
];
const media = [
  f('img', 'image', 'Image path', { nullable: true, help: 'e.g. /assets/ecommerce.png — leave empty to show the placeholder' }),
  f('alt', 'text', 'Image alt text'),
  f('pos', 'text', 'Image focal point', { help: 'CSS object-position, e.g. "center 40%"' }),
];
const PILLARS = ['Build', 'Brand', 'Grow'];
const SLUG = { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, patternHint: 'lowercase letters, numbers and dashes' };

export const COLLECTIONS: CollectionDef[] = [
  {
    name: 'services', table: 'services', label: 'Services', titleKey: 'name', orderBy: 'sort, id',
    search: ['name', 'line'], filters: ['pillar'],
    fields: [
      f('num', 'text', 'Number', { required: true, max: 4 }),
      f('name', 'text', 'Name', { required: true, max: 80 }),
      f('pillar', 'select', 'Pillar', { required: true, options: PILLARS }),
      f('line', 'textarea', 'One-line description', { max: 240 }),
      f('icon', 'text', 'Material icon', { help: 'Material Symbols name, e.g. language' }),
      ...media, ...common,
    ],
  },
  {
    name: 'products', table: 'products', label: 'Products', titleKey: 'name', orderBy: 'sort, id',
    search: ['name', 'tag'], filters: [],
    fields: [
      f('name', 'text', 'Name', { required: true, max: 80 }),
      f('tag', 'text', 'Tagline', { max: 120 }),
      f('icon', 'text', 'Material icon'),
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
    name: 'work', table: 'work_items', label: 'Work', titleKey: 'client', orderBy: 'sort, id',
    search: ['client', 'outcome'], filters: ['pillar', 'featured'],
    fields: [
      f('client', 'text', 'Client', { required: true, max: 120 }),
      f('pillar', 'select', 'Pillar', { required: true, options: PILLARS }),
      f('scope', 'list', 'Scope', { help: 'One per line' }),
      f('outcome', 'textarea', 'Outcome', { max: 400 }),
      f('featured', 'boolean', 'Show on home page'),
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
    name: 'articles', table: 'articles', label: 'Insights', titleKey: 'title', orderBy: 'sort, id',
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
      f('answer', 'textarea', 'Answer', { nullable: true, max: 2000, help: 'Leave empty to show "[Answer required from ASPR]"' }),
      f('featured', 'number', 'Home page position', { help: '1–4 shows it in the home page FAQ; 0 hides it there' }),
      ...common,
    ],
  },
  {
    name: 'packages', table: 'packages', label: 'Packages', titleKey: 'name', orderBy: 'sort, id',
    search: ['name', 'outcome'], filters: [],
    fields: [
      f('name', 'text', 'Name', { required: true, max: 60 }),
      f('services', 'list', 'Matching needs', { help: 'Exact labels from "Needs", one per line' }),
      f('outcome', 'textarea', 'Outcome', { max: 240 }),
      f('price', 'text', 'Pricing note', { max: 120 }),
      ...common,
    ],
  },
  {
    name: 'needs', table: 'needs', label: 'Brief needs', titleKey: 'label', orderBy: 'sort, id',
    search: ['label'], filters: [],
    fields: [f('label', 'text', 'Label', { required: true, max: 40 }), f('icon', 'text', 'Material icon'), ...common],
  },
];

export function getCollection(name: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.name === name);
}

/** JSON-safe description for the admin UI. */
export function describeCollections() {
  return COLLECTIONS.map((c) => ({
    name: c.name, label: c.label, titleKey: c.titleKey, filters: c.filters,
    fields: c.fields.map(({ pattern, column, ...rest }) => ({ ...rest, pattern: pattern ? pattern.source : undefined })),
  }));
}
