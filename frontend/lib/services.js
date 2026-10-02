// Service URL slugs ("SaaS & Software Solutions" → "saas-and-software-solutions").
// Must match the backend's slugs in serviceDetails and the chat knowledge base.
export const serviceSlug = (name) =>
  String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const serviceHref = (name) => `/services/${serviceSlug(name)}`;
