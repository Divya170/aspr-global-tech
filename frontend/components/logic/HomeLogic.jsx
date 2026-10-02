'use client';
// Home page behaviour. Ported from the design's own logic class so every
// interaction (drift strip, count-up, waveform, sticky process arc, industry
// rotation, three-step brief builder…) behaves exactly as designed — but all
// content now comes from the backend and submissions go to the API.
import { SHOW_WORK } from '../../lib/flags';
import React from 'react';
import HomeView from '../views/HomeView';
import { briefErrors, fileError, suggestPackage } from '../../lib/rules';
import { COUNTRIES, DEFAULT_COUNTRY, findCountry, fullPhone, guessCountry } from '../../lib/countries';
import { submitEnquiry, subscribe } from '../../lib/api';

const ROYAL = '#1A4AD8', INK = '#111F38';
const EMPTY_F = { needs: [], name: '', email: '', country: DEFAULT_COUNTRY, phone: '', company: '', contact: 'Email', budget: '', timeline: '', message: '', files: [] };
// Grid spans from the design, per filter; other counts fall back to a balanced 12-col layout.
const DESIGN_SPANS = { All: [7, 5, 4, 4, 4, 4, 4, 4, 6, 6], Build: [7, 5, 4, 4, 4], Brand: [4, 4, 4], Grow: [6, 6] };
function spansFor(filter, n) {
  const d = DESIGN_SPANS[filter];
  if (d && d.length === n) return d;
  const out = [];
  if (n >= 2) out.push(7, 5);
  while (out.length < n) {
    const left = n - out.length;
    if (left === 1) out.push(12); else if (left === 2 || left === 4) out.push(6, 6); else out.push(4, 4, 4);
  }
  return out.slice(0, n);
}

export default class HomeLogic extends React.Component {
  static defaultProps = { driftSeconds: 40, reduceMotion: false };

  state = { w: 1280, filter: 'All', ind: 0, indPaused: false, prog: [0, 0, 0, 0], verb: 0, arc: 0, faq: 0, revealed: false, pastHero: false,
    menu: false, waveOff: false, pulse: false, formOpen: false, fShown: false, step: 0, tried: {}, sent: false, refNo: '',
    busy: false, submitErr: '', serverErrs: {}, f: { ...EMPTY_F },
    sub: { email: '', busy: false, done: false, already: false, err: '' } };

  closeRef = React.createRef();
  strip = React.createRef(); wave = React.createRef(); statsRef = React.createRef(); processRef = React.createRef(); heroRef = React.createRef();
  gRefs = [React.createRef(), React.createRef(), React.createRef()];

  get c() { return this.props.content; }
  reduced() { return !!this.props.reduceMotion || this.mq; }

  // ── brief builder ──
  openForm(e, preset) {
    if (e && e.preventDefault) e.preventDefault();
    this.setState((s) => ({ formOpen: true, fShown: false, menu: false,
      f: preset && !s.f.needs.includes(preset) && !s.sent ? { ...s.f, needs: [...s.f.needs, preset] } : s.f }));
    document.body.style.overflow = 'hidden';
    this.fto = setTimeout(() => { this.setState({ fShown: true }); this.closeRef.current && this.closeRef.current.focus(); }, 20);
  }
  closeForm() {
    if (this.state.busy) return; // don't lose an in-flight submission
    this.setState({ fShown: false }); document.body.style.overflow = '';
    this.fto = setTimeout(() => this.setState({ formOpen: false }), 240);
  }
  errorsFor(step) {
    const e = briefErrors(this.state.f, step);
    // errors the server returned for this step, until the person edits the form
    const fieldsByStep = { 0: ['needs'], 1: ['name', 'email', 'phone', 'company', 'contact'], 2: ['message', 'files', 'budget', 'timeline'] };
    for (const k of fieldsByStep[step] || []) if (this.state.serverErrs[k] && !e[k]) e[k] = this.state.serverErrs[k];
    return e;
  }
  goNext() {
    const s = this.state, e = this.errorsFor(s.step);
    if (s.busy) return;
    if (Object.keys(e).length) return this.setState({ tried: { ...s.tried, [s.step]: true } });
    if (s.step < 2) return this.setState({ step: s.step + 1, submitErr: '' });
    this.send();
  }
  async send() {
    const f = this.state.f;
    this.setState({ busy: true, submitErr: '' });
    try {
      const res = await submitEnquiry({ source: f.needs.includes('Product demo') ? 'product-demo' : 'brief-builder', needs: f.needs, name: f.name, email: f.email,
        phone: fullPhone(f.country, f.phone), company: f.company, contactMethod: f.contact, budget: f.budget, timeline: f.timeline, message: f.message }, f.files);
      this.setState({ busy: false, sent: true, refNo: res.refNo });
    } catch (err) {
      if (err.fieldErrors) {
        const fe = err.fieldErrors;
        const step = fe.needs ? 0 : (fe.name || fe.email || fe.phone || fe.company || fe.contactMethod) ? 1 : 2;
        const mapped = { ...fe }; if (fe.contactMethod) mapped.contact = fe.contactMethod;
        this.setState((x) => ({ busy: false, serverErrs: mapped, step, tried: { ...x.tried, [step]: true }, submitErr: err.message }));
      } else this.setState({ busy: false, submitErr: err.message });
    }
  }
  setF(patch) { this.setState((x) => ({ f: { ...x.f, ...patch(x.f) }, serverErrs: {}, submitErr: x.submitErr && !x.busy ? '' : x.submitErr })); }

  // ── newsletter ──
  async doSubscribe(e) {
    e.preventDefault();
    const email = this.state.sub.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return this.setState((x) => ({ sub: { ...x.sub, err: email ? 'That email looks incomplete — check for a missing @ or domain.' : 'Enter an email address.' } }));
    this.setState((x) => ({ sub: { ...x.sub, busy: true, err: '' } }));
    try {
      const r = await subscribe(email, 'footer-home');
      this.setState((x) => ({ sub: { ...x.sub, busy: false, done: true, already: !!r.alreadySubscribed } }));
    } catch (err) {
      this.setState((x) => ({ sub: { ...x.sub, busy: false, err: (err.fieldErrors && err.fieldErrors.email) || err.message } }));
    }
  }

  // ── lifecycle / motion ──
  componentDidMount() {
    this.mq = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.country = guessCountry(); this.setState((x) => ({ f: { ...x.f, country: x.f.phone ? x.f.country : this.country } }));
    this._r = () => this.setState({ w: window.innerWidth }); this._r();
    window.addEventListener('resize', this._r);
    this.rto = setTimeout(() => this.setState({ revealed: true }), 80);
    this.pi = setInterval(() => this.setState((s) => ({ pulse: !s.pulse })), 1000);
    this.off = 0; let last = performance.now();
    const tick = (t) => {
      const dt = Math.min(64, t - last); last = t;
      const el = this.strip.current;
      if (el) {
        if (!this.paused && !this.reduced() && this.state.w >= 760) {
          const half = el.scrollWidth / 2, secs = this.props.driftSeconds ?? 40;
          this.off = half ? (this.off + dt * half / (secs * 1000)) % half : 0;
          el.style.transform = `translate3d(${-this.off}px,0,0)`;
        } else if (this.state.w < 760) el.style.transform = 'none';
      }
      const wv = this.wave.current;
      if (wv) [...wv.children].forEach((b, i) => {
        b.style.transform = (this.reduced() || this.state.waveOff) ? 'scaleY(0.6)' : `scaleY(${0.25 + 0.75 * Math.abs(Math.sin(t / 380 + i * 0.5) * Math.cos(t / 900 + i * 0.21))})`;
      });
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.iv = setInterval(() => {
      const n = this.c.industries.length;
      if (n && !this.state.indPaused && !this.hoverInd && !this.reduced()) this.setState((s) => ({ ind: (s.ind + 1) % n }));
    }, 6000);
    this.io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { this.io.disconnect(); this.countUp(); } }), { threshold: 0.35 });
    if (this.statsRef.current) this.io.observe(this.statsRef.current);
    this._k = (e) => { if (e.key === 'Escape' && this.state.formOpen) this.closeForm(); };
    document.addEventListener('keydown', this._k);
    this._s = () => this.onScroll();
    document.addEventListener('scroll', this._s, { capture: true, passive: true });
    this.onScroll();
    // Deep links to the brief builder: "#start", or "#start:<Need>" to pre-select a need.
    const hash = decodeURIComponent(window.location.hash);
    if (hash === '#start') this.openForm();
    else if (hash.startsWith('#start:')) {
      const need = hash.slice(7);
      this.openForm(null, (this.c.needs || []).some((n) => n.label === need) ? need : undefined);
    }
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf); cancelAnimationFrame(this.cu); clearInterval(this.iv); clearInterval(this.pi); clearTimeout(this.rto); clearTimeout(this.fto);
    window.removeEventListener('resize', this._r); document.removeEventListener('scroll', this._s, { capture: true });
    document.removeEventListener('keydown', this._k);
    this.io && this.io.disconnect();
    document.body.style.overflow = '';
  }
  countUp() {
    if (this.reduced()) return this.setState({ prog: [1, 1, 1, 1] });
    const start = performance.now();
    const step = (t) => { const p = Math.min(1, (t - start) / 1200), e = 1 - Math.pow(1 - p, 3);
      this.setState({ prog: [e, e, e, e] }); if (p < 1) this.cu = requestAnimationFrame(step); };
    this.cu = requestAnimationFrame(step);
  }
  onScroll() {
    const vh = window.innerHeight;
    const pr = this.processRef.current, hr = this.heroRef.current;
    let arc = this.state.arc, verb = this.state.verb;
    if (pr) { const r = pr.getBoundingClientRect(); arc = Math.max(0, Math.min(1, (vh * 0.55 - r.top) / (r.height - vh * 0.3))); }
    this.gRefs.forEach((g, i) => { if (g.current && g.current.getBoundingClientRect().top < vh * 0.5) verb = i; });
    if (this.gRefs[0].current && this.gRefs[0].current.getBoundingClientRect().top >= vh * 0.5) verb = 0;
    const pastHero = hr ? hr.getBoundingClientRect().bottom < 0 : false;
    if (Math.abs(arc - this.state.arc) > 0.004 || verb !== this.state.verb || pastHero !== this.state.pastHero) this.setState({ arc, verb, pastHero });
  }

  // ── view model ──
  formVals(mobile) {
    const s = this.state, f = s.f, c = this.c;
    const errs = s.tried[s.step] ? this.errorsFor(s.step) : {};
    const set = (k) => (e) => { const v = e.target.value; this.setF(() => ({ [k]: v })); };
    const on = { name: set('name'), email: set('email'), country: set('country'), phone: set('phone'), company: set('company'), message: set('message'),
      files: (e) => { const picked = [...(e.target.files || [])]; e.target.value = ''; this.setF((x) => ({ files: [...x.files, ...picked] }));
        if (fileError([...f.files, ...picked])) this.setState((x) => ({ tried: { ...x.tried, 2: true } })); } };
    const has = {}, bd = {}, err = {};
    ['needs', 'name', 'email', 'phone', 'company', 'message', 'files'].forEach((k) => { has[k] = !!errs[k]; err[k] = errs[k] || ''; bd[k] = errs[k] ? '#B42318' : '#E3E8F2'; });
    const needChips = c.needs.map(({ label, icon }) => { const sel = f.needs.includes(label);
      return { label, icon, on: sel, bd: sel ? ROYAL : (has.needs ? '#F4C7C3' : '#E3E8F2'), bg: sel ? '#EAF0FD' : '#fff', tile: sel ? ROYAL : '#EAF0FD', ic: sel ? '#fff' : ROYAL, box: sel ? ROYAL : '#fff', tick: sel ? '✓' : '',
        toggle: () => this.setF((x) => ({ needs: sel ? x.needs.filter((n) => n !== label) : [...x.needs, label] })) }; });
    const radio = (key, opts) => opts.map((label) => { const sel = f[key] === label;
      return { label, on: sel, bd: sel ? INK : '#E3E8F2', bg: sel ? INK : '#fff', fg: sel ? '#fff' : INK, pick: () => this.setF(() => ({ [key]: sel && key !== 'contact' ? '' : label })) }; });
    const p = suggestPackage(c.packages, f.needs);
    const pkg = p ? { ...p, services: p.servicesLabel } : null;
    const titles = ['What do you need?', 'Who should we talk to?', 'Tell us the details'];
    const subs = ['Select everything that applies. We\'ll suggest a package if your picks match one.', 'One person, one point of contact — the same way we work.', 'A few lines is plenty. Scope, price and timeline get written down after the Discover call.'];
    const errList = Object.values(errs);
    const filled = [f.needs.length, f.name, f.email, f.phone, f.message].filter(Boolean).length;
    const dash = (v) => v || '—', dc = (v) => (v ? '#fff' : 'rgba(255,255,255,0.45)');
    const st = c.settings;
    return {
      formOpen: s.formOpen, fOp: s.fShown ? 1 : 0, fTf: s.fShown ? 'translateY(0)' : 'translateY(12px)',
      fPad: mobile ? '0' : '24px', fH: mobile ? '100%' : 'min(820px, calc(100vh - 48px))', fRadius: mobile ? '0' : '24px',
      closeForm: () => this.closeForm(), closeRef: this.closeRef,
      formKey: () => {}, // Escape is handled document-wide while the dialog is open
      notSent: !s.sent, sent: s.sent, step0: s.step === 0, step1: s.step === 1, step2: s.step === 2,
      stepsUi: ['What you need', 'About you', 'The details'].map((label, i) => ({ label, n: '0' + (i + 1), bar: i <= s.step ? ROYAL : '#E3E8F2', fg: i === s.step ? INK : '#5A6380' })),
      stepTitle: titles[s.step], stepSub: subs[s.step],
      showErrSummary: errList.length > 1, errCount: errList.length + ' things', errList,
      submitErr: s.submitErr && !errList.length ? s.submitErr : '',
      form: f, on, has, bd, err, needChips, countries: COUNTRIES, ctry: findCountry(f.country),
      contactOpts: radio('contact', st.contactMethods),
      budgetOpts: radio('budget', st.budgets),
      timeOpts: radio('timeline', st.timelines),
      msgCount: f.message.trim().length + ' / 20 min',
      fileList: f.files.map((file, i) => ({ name: file.name, remove: () => this.setF((x) => ({ files: x.files.filter((_, j) => j !== i) })) })),
      canBack: s.step > 0 && !s.busy, back: () => this.setState({ step: s.step - 1, submitErr: '' }), next: () => this.goNext(),
      busy: s.busy, nextLabel: s.busy ? 'Sending…' : s.step < 2 ? 'Continue →' : 'Send my brief →',
      firstName: (f.name.trim().split(' ')[0]) || 'thanks', contactVia: f.contact === 'Phone call' ? 'phone' : f.contact.toLowerCase(), refNo: s.refNo,
      resetForm: () => this.setState({ sent: false, step: 0, tried: {}, serverErrs: {}, submitErr: '', f: { ...EMPTY_F, country: this.country || DEFAULT_COUNTRY } }),
      noNeeds: !f.needs.length, selNeeds: f.needs, hasPkg: !!pkg, pkg: pkg || {}, briefFill: filled + ' / 5 required',
      briefRows: [
        { k: 'Name', v: dash(f.name), c: dc(f.name) }, { k: 'Company', v: dash(f.company), c: dc(f.company) },
        { k: 'Contact via', v: f.contact, c: '#fff' }, { k: 'Budget', v: dash(f.budget), c: dc(f.budget) },
        { k: 'Timeline', v: dash(f.timeline), c: dc(f.timeline) }, { k: 'Files', v: f.files.length ? f.files.length + ' attached' : '—', c: dc(f.files.length) },
      ],
    };
  }

  newsletterVals() {
    const sub = this.state.sub;
    return {
      subscribe: (e) => this.doSubscribe(e), subEmail: sub.email, subBusy: sub.busy,
      onSubEmail: (e) => { const v = e.target.value; this.setState((x) => ({ sub: { ...x.sub, email: v, err: '' } })); },
      subLabel: sub.busy ? 'Subscribing…' : 'Subscribe', subHasErr: !!sub.err, subErr: sub.err,
      subDone: sub.done, subNotDone: !sub.done, subTitle: sub.already ? 'You\'re already on the list.' : 'Subscribed ✓ — see you next month.',
      subNextHref: '/company#insights', subNextLabel: 'Read the latest insights →',
    };
  }

  renderVals() {
    const s = this.state, w = s.w, mobile = w < 760, desktop = w >= 1024, c = this.c, st = c.settings, co = st.company;
    const lines = ['Building Digital', 'Solutions for', 'the Future'];
    const heroLines = lines.map((text, i) => ({ text, dot: i === 2 ? '.' : '',
      op: (s.revealed || this.reduced()) ? 1 : 0, tf: (s.revealed || this.reduced()) ? 'translateY(0)' : 'translateY(105%)', delay: `${i * 60}ms` }));

    const tiles = st.heroStrip;
    const strip = [...tiles, ...tiles].map((x, i) => ({ src: x.src, alt: i < tiles.length ? x.alt : '', loading: i < 4 ? 'eager' : 'lazy' }));

    const T = st.stats, p = s.prog;
    const stats = [
      { num: Math.round(T.projects * p[0]), plus: true, label: 'Projects delivered', icon: 'rocket_launch' },
      { num: Math.round(T.clients * p[1]), plus: true, label: 'Happy clients', icon: 'handshake' },
      { num: Math.round(T.specialistsMin * p[2]) + '–' + Math.round(T.specialistsMax * p[2]), label: 'Specialists', icon: 'groups' },
      { num: Math.round(T.services * p[3]), label: 'Services under one roof', icon: 'apps' },
    ];

    const svc = c.services;
    const filtered = svc.filter((x) => s.filter === 'All' || x.pillar === s.filter);
    const spans = spansFor(s.filter, filtered.length);
    const services = filtered.map((x, i) => {
      const span = mobile ? 12 : (w < 1024 ? (spans[i] >= 6 ? 12 : 6) : spans[i]);
      const horiz = !mobile && (span === 12 || (desktop && span >= 6 && s.filter === 'Grow'));
      return { n: x.num, icon: x.icon, name: x.name, pillarUp: x.pillar.toUpperCase(), line: x.line, img: x.img, alt: x.alt, pos: x.pos,
        col: `span ${span}`, dir: horiz ? 'row' : 'column', imgFlex: horiz ? '0 0 46%' : '0 0 auto',
        imgH: horiz ? '240px' : (span >= 5 ? (mobile ? '200px' : '280px') : '180px'),
        titleSize: span >= 5 ? '26px' : '21px', op: 1 };
    });
    const filters = ['All', 'Build', 'Brand', 'Grow'].map((label) => { const on = s.filter === label;
      return { label, on, count: label === 'All' ? svc.length : svc.filter((x) => x.pillar === label).length,
        bg: on ? INK : '#fff', fg: on ? '#fff' : INK, bd: on ? INK : '#E3E8F2', pick: () => this.setState({ filter: label }) }; });

    const products = c.products.map((pr) => ({ ...pr, demo: (e) => this.openForm(e, 'Product demo') }));
    const bars = Array.from({ length: 30 }, (_, i) => ({ h: `${(30 + 70 * Math.abs(Math.sin(i * 0.9))).toFixed(2)}%`, c: i % 5 === 2 ? '#fff' : '#8FA8F0' }));

    const groups = st.processGroups.map((g, i) => ({ label: g.label, ref: this.gRefs[i],
      steps: c.steps.filter((x) => x.stage === g.stage).map((x) => ({ n: x.num, t: x.title, d: x.description })) }));
    const verbs = st.processGroups.map((g, i) => ({ text: g.verb, color: i === s.verb ? ROYAL : (i < s.verb ? INK : '#B8C2D8') }));

    const IND = c.industries;
    const industries = IND.map((x, i) => { const on = i === s.ind;
      return { name: x.name, on, img: x.img, hasImg: !!x.img, noImg: !x.img, alt: x.alt, pos: x.pos, op: on ? 1 : 0,
        bg: on ? INK : '#fff', fg: on ? '#fff' : INK, bd: on ? INK : '#E3E8F2', pick: () => this.setState({ ind: i, indPaused: true }) }; });
    const cur = IND[s.ind] || IND[0] || { name: '', problem: '', builds: [] };

    const work = c.work.map((k) => ({ client: k.client, pillar: k.pillar.toUpperCase(), scope: k.scope, outcome: k.outcome, img: k.img, alt: k.alt, pos: k.pos }));
    const faqs = c.faqs.map((x, i) => {
      const open = s.faq === i; return { q: x.question, a: x.answer || '[Answer required from ASPR]', open, sign: open ? '−' : '+', tileBg: open ? ROYAL : '#EAF0FD', tileFg: open ? '#fff' : ROYAL,
        toggle: () => this.setState({ faq: open ? -1 : i }) }; });
    const contacts = [
      { k: 'mail', v: co.email, href: 'mailto:' + co.email },
      { k: 'call', v: co.phone, href: co.phoneHref },
    ];
    const footCols = [
      { h: 'SERVICES', links: ['Website Development', 'App Development', 'SaaS & Software', 'AI & Chatbots', 'Game Development', 'Brand & Design', 'SEO'].map((t) => ({ t, href: '#services' })) },
      { h: 'PRODUCTS', links: ['AI Voice Agent', ...c.products.map((x) => x.name)].map((t) => ({ t, href: '#products' })) },
      { h: 'COMPANY', links: ['About', 'Process', ...(SHOW_WORK ? ['Work'] : []), 'Careers', 'Insights', 'FAQ', 'Contact'].map((t) => ({ t, href: '/company#' + t.toLowerCase() })) },
    ];

    return {
      mobile, desktop, notDesktop: !desktop, menu: s.menu, drawerOpen: !desktop && s.menu, menuIcon: s.menu ? '✕' : '☰',
      toggleMenu: () => this.setState((x) => ({ menu: !x.menu })),
      navItems: [{ label: 'Services', caret: '', href: '/services' }, { label: 'Products', caret: '', href: '#products' }, ...(SHOW_WORK ? [{ label: 'Work', caret: '', href: '/company#work' }] : []), { label: 'About', caret: '', href: '/company#about' }, { label: 'Company', caret: '▾', href: '/company#process' }],
      heroRef: this.heroRef, heroLines, pulseShadow: (s.pulse && !this.reduced()) ? '0 0 0 7px rgba(26,74,216,0)' : '0 0 0 0 rgba(26,74,216,0.45)',
      strip: mobile ? strip.slice(0, tiles.length) : strip, stripRef: this.strip, stripH: mobile ? '240px' : '320px', stripOverflow: mobile ? 'auto' : 'hidden',
      pauseStrip: () => { this.paused = true; }, playStrip: () => { this.paused = false; },
      statsRef: this.statsRef, stats, statsSeen: p.some((x) => x > 0),
      filters, services, svcAll: c.services, serviceDetails: st.serviceDetails || {}, productDetails: st.productDetails || {},
      products, bars, waveRef: this.wave, waveLabel: s.waveOff ? 'Play waveform' : 'Pause waveform', toggleWave: () => this.setState((x) => ({ waveOff: !x.waveOff })),
      processRef: this.processRef, groups, verbs, arcOffset: String(1 - s.arc), stickyPos: mobile ? 'static' : 'sticky',
      industries, ind: { upper: cur.name.toUpperCase(), problem: cur.problem, builds: cur.builds },
      pauseInd: () => { this.hoverInd = true; }, playInd: () => { this.hoverInd = false; },
      toggleInd: () => this.setState((x) => ({ indPaused: !x.indPaused })), indPauseLabel: s.indPaused ? '▶ Resume rotation' : '❚❚ Pause rotation',
      why: st.why, proof: st.proof, work, faqs, faqTotal: c.faqTotal, contacts, footCols,
      ...this.newsletterVals(),
      ...this.formVals(mobile),
      openForm: (e) => this.openForm(e), openDemo: (e) => this.openForm(e, 'Product demo'),
      showBottomBar: mobile && s.pastHero, showWaFloat: !mobile,
    };
  }

  render() {
    return <HomeView v={this.renderVals()} />;
  }
}
