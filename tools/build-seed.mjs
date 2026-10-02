// Builds backend/src/database/seed/content.json from the original design's constants.
import fs from 'fs';
const A = p => '/assets/' + p;
const svc = [
  ['01','Website Development','Build','Sites that load fast, rank, and give sales something to point at.','responsive-web.png','Responsive website on laptop, tablet and phone','center','language'],
  ['02','App Development','Build','iOS and Android from one codebase, shipped and then maintained.','shop-app.png','Shopping app screens','center top','smartphone'],
  ['03','SaaS & Software Solutions','Build','Custom platforms and subscription software, built to scale with the business.','ops-dashboard.png','Operations SaaS dashboard','center 20%','cloud'],
  ['04','AI & Chatbot Solutions','Build','AI agents and chatbots that answer, book and qualify, around the clock.','ai-chatbot.png','AI assistant app screens','center','psychology'],
  ['05','Game Development','Build','Unity builds scoped to finish, not to drift for eighteen months.','game-ui.png','Mobile game home screen','center 35%','sports_esports'],
  ['06','Logo Design','Brand','A mark that holds up at 16 pixels and on a hoarding.','logo-design.png','Logo concept sketches and applications','center 45%','draw'],
  ['07','Graphics Design','Brand','Print, social and packaging that stay recognisably yours.','poster.png','Café promotional poster','center 30%','palette'],
  ['08','Video Editing','Brand','Cuts built for the feed, the pitch deck and the launch.','video-edit.png','Video editing timeline on monitors','center 30%','movie'],
  ['09','SEO','Grow','Rankings that bring buyers, not just traffic.','seo-dashboard.png','Search traffic and analytics dashboard','center','travel_explore'],
  ['10','Business Management','Grow','The systems that take over when the spreadsheet stops coping.','inventory.png','Inventory management dashboard','center','account_tree'],
].map(([num,name,pillar,line,img,alt,pos,icon],i)=>({num,name,pillar,line,img:A(img),alt,pos,icon,sort:i+1}));
const products = [
  { icon: 'receipt_long', name: 'Billing Software', tag: 'Simple and efficient billing', img: 'banking-app.png', alt: 'Billing and payments app screens', pos: 'center' },
  { icon: 'groups', name: 'Employee Management', tag: 'Manage your workforce', img: 'ops-dashboard.png', alt: 'Workforce scheduling dashboard', pos: 'left 30%' },
  { icon: 'inventory_2', name: 'Inventory Management', tag: 'Track stock with confidence', img: 'inventory.png', alt: 'Inventory overview dashboard', pos: 'center' },
  { icon: 'account_balance', name: 'Finance & FinServ', tag: 'Smarter financial operations', img: 'finance-dashboard.png', alt: 'Finance dashboard with inflow and budget charts', pos: 'center top' },
].map((p,i)=>({...p,img:A(p.img),sort:i+1}));
const industries = [
  ['Retail','Stock, prices and offers live in three places that disagree.',['Storefronts','Inventory sync','Billing','Loyalty','Product SEO'],'ecommerce.png','E-commerce storefront on a desktop monitor','center 40%'],
  ['Healthcare','Appointments arrive by phone, WhatsApp and walk-in.',['Booking systems','Patient records','Reminders','Clinic sites'],null,'Clinic booking system image','center'],
  ['Education','Enquiry forms go to an inbox nobody owns.',['Learning platforms','Admission portals','Student apps','Educational games'],'game-ui.png','Mobile game interface','center 30%'],
  ['Real Estate','Listings updated on paper first.',['Property portals','CRM pipelines','Virtual tours','Local SEO'],'responsive-web.png','Responsive website across devices','center'],
  ['Manufacturing','Job status lives on a whiteboard.',['ERP','Production tracking','Vendor portals','Dashboards'],'inventory.png','Inventory and production dashboard','center'],
  ['Logistics','Every delivery update is a phone call made twice.',['Fleet tracking','Delivery apps','Route planning','Tracking pages'],'ops-dashboard.png','Live job and route map dashboard','center 35%'],
  ['Hospitality','Website says one thing, counter another.',['Direct-order apps','Table booking','POS integration','Menu design'],'poster.png','Café promotional poster','center 40%'],
  ['Startups','A prototype has to look investable.',['MVP builds','Brand identity','Pitch decks','Launch campaigns'],'logo-design.png','Logo concept and brand applications','center 20%'],
].map(([name,problem,builds,img,alt,pos],i)=>({name,problem,builds,img:img?A(img):null,alt,pos,sort:i+1}));
const work = [
  ['Retail brand, Coimbatore', ['Website','Catalogue','Brand refresh'], 'Build', 'ecommerce.png', 'E-commerce storefront on a desktop monitor', 'center 40%', 1],
  ['Clinic group, Tamil Nadu', ['Booking system','Website'], 'Build', 'responsive-web.png', 'Responsive website across laptop, tablet and phone', 'center', 1],
  ['Manufacturer, Mettupalayam', ['Business systems','Graphics'], 'Grow', 'inventory.png', 'Inventory management dashboard', 'center', 1],
  ['Food brand, Tamil Nadu', ['Logo','Packaging','Social'], 'Brand', 'poster.png', 'Café promotional poster with latte art', 'center 35%', 0],
  ['Education group', ['Admissions portal','SEO'], 'Grow', 'seo-dashboard.png', 'Search traffic dashboard', 'center', 0],
  ['Indie game studio', ['Unity build','Trailer edit'], 'Build', 'game-ui.png', 'Fantasy mobile game home screen', 'center 30%', 0],
].map(([client,scope,pillar,img,alt,pos,featured],i)=>({client,scope,pillar,img:A(img),alt,pos,outcome:'[Outcome pending]',featured:!!featured,sort:i+1}));
const steps = [
  ['01','Discover','We ask what the business needs before anyone opens a design tool.',['Your goals, in your words','A review of what exists today','Questions answered before any design'],1],
  ['02','Define','Scope, price and timeline written down and signed off.',['Written scope','Agreed price','Signed-off timeline'],1],
  ['03','Design','Screens you can react to, with two rounds of revisions.',['Clickable screens to react to','Two rounds of revisions','Approved designs before build'],2],
  ['04','Develop','Built in the open, with a staging link you can check any day.',['A staging link from week one','Progress you can check any day','Code and accounts in your name'],2],
  ['05','Test','Real devices, real content, real edge cases.',['Tested on real devices','Your real content loaded','Edge cases checked'],2],
  ['06','Deploy','Launch on a quiet day, with a rollback ready.',['A quiet-day launch','A rollback, ready','Files and logins handed over'],3],
  ['07','Support','We stay on the account after the invoice clears.',['A named point of contact','Fixes after launch','[Support plan details]'],3],
].map(([num,title,description,outputs,stage],i)=>({num,title,description,outputs,stage,sort:i+1}));
const roles = [
  ['Frontend developer', ['Mettupalayam','Full-time','React']],
  ['App developer', ['Mettupalayam','Full-time','Flutter or React Native']],
  ['Graphic designer', ['Mettupalayam','Full-time']],
  ['Video editor', ['Mettupalayam','Full-time']],
  ['Internships', ['Rolling','Design and development']],
].map(([title,meta],i)=>({title,meta,description:'[Role description, responsibilities and requirements]',isOpen:true,sort:i+1}));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const blocks = [
  {type:'standfirst',text:'[Standfirst — one or two sentences that set up the argument]'},
  {type:'p',text:'[Article body — paragraph]'},
  {type:'h2',text:'[Subheading]'},
  {type:'p',text:'[Article body — paragraph]'},
  {type:'quote',text:'[Pull quote]'},
  {type:'p',text:'[Article body — paragraph]'},
  {type:'h2',text:'[Subheading]'},
  {type:'p',text:'[Article body — paragraph]'},
];
const articles = [
  ['Why we still argue about page speed', 'Build', 'responsive-web.png', 'Website on laptop, tablet and phone'],
  ['A logo test that takes ten seconds', 'Brand', 'logo-design.png', 'Logo concept sketches'],
  ['What SEO cannot fix', 'Grow', 'seo-dashboard.png', 'Search analytics dashboard'],
  ['The scope document that saved a project', 'Process', null, 'Scope document'],
  ['Choosing boring technology on purpose', 'Build', 'coding.png', 'Code on a laptop screen'],
  ['Hiring for skill, not certificates', 'Studio', null, 'Studio team at work'],
].map(([title,category,img,alt],i)=>({slug:slug(title),title,category,img:img?A(img):null,alt,author:'[Author]',publishedAt:'[Date]',readTime:'[Read time]',blocks,status:'published',sort:i+1}));
const faqGroups = [
  ['About working with us', [
    ['start','How do we start a project with you?','Send a brief through the form, WhatsApp or call. We reply within one working day and set up a Discover call — scope, price and timeline follow in writing.',1],
    ['who','Who will we actually be talking to?','One point of contact across all ten services — the specialists doing the work, with no middle layer.',1],
    ['outside','Do you work with clients outside Tamil Nadu?','Yes. We are based in Mettupalayam and work with clients across India and abroad.'],
    ['alongside','Can you work alongside our existing team?',null]]],
  ['Cost and timelines', [
    ['price','How do you price a project?','After the Discover call we write down the scope, price and timeline, and you sign them off before any build starts.'],
    ['website-cost','What does a typical website cost?',null],
    ['how-long','How long does a build take?',null,4],
    ['phases','Do you take projects in phases?','Yes. Larger replacements are quoted in phases, and app builds can price phase one on its own.']]],
  ['Delivery and after', [
    ['handover','What exactly do we get on handover?',null],
    ['own','Do we own the code and accounts?','Yes. You own everything — code, designs, domains and accounts.',3],
    ['breaks','What happens if something breaks after launch?','Every launch has a rollback ready, and we stay on the account after the invoice clears.'],
    ['support','Do you offer ongoing support plans?',null]]],
  ['Capability questions', [
    ['app-web','Can you handle app and web together?','Yes. Ten services sit under one roof, so app, web, brand and SEO come from one team on one timeline.'],
    ['tech','Which technologies do you build on?','React, Next.js, TypeScript and Tailwind on the front end; Node.js, NestJS, Python and Django on the back end; Flutter, React Native, Kotlin and Swift for mobile; Unity for games; PostgreSQL, MongoDB and SQLite; AWS and Vercel.'],
    ['brand-only','Do you do brand work without a build?','Yes. Logo, graphics and video are services on their own.'],
    ['rescue','Can you fix a project someone else started?',null]]],
];
// featured order on the home page: start, who, own, how-long
const featuredOrder = { start: 1, who: 2, own: 3, 'how-long': 4 };
const faqs = []; let s = 0;
faqGroups.forEach(([g, qs], gi) => qs.forEach(([slugId, question, answer]) => faqs.push({ slug: slugId, groupSort: gi + 1, question, answer, featured: featuredOrder[slugId] || 0, sort: ++s })));
const packages = [
  { name: 'Launch', services: ['Logo','Website','Graphics'], outcome: 'A launch that looks coherent, from one team, on one timeline', price: 'Fixed price after the Discover call' },
  { name: 'Replace', services: ['Website','Business Systems'], outcome: 'A single source of truth and decisions from live data', price: 'Quoted in phases' },
  { name: 'Be found', services: ['SEO','Graphics','Video'], outcome: 'Enquiries from search instead of ad spend', price: 'Six-month minimum' },
  { name: 'Ship the app', services: ['App','Game','Logo'], outcome: 'A product you can sell', price: 'Phase one priced on its own' },
].map((p,i)=>({...p,sort:i+1}));
const needs = [['Website','language'],['App','smartphone'],['Game','sports_esports'],['Logo','draw'],['Graphics','palette'],['Video','movie'],['Business Systems','account_tree'],['SEO','travel_explore'],['SaaS / Software','cloud'],['AI / Chatbot','psychology'],['Product demo','play_circle'],['Not sure yet','help']].map(([label,icon],i)=>({label,icon,sort:i+1}));
const settings = {
  company: { name: 'ASPR Global Tech', website: 'asprglobaltech.com', websiteUrl: 'https://asprglobaltech.com', email: 'support@asprglobaltech.com', careersEmail: 'careers@asprglobaltech.com', phone: '+91 75399 07704', phoneHref: 'tel:+917539907704', whatsappUrl: 'https://wa.me/917539907704', address: '12D, 1444C, 27/1, S M Nagar, Perumal Gounder Layout, Post, Mahadevapuram, Mettupalayam, Tamil Nadu 641305, India', hours: 'Mon–Sat, 9:30 AM – 6:30 PM IST' },
  heroStrip: [
    ['responsive-web.png', 'Responsive website shown on laptop, tablet and phone'],
    ['banking-app.png', 'Mobile banking app screens with balance and analytics'],
    ['ops-dashboard.png', 'Operations dashboard with live job map and schedule'],
    ['shop-app.png', 'Shopping app screens with product listings'],
    ['game-ui.png', 'Fantasy mobile game home screen with battle button'],
    ['finance-dashboard.png', 'Personal finance dashboard in dark and light themes'],
    ['ecommerce.png', 'E-commerce storefront on a desktop monitor'],
    ['car-app.png', 'Car marketplace app screens'],
    ['inventory.png', 'Inventory management dashboard'],
  ].map(([f, alt]) => ({ src: A(f), alt })),
  stats: { projects: 300, clients: 150, specialistsMin: 10, specialistsMax: 15, services: 10 },
  why: [{ n: '01', t: 'One team, start to finish' }, { n: '02', t: 'Plain answers, in writing' }, { n: '03', t: 'You own everything' }, { n: '04', t: 'We stay after launch' }].map(w => ({ ...w, d: '[One-line body required]' })),
  proof: [{ a: '10 services', b: '1 point of contact' }, { a: '10–15 specialists', b: 'No middle layer' }, { a: '150+', b: 'Clients served' }],
  timeline: [['Before','The team, working separately'],['March 2026','Registered as a partnership firm'],['Now','10 services under one roof'],['Next','A studio businesses across South India call first']].map(([k,t])=>({k,t})),
  values: ['Skill over syllabus','Say the hard thing early','Ship it properly','Keep it explainable','Stay curious'].map(t => ({ t, d: '[One-line body required]' })),
  facts: [['ESTABLISHED','March 2026'],['ENTITY','Partnership firm'],['BASED IN','Mettupalayam, TN'],['TEAM','10–15'],['SERVICES','10'],['CLIENTS','150+'],['PROJECTS','300+']].map(([k,v])=>({k,v})),
  stack: [['Front end','web',['React','Next.js','TypeScript','Tailwind CSS']],['Back end','dns',['Node.js','NestJS','Python','Django']],['Mobile','smartphone',['Flutter','React Native','Kotlin','Swift']],['Games','sports_esports',['Unity','C#']],['Data','database',['PostgreSQL','MongoDB','SQLite']],['Cloud','cloud',['AWS','Vercel']],['Design','palette',['Figma','Adobe CC']]].map(([h,icon,items])=>({h,icon,items})),
  teamRoles: ['Web engineers','App developers','Game developers','Designers','Video editors','SEO','Business systems'],
  hiring: [['01','Send work, not a template CV'],['02','A short paid task'],['03','A conversation with the team'],['04','An offer in writing']].map(([n,t])=>({n,t})),
  budgets: ['Under ₹1 lakh','₹1–5 lakh','₹5–15 lakh','₹15 lakh+','Not sure yet'],
  timelines: ['As soon as possible','1–3 months','3–6 months','Flexible'],
  contactMethods: ['Email','Phone call','WhatsApp'],
  processGroups: [
    { stage: 1, label: 'THINK IT', verb: 'Think it.', stageLabel: 'STAGE 1 · STEPS 01–02', sum: 'Before design or code: what the business needs, and a written agreement on scope, price and timeline.' },
    { stage: 2, label: 'BUILD IT', verb: 'Build it.', stageLabel: 'STAGE 2 · STEPS 03–05', sum: 'Designed, built and tested in the open, with a staging link you can check any day.' },
    { stage: 3, label: 'SCALE IT', verb: 'Scale it.', stageLabel: 'STAGE 3 · STEPS 06–07', sum: 'A calm launch, and a team that stays on the account afterwards.' },
  ],
  showTestimonials: false,
};
const out = { services: svc, products, industries, work, steps, roles, articles, faqGroups: faqGroups.map(([title], i) => ({ title, sort: i + 1 })), faqs, packages, needs, settings };
const dest = process.argv[2] || "database/seed/content.json";
fs.mkdirSync(dest.replace(/\/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log('wrote', dest, Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length])));
