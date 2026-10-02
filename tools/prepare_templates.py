"""Applies the minimal, data-binding-only edits to the original design templates.

The visual design is untouched: every edit either (a) replaces hard-coded
content with a binding to backend data, (b) rewrites file links to Next.js
routes, or (c) adds the loading / error / success feedback the static mock-up
had no slot for, re-using the design's own error-box, inline-error and
success-card styles.
"""
import sys, pathlib
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2])

def rep(s, old, new, count=1):
    n = s.count(old)
    assert n == count, f"expected {count} x {old[:70]!r}, found {n}"
    return s.replace(old, new)

ERR_P = '<p style="margin:6px 0 0;color:#B42318;font-size:13.5px;font-weight:600;">'
def submit_alert(var, title, mb):
    return (f'<sc-if value="{{{{ {var} }}}}" hint-placeholder-val="{{{{ false }}}}"><div role="alert" style="border:1.5px solid #F4C7C3;background:#FEF3F2;border-radius:12px;padding:14px 16px;margin-bottom:{mb};">'
            f'<p style="margin:0 0 6px;font-weight:700;font-size:14.5px;color:#B42318;">{title}</p>'
            f'<p style="margin:2px 0 0;font-size:14px;color:#7A271A;">{{{{ {var} }}}}</p></div></sc-if>')

def newsletter(s):
    # the footer form becomes: form (until subscribed) → success card with a next action
    start = s.index('<form onSubmit="{{ subscribe }}"'); end = s.index('</form>', start) + len('</form>')
    form = s[start:end]
    form = rep(form, '<form onSubmit="{{ subscribe }}"', '<form onSubmit="{{ subscribe }}" noValidate=""')
    form = rep(form, 'required="" placeholder', 'required="" value="{{ subEmail }}" onChange="{{ onSubEmail }}" aria-invalid="{{ subHasErr }}" placeholder')
    form = rep(form, '<button type="submit" ', '<button type="submit" disabled="{{ subBusy }}" ')
    card = ('<sc-if value="{{ subDone }}" hint-placeholder-val="{{ false }}"><div role="status" style="display:flex;align-items:center;gap:14px;max-width:400px;border:1px solid rgba(143,168,240,0.35);background:rgba(255,255,255,0.04);border-radius:12px;padding:12px 14px;box-sizing:border-box;">'
            '<span style="flex:0 0 auto;width:40px;height:40px;border-radius:12px;background:#1A4AD8;display:grid;place-items:center;"><span aria-hidden="true" style="font-family:\'Material Symbols Rounded\';font-size:22px;line-height:1;color:#FFFFFF;font-variation-settings:\'wght\' 300;">check</span></span>'
            '<span style="display:flex;flex-direction:column;gap:2px;min-width:0;"><span style="font-weight:700;font-size:15px;color:#fff;">{{ subTitle }}</span>'
            '<a href="{{ subNextHref }}" style="font-weight:700;font-size:14px;color:#8FA8F0;" style-hover="color:#fff;">{{ subNextLabel }}</a></span></div></sc-if>')
    err = '<sc-if value="{{ subHasErr }}" hint-placeholder-val="{{ false }}"><p role="alert" style="margin:8px 0 0;color:#F4C7C3;font-size:13.5px;font-weight:600;">{{ subErr }}</p></sc-if>'
    return s[:start] + '<sc-if value="{{ subNotDone }}" hint-placeholder-val="{{ true }}">' + form + err + '</sc-if>' + card + s[end:]

# ─────────────────────────── HOME ───────────────────────────
h = (SRC / 'ASPR Home.dc.html').read_text()
h = rep(h, 'src="assets/', 'src="/assets/', 3)
h = rep(h, 'href="ASPR Company.dc.html#', 'href="/company#', 3)
h = rep(h, '>[One-line body required]</p>', '>{{ w.d }}</p>')
h = rep(h, '>[Outcome pending]</p>', '>{{ k.outcome }}</p>')
h = rep(h, 'All 16 questions →', 'All {{ faqTotal }} questions →')
h = rep(h, '>[Answer required from ASPR]</p>', '>{{ q.a }}</p>')
# brief builder: server error, file errors, busy state
h = rep(h, '        <sc-if value="{{ step0 }}"', '        ' + submit_alert('submitErr', "We couldn't send your brief.", '20px') + '\n        <sc-if value="{{ step0 }}"')
i = h.index('{{ fileList }}'); j = h.index('</div>', h.index('</sc-for>', i)) + len('</div>')
h = h[:j] + '<sc-if value="{{ has.files }}" hint-placeholder-val="{{ false }}">' + ERR_P + '{{ err.files }}</p></sc-if>' + h[j:]
h = rep(h, '<button type="button" onClick="{{ next }}"', '<button type="button" onClick="{{ next }}" disabled="{{ busy }}" aria-busy="{{ busy }}"')
h = newsletter(h)
h = h[:h.index('<script type="text/x-dc"')] + '</body>\n</html>\n'
(OUT / 'home.dc.html').write_text(h)

# ─────────────────────────── COMPANY ───────────────────────────
c = (SRC / 'ASPR Company.dc.html').read_text()
c = rep(c, 'src="assets/', 'src="/assets/', 3)
c = rep(c, 'href="ASPR Home.dc.html#', 'href="/#', 4)
c = rep(c, 'href="ASPR Home.dc.html"', 'href="/"')
c = rep(c, '>[One-line body required]</p>', '>{{ v.d }}</p>')
c = rep(c, '>[Outcome pending]</p>', '>{{ k.outcome }}</p>')
c = rep(c, '>[Role description, responsibilities and requirements]</p>', '>{{ r.desc }}</p>')
c = rep(c, '>[Author] · [Date] · [Read time]</span>', '>{{ ar.meta }}</span>')
c = rep(c, '>[Author] · [Date] · [Read time]</p>', '>{{ art.meta }}</p>')
# article body → blocks from the database, each block keeps the design's element + style
a0 = c.index('<p style="margin:0 0 24px;font-weight:600;font-size:21px'); a1 = c.index('</div>', a0)
body = c[a0:a1]
import re
tag_style = {m.group(2): m.group(1) for m in re.finditer(r'<(?:p|h2|blockquote) style="([^"]*)">(\[[^\]]+\])', body)}
sf = tag_style['[Standfirst — one or two sentences that set up the argument]']
bp = tag_style['[Article body — paragraph]'].replace('margin:0 0 24px;', 'margin:{{ b.pm }};')
h2s = tag_style['[Subheading]']; qs = tag_style['[Pull quote]']
blocks = ('\n    <sc-for list="{{ art.blocks }}" as="b" hint-placeholder-count="8">'
          f'<sc-if value="{{{{ b.isStandfirst }}}}" hint-placeholder-val="{{{{ false }}}}"><p style="{sf}">{{{{ b.text }}}}</p></sc-if>'
          f'<sc-if value="{{{{ b.isP }}}}" hint-placeholder-val="{{{{ true }}}}"><p style="{bp}">{{{{ b.text }}}}</p></sc-if>'
          f'<sc-if value="{{{{ b.isH2 }}}}" hint-placeholder-val="{{{{ false }}}}"><h2 style="{h2s}">{{{{ b.text }}}}</h2></sc-if>'
          f'<sc-if value="{{{{ b.isQuote }}}}" hint-placeholder-val="{{{{ false }}}}"><blockquote style="{qs}">{{{{ b.text }}}}</blockquote></sc-if>'
          '</sc-for>\n  ')
c = c[:a0] + blocks.strip() + '\n  ' + c[a1:]
# careers: file errors, server error, busy state, success next action
i = c.index('{{ afiles }}'); j = c.index('</div>', c.index('</sc-for>', i)) + len('</div>')
c = c[:j] + '<sc-if value="{{ ahas.files }}" hint-placeholder-val="{{ false }}">' + ERR_P + '{{ aerr.files }}</p></sc-if>' + c[j:]
k = c.index('<span style="color:#5A6380;font-size:14px;">Shortlisted? Next is a short paid task.</span>')
k = c.rindex('<div style="flex:1 1 100%;display:flex;flex-wrap:wrap;justify-content:space-between', 0, k)
alert = submit_alert('r.submitErr', "We couldn't send your application.", '0')
alert = alert.replace('<div role="alert"', '<div style="flex:1 1 100%;"><div role="alert"', 1).replace('</div></sc-if>', '</div></div></sc-if>')
c = c[:k] + alert + '\n                  ' + c[k:]
c = rep(c, '<button type="submit" style="min-height:52px;padding:0 24px;border-radius:12px;border:none;background:#1A4AD8;color:#fff;font-weight:700;font-size:15px;cursor:pointer;" style-hover="background:#16233F;" style-active="transform:scale(0.98);">Send application →</button>',
        '<button type="submit" disabled="{{ r.busy }}" aria-busy="{{ r.busy }}" style="min-height:52px;padding:0 24px;border-radius:12px;border:none;background:#1A4AD8;color:#fff;font-weight:700;font-size:15px;cursor:pointer;" style-hover="background:#16233F;" style-active="transform:scale(0.98);">{{ r.submitLabel }}</button>')
c = rep(c, '<p style="margin:4px 0 0;color:#5A6380;font-size:15px;">We look at the work first and reply within one working day.</p></div>',
        '<p style="margin:4px 0 0;color:#5A6380;font-size:15px;">We look at the work first and reply within one working day. Reference <strong>{{ r.refNo }}</strong>.</p>'
        '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;"><a href="#process" style="background:#1A4AD8;color:#fff;padding:12px 18px;border-radius:12px;font-weight:700;font-size:14px;" style-hover="background:#16233F;color:#fff;">See how we work →</a>'
        '<button type="button" onClick="{{ r.again }}" style="min-height:44px;padding:0 18px;border-radius:12px;border:1.5px solid #E3E8F2;background:#fff;color:#111F38;font-weight:700;font-size:14px;cursor:pointer;" style-hover="border-color:#1A4AD8;color:#1A4AD8;">Apply for another role</button></div></div>')
# contact: server error, file errors, busy state
c = rep(c, '          <fieldset style="border:none;margin:0 0 28px;padding:0;">', '          ' + submit_alert('cSubmitErr', "We couldn't send your brief.", '24px') + '\n          <fieldset style="border:none;margin:0 0 28px;padding:0;">')
i = c.index('{{ cfiles }}'); j = c.index('</div>', c.index('</sc-for>', i)) + len('</div>')
c = c[:j] + '<sc-if value="{{ chas.files }}" hint-placeholder-val="{{ false }}">' + ERR_P + '{{ cerr.files }}</p></sc-if>' + c[j:]
c = rep(c, '<button type="submit" style="min-height:56px;padding:0 28px;border-radius:12px;border:none;background:#1A4AD8;color:#fff;font-weight:700;font-size:16px;cursor:pointer;" style-hover="background:#16233F;" style-active="transform:scale(0.98);">Send my brief →</button>',
        '<button type="submit" disabled="{{ cBusy }}" aria-busy="{{ cBusy }}" style="min-height:56px;padding:0 28px;border-radius:12px;border:none;background:#1A4AD8;color:#fff;font-weight:700;font-size:16px;cursor:pointer;" style-hover="background:#16233F;" style-active="transform:scale(0.98);">{{ cSubmitLabel }}</button>')
c = newsletter(c)
c = c[:c.index('<script type="text/x-dc"')] + '</body>\n</html>\n'
(OUT / 'company.dc.html').write_text(c)
print('templates prepared')
