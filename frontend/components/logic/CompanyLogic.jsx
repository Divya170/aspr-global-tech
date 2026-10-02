'use client';
// Company section behaviour (About, Process, Work, Careers, Insights, FAQ, Contact).
// Ported from the design's logic class: the same hash router (#work, #faq/own,
// #insights/<slug>…), filters, accordions and forms — with content from the
// backend and real submissions for the contact brief and job applications.
import { SHOW_WORK } from '../../lib/flags';
import React from 'react';
import CompanyView from '../views/CompanyView';
import { applicationErrors, briefErrors, fileError, suggestPackage } from '../../lib/rules';
import { COUNTRIES, DEFAULT_COUNTRY, findCountry, fullPhone, guessCountry } from '../../lib/countries';
import { submitApplication, submitEnquiry, subscribe } from '../../lib/api';

const ROYAL = '#1A4AD8', INK = '#111F38';
const ALL_PAGES = [['about', 'About', 'info'], ['process', 'Process', 'account_tree'], ['work', 'Work', 'work'], ['careers', 'Careers', 'badge'], ['insights', 'Insights', 'article'], ['faq', 'FAQ', 'help'], ['contact', 'Contact', 'mail']];
const PAGE_TITLES = { about: 'About Us', process: 'Our Process', work: 'Our Work', careers: 'Careers', insights: 'Insights', faq: 'FAQ', contact: 'Contact Us' };
const PAGES = ALL_PAGES.filter(([id]) => SHOW_WORK || id !== 'work');
const EMPTY_C = { needs: [], name: '', email: '', country: DEFAULT_COUNTRY, phone: '', company: '', budget: '', message: '', files: [] };
const EMPTY_A = { name: '', email: '', phone: '', portfolio: '', message: '', files: [] };

export default class CompanyLogic extends React.Component {
  state = { page: 'about', w: 1280, menu: false, dd: false, workF: 'All', insF: 'All', art: null, faq: {}, role: -1,
    a: { ...EMPTY_A }, aTried: false, aSent: -1, aRef: '', aBusy: false, aErr: '', aServer: {},
    c: { ...EMPTY_C }, cTried: false, cSent: false, cBusy: false, cErr: '', cServer: {}, refNo: '', prog: 0,
    sub: { email: '', busy: false, done: false, already: false, err: '' } };
  artRef = React.createRef();

  get k() { return this.props.content; }

  componentDidMount() {
    this.country = guessCountry(); this.setState((x) => ({ c: { ...x.c, country: x.c.phone ? x.c.country : this.country } }));
    this._r = () => this.setState({ w: window.innerWidth }); this._r(); window.addEventListener('resize', this._r);
    this._h = () => this.route(); window.addEventListener('hashchange', this._h); this.route();
    this._s = () => {
      const el = this.artRef.current; if (!el) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.25 - r.top) / Math.max(1, r.height - vh * 0.6)));
      if (Math.abs(p - this.state.prog) > 0.004) this.setState({ prog: p });
    };
    document.addEventListener('scroll', this._s, { capture: true, passive: true });
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this._r); window.removeEventListener('hashchange', this._h);
    document.removeEventListener('scroll', this._s, { capture: true });
  }
  scrollTop(y) { window.scrollTo(0, y || 0); if (document.scrollingElement) document.scrollingElement.scrollTop = y || 0; }
  route() {
    const h = decodeURIComponent(location.hash.slice(1)), [pg, sub] = h.split('/');
    const ids = PAGES.map((p) => p[0]);
    const page = ids.includes(pg) ? pg : 'about';
    const st = { page, menu: false, dd: false, prog: 0 };
    if (page === 'insights') st.art = sub ? sub : null;
    if (page === 'faq' && sub) st.faq = { ...this.state.faq, [sub]: true };
    // Keep the browser tab title in step with the hash route.
    const art = page === 'insights' && sub ? (this.k.articles || []).find((x) => x.slug === sub) : null;
    document.title = `${art ? art.title : PAGE_TITLES[page] || 'About Us'} · ASPR Global Tech`;
    this.setState(st, () => {
      const target = sub && page !== 'insights' && (document.getElementById((page === 'faq' ? 'q-' : '') + sub) || document.getElementById(sub));
      if (target) setTimeout(() => this.scrollTop(target.getBoundingClientRect().top + window.scrollY - 110), 30);
      else this.scrollTop(0);
    });
  }
  go(hash) { return (e) => { if (e && e.preventDefault) e.preventDefault(); if (location.hash === hash) this.route(); else location.hash = hash; }; }

  cErrors() { const e = briefErrors(this.state.c, 'all'); for (const [k, v] of Object.entries(this.state.cServer)) if (!e[k]) e[k] = v; return e; }
  aErrors() { const e = applicationErrors(this.state.a); for (const [k, v] of Object.entries(this.state.aServer)) if (!e[k]) e[k] = v; return e; }

  fieldKit(key, errs) {
    const f = this.state[key], serverKey = key === 'a' ? 'aServer' : 'cServer';
    const upd = (patch) => this.setState((x) => ({ [key]: { ...x[key], ...patch(x[key]) }, [serverKey]: {} }));
    const set = (k) => (e) => { const v = e.target.value; upd(() => ({ [k]: v })); };
    const on = {}; Object.keys(f).forEach((k) => { if (k !== 'files' && k !== 'needs') on[k] = set(k); });
    on.files = (e) => { const picked = [...(e.target.files || [])]; e.target.value = ''; upd((x) => ({ files: [...x.files, ...picked] }));
      if (fileError([...f.files, ...picked])) this.setState({ [key === 'a' ? 'aTried' : 'cTried']: true }); };
    const has = {}, bd = {}, err = {};
    [...Object.keys(f), 'files'].forEach((k) => { has[k] = !!errs[k]; err[k] = errs[k] || ''; bd[k] = errs[k] ? '#B42318' : '#E3E8F2'; });
    const files = f.files.map((file, i) => ({ name: file.name, remove: () => upd((x) => ({ files: x.files.filter((_, j) => j !== i) })) }));
    return { f, on, has, bd, err, files, errList: Object.values(errs), upd };
  }

  async sendContact(e) {
    e.preventDefault();
    if (this.state.cBusy) return;
    if (Object.keys(briefErrors(this.state.c, 'all')).length) { this.setState({ cTried: true }); return; }
    const c = this.state.c;
    this.setState({ cBusy: true, cErr: '' });
    try {
      const res = await submitEnquiry({ source: 'contact-page', needs: c.needs, name: c.name, email: c.email, phone: fullPhone(c.country, c.phone), company: c.company,
        contactMethod: 'Email', budget: c.budget, timeline: '', message: c.message }, c.files);
      this.setState({ cBusy: false, cSent: true, cTried: false, refNo: res.refNo }); this.scrollTop(0);
    } catch (err) {
      this.setState({ cBusy: false, cErr: err.fieldErrors ? '' : err.message, cServer: err.fieldErrors || {}, cTried: !!err.fieldErrors });
    }
  }
  async sendApplication(e, i, role) {
    e.preventDefault();
    if (this.state.aBusy) return;
    if (Object.keys(applicationErrors(this.state.a)).length) return this.setState({ aTried: true });
    const a = this.state.a;
    this.setState({ aBusy: true, aErr: '' });
    try {
      const res = await submitApplication(role.id, { name: a.name, email: a.email, phone: a.phone, portfolio: a.portfolio, message: a.message }, a.files);
      this.setState({ aBusy: false, aSent: i, aRef: res.refNo, aTried: false, a: { ...EMPTY_A } });
    } catch (err) {
      this.setState({ aBusy: false, aErr: err.fieldErrors ? '' : err.message, aServer: err.fieldErrors || {}, aTried: !!err.fieldErrors });
    }
  }
  async doSubscribe(e) {
    e.preventDefault();
    const email = this.state.sub.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return this.setState((x) => ({ sub: { ...x.sub, err: email ? 'That email looks incomplete — check for a missing @ or domain.' : 'Enter an email address.' } }));
    this.setState((x) => ({ sub: { ...x.sub, busy: true, err: '' } }));
    try {
      const r = await subscribe(email, 'footer-' + this.state.page);
      this.setState((x) => ({ sub: { ...x.sub, busy: false, done: true, already: !!r.alreadySubscribed } }));
    } catch (err) {
      this.setState((x) => ({ sub: { ...x.sub, busy: false, err: (err.fieldErrors && err.fieldErrors.email) || err.message } }));
    }
  }

  renderVals() {
    const s = this.state, w = s.w, mobile = w < 760, desktop = w >= 1024, K = this.k, st = K.settings, co = st.company;
    const is = (p) => s.page === p;
    const pagesNav = PAGES.map(([id, label, icon]) => ({ label, icon, href: '#' + id, bg: is(id) ? '#EAF0FD' : 'transparent', fg: is(id) ? ROYAL : INK }));
    const chip = (on) => ({ bg: on ? INK : '#fff', fg: on ? '#fff' : INK, bd: on ? INK : '#E3E8F2' });

    // about
    const timeline = st.timeline.map(({ k, t }, i, arr) => ({ k, t, line: i < arr.length - 1 ? ROYAL : '#C9D3E6', dot: i === arr.length - 2 ? ROYAL : '#fff', kc: i === arr.length - 2 ? ROYAL : INK }));
    const values = st.values.map((x, i) => ({ n: String(i + 1).padStart(2, '0'), t: x.t, d: x.d }));

    // process
    const stepIndex = K.steps.map((x) => ({ n: x.num, t: x.title, href: '#process/step-' + x.num, go: this.go('#process/step-' + x.num) }));
    const processGroups = st.processGroups.map((g, i) => ({ stage: g.stageLabel, verb: g.verb, sum: g.sum, bg: i % 2 ? '#F5F7FB' : '#fff',
      steps: K.steps.filter((x) => x.stage === g.stage).map((x) => ({ n: x.num, t: x.title, d: x.description, out: x.outputs, id: 'step-' + x.num })) }));

    // work
    const workFilters = ['All', 'Build', 'Brand', 'Grow'].map((label) => ({ label, on: s.workF === label, ...chip(s.workF === label),
      count: label === 'All' ? K.work.length : K.work.filter((x) => x.pillar === label).length, pick: () => this.setState({ workF: label }) }));
    const work = K.work.filter((x) => s.workF === 'All' || x.pillar === s.workF).map((x) => ({ client: x.client, scope: x.scope, pillar: x.pillar.toUpperCase(), outcome: x.outcome, img: x.img, alt: x.alt, pos: x.pos }));

    // careers
    const ak = this.fieldKit('a', s.aTried ? this.aErrors() : {});
    const roles = K.roles.map((role, i) => { const open = s.role === i;
      return { t: role.title, meta: role.meta, desc: role.description, open, sent: s.aSent === i, notSent: s.aSent !== i, sign: open ? '−' : '+', bd: open ? ROYAL : '#E3E8F2', tileBg: open ? ROYAL : '#EAF0FD', tileFg: open ? '#fff' : ROYAL,
        toggle: () => this.setState({ role: open ? -1 : i, aTried: false, aErr: '', aServer: {} }),
        busy: s.aBusy, submitLabel: s.aBusy ? 'Sending…' : 'Send application →', submitErr: open ? s.aErr : '', refNo: s.aRef,
        again: () => this.setState({ role: -1, aSent: -1, aRef: '' }),
        submit: (e) => this.sendApplication(e, i, role) }; });
    const hiring = st.hiring;

    // insights
    const cats = ['All', 'Build', 'Brand', 'Grow', 'Process', 'Studio'];
    const insFilters = cats.map((label) => ({ label, on: s.insF === label, ...chip(s.insF === label), count: label === 'All' ? K.articles.length : K.articles.filter((x) => x.category === label).length, pick: () => this.setState({ insF: label }) }));
    const meta = (x) => [x.author, x.publishedAt, x.readTime].filter(Boolean).join(' · ');
    const artObj = (x) => ({ slug: x.slug, author: x.author, date: x.publishedAt, readTime: x.readTime, excerpt: ((x.blocks || []).find((b) => b.type === 'standfirst') || {}).text || '',
      t: x.title, cat: x.category.toUpperCase(), rawCat: x.category, img: x.img, hasImg: !!x.img, noImg: !x.img, alt: x.alt, meta: meta(x), href: '#insights/' + x.slug, open: this.go('#insights/' + x.slug),
      blocks: (x.blocks || []).map((b, i, arr) => ({ ...b, isStandfirst: b.type === 'standfirst', isP: b.type === 'p', isH2: b.type === 'h2', isQuote: b.type === 'quote', pm: i === arr.length - 1 ? '0' : '0 0 24px' })) });
    const all = K.articles.map(artObj);
    const articles = all.filter((a) => s.insF === 'All' || a.rawCat === s.insF);
    const artIdx = s.art != null ? K.articles.findIndex((x) => x.slug === s.art || String(K.articles.indexOf(x)) === s.art) : -1;
    const art = artIdx >= 0 ? all[artIdx] : null;
    const related = art ? all.filter((_, i) => i !== artIdx).sort((a, b) => (b.cat === art.cat) - (a.cat === art.cat)).slice(0, 3) : [];

    // faq
    const faqGroups = K.faqGroups.map((g, gi) => ({ g: g.title, id: 'faq-g' + gi, href: '#faq/g' + gi, n: String(gi + 1).padStart(2, '0'), count: g.faqs.length + ' questions',
      qs: g.faqs.map(({ slug, question, answer }) => { const open = !!s.faq[slug];
        return { id: 'q-' + slug, link: '#faq/' + slug, q: question, a: answer || '', hasA: open && !!answer, noA: open && !answer, open, sign: open ? '−' : '+', tileBg: open ? ROYAL : '#EAF0FD', tileFg: open ? '#fff' : ROYAL,
          toggle: () => this.setState((x) => ({ faq: { ...x.faq, [slug]: !x.faq[slug] } })) }; }) }));
    const faqIndex = faqGroups.map((g) => ({ g: g.g, n: g.n, href: '#faq/' + g.id, go: this.go('#faq/' + g.id) }));

    // contact
    const ck = this.fieldKit('c', s.cTried ? this.cErrors() : {});
    const needChips = K.needs.map(({ label, icon }) => { const sel = s.c.needs.includes(label);
      return { label, icon, on: sel, bd: sel ? ROYAL : (ck.has.needs ? '#F4C7C3' : '#E3E8F2'), bg: sel ? '#EAF0FD' : '#fff', tile: sel ? ROYAL : '#EAF0FD', ic: sel ? '#fff' : ROYAL, box: sel ? ROYAL : '#fff', tick: sel ? '✓' : '',
        toggle: () => ck.upd((x) => ({ needs: sel ? x.needs.filter((n) => n !== label) : [...x.needs, label] })) }; });
    const budgetOpts = st.budgets.map((label) => { const on = s.c.budget === label;
      return { label, on, ...chip(on), pick: () => ck.upd(() => ({ budget: on ? '' : label })) }; });
    const p = suggestPackage(K.packages, s.c.needs);
    const pkg = p ? { ...p, services: p.servicesLabel } : null;

    const ctaMap = {
      about: ['LET\'S BUILD SOMETHING GREAT.', 'Have an idea, a business challenge, or a product to build? Let\'s turn it into a digital solution.', 'Start a project →', '#contact'],
      process: ['START WITH DISCOVER.', 'Tell us what the business needs. We\'ll come back with scope, price and timeline — in writing.', 'Start a project →', '#contact'],
      work: ['YOUR PROJECT COULD BE NEXT.', 'Have an idea, a business challenge, or a product to build? Let\'s turn it into a digital solution.', 'Start a project →', '#contact'],
      careers: ['DON\'T SEE YOUR ROLE?', `Send your work to ${co.careersEmail}. Skill over syllabus, always.`, 'Email careers →', 'mailto:' + co.careersEmail],
      insights: ['LET\'S BUILD SOMETHING GREAT.', 'Have an idea, a business challenge, or a product to build? Let\'s turn it into a digital solution.', 'Start a project →', '#contact'],
      faq: ['STILL HAVE A QUESTION?', 'Ask us directly. We reply to every enquiry within one working day.', 'Start a project →', '#contact'],
    };
    const cta = ctaMap[s.page] || ctaMap.about;
    const footLink = (t, href) => ({ t, href, c: href === '#' + s.page ? '#fff' : '#C9D6F7' });
    const sub = s.sub;

    return {
      mobile, desktop, notDesktop: !desktop, menu: s.menu, drawerOpen: !desktop && s.menu, menuIcon: s.menu ? '✕' : '☰',
      toggleMenu: () => this.setState((x) => ({ menu: !x.menu })),
      dd: s.dd, ddBg: s.dd ? '#EAF0FD' : 'transparent', ddOpen: () => this.setState({ dd: true }), ddClose: () => this.setState({ dd: false }), ddToggle: () => this.setState((x) => ({ dd: !x.dd })),
      workNavColor: is('work') ? ROYAL : INK, pagesNav,
      isAbout: is('about'), isProcess: is('process'), isWork: is('work'), isCareers: is('careers'), isInsights: is('insights') && !art, isArticle: is('insights') && !!art, isFaq: is('faq'), isContact: is('contact'),
      stickyPos: mobile ? 'static' : 'sticky',
      timeline, values, facts: st.facts, stack: st.stack, teamRoles: st.teamRoles,
      stepIndex, processGroups,
      workFilters, work, showTestimonials: !!st.showTestimonials,
      roles, rolesRaw: K.roles, careersEmail: (co && co.careersEmail) || 'careers@asprglobaltech.com', hiring, af: ak.f, aon: ak.on, ahas: ak.has, abd: ak.bd, aerr: ak.err, afiles: ak.files,
      insFilters, articles, art: art || {}, related, artRef: this.artRef, progW: (s.prog * 100).toFixed(1) + '%', backToInsights: this.go('#insights'),
      faqGroups, faqIndex,
      cf: ck.f, con: ck.on, countries: COUNTRIES, cctry: findCountry(ck.f.country), chas: ck.has, cbd: ck.bd, cerr: ck.err, cfiles: ck.files, cErrList: ck.errList, cErrMany: ck.errList.length > 1, cErrCount: ck.errList.length + ' things',
      needChips, budgetOpts, hasPkg: !!pkg, pkg: pkg || {}, noNeeds: !s.c.needs.length, selNeeds: s.c.needs,
      msgCount: s.c.message.trim().length + ' / 20 min',
      cSubmit: (e) => this.sendContact(e), cBusy: s.cBusy, cSubmitLabel: s.cBusy ? 'Sending…' : 'Send my brief →', cSubmitErr: s.cErr,
      cSent: s.cSent, cNotSent: !s.cSent, refNo: s.refNo, firstName: s.c.name.trim().split(' ')[0] || 'thanks',
      cReset: () => this.setState({ cSent: false, cServer: {}, cErr: '', c: { ...EMPTY_C, country: this.country || DEFAULT_COUNTRY } }),
      showCta: !is('contact'), ctaHead: cta[0], ctaBody: cta[1], ctaBtn: cta[2], ctaHref: cta[3],
      contacts: [{ k: 'mail', v: co.email, href: 'mailto:' + co.email }, { k: 'call', v: co.phone, href: co.phoneHref }],
      footCols: [
        { h: 'SERVICES', links: ['Website Development', 'App Development', 'SaaS & Software', 'AI & Chatbots', 'Game Development', 'Brand & Design', 'SEO'].map((t) => footLink(t, '/#services')) },
        { h: 'PRODUCTS', links: ['AI Voice Agent', ...K.products.map((x) => x.name)].map((t) => footLink(t, '/#products')) },
        { h: 'COMPANY', links: PAGES.map(([id, label]) => footLink(label, '#' + id)) },
      ],
      subscribe: (e) => this.doSubscribe(e), subEmail: sub.email, subBusy: sub.busy,
      onSubEmail: (e) => { const v = e.target.value; this.setState((x) => ({ sub: { ...x.sub, email: v, err: '' } })); },
      subLabel: sub.busy ? 'Subscribing…' : 'Subscribe', subHasErr: !!sub.err, subErr: sub.err,
      subDone: sub.done, subNotDone: !sub.done, subTitle: sub.already ? 'You\'re already on the list.' : 'Subscribed ✓ — see you next month.',
      subNextHref: '#insights', subNextLabel: 'Read the latest insights →',
    };
  }

  render() {
    return <CompanyView v={this.renderVals()} />;
  }
}
