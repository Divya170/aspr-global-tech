"""dc2jsx — converts an ASPR design template (*.dc.html) into a React view.

The design templates use a tiny binding language:
  {{ path }}                      text / attribute interpolation
  <sc-for list="{{ x }}" as="i">  loops
  <sc-if value="{{ x }}">         conditionals
  style="…" / style-hover="…"     inline styles and pseudo-class styles

This script turns one template into a pure, presentational JSX component
`View({ v })` where `v` is the object returned by the page logic's
renderVals(). Pseudo-class styles are compiled into a shared CSS file
(`.pc-xxxx:hover{… !important}`), exactly as the design runtime does it,
so the rendered result is pixel-identical to the approved design.

usage: python3 dc2jsx.py <template> <ComponentName> <out.jsx> <pseudo.css>
"""
import hashlib, html, json, re, sys, pathlib

VOID = {'img', 'input', 'meta', 'link', 'br', 'hr', 'source', 'area', 'col', 'wbr'}
ATTR_MAP = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'readonly': 'readOnly',
            'maxlength': 'maxLength', 'autocomplete': 'autoComplete', 'autofocus': 'autoFocus',
            'novalidate': 'noValidate', 'srcset': 'srcSet', 'crossorigin': 'crossOrigin',
            'enctype': 'encType', 'colspan': 'colSpan', 'rowspan': 'rowSpan'}
BOOL_ATTRS = {'multiple', 'required', 'noValidate', 'disabled', 'checked', 'readOnly', 'autoFocus', 'hidden', 'selected'}
PSEUDO = {'hover': 'hover', 'focus': 'focus', 'active': 'active', 'focus-visible': 'focus-visible', 'focus-within': 'focus-within'}

TOKEN = re.compile(r'<!--(.*?)-->|<(/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(/?)>|([^<]+)', re.S)
ATTR = re.compile(r'([^\s=>/]+)(?:="([^"]*)")?')
INTERP = re.compile(r'\{\{([\s\S]+?)\}\}')


class Node:
    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.parent, self.kids = tag, attrs or [], parent, []


def parse(src):
    root = Node('#root'); cur = root
    for m in TOKEN.finditer(src):
        comment, close, tag, attrs, selfclose, text = m.groups()
        if comment is not None:
            n = Node('#comment', parent=cur); n.text = comment.strip(); cur.kids.append(n)
        elif text is not None:
            n = Node('#text', parent=cur); n.text = text; cur.kids.append(n)
        elif close:
            t = tag.lower()
            if t in VOID:
                continue
            assert cur.tag == t, f'mismatched </{t}> (open: <{cur.tag}>)'
            cur = cur.parent
        else:
            t = tag.lower() if not tag.startswith('sc-') else tag
            n = Node(t, [(a, v) for a, v in ATTR.findall(attrs)], cur)
            cur.kids.append(n)
            if not (selfclose or t in VOID):
                cur = n
    assert cur is root, f'unclosed <{cur.tag}>'
    return root


def camel(prop):
    if prop.startswith('--'):
        return prop
    if prop.startswith('-ms-'):
        prop = 'ms-' + prop[4:]
    elif prop.startswith('-'):
        prop = prop[1:]
        prop = prop[0].upper() + prop[1:]
    return re.sub(r'-([a-z])', lambda m: m.group(1).upper(), prop)


def split_decls(css):
    out, depth, quote, start = [], 0, '', 0
    for i, ch in enumerate(css):
        if quote:
            if ch == quote: quote = ''
        elif ch in '\'"': quote = ch
        elif ch == '(': depth += 1
        elif ch == ')': depth -= 1
        elif ch == ';' and depth == 0:
            out.append(css[start:i]); start = i + 1
    out.append(css[start:])
    return [d.strip() for d in out if d.strip()]


class Emitter:
    def __init__(self, pseudo_rules):
        self.pseudo_rules = pseudo_rules  # ordered dict: key -> (cls, rule)

    # ── expressions ──
    def expr(self, raw, scope):
        e = raw.strip()
        if e.startswith('!'):
            return '!' + self.expr(e[1:], scope)
        if e in ('true', 'false', 'null', 'undefined') or re.fullmatch(r'-?\d+(\.\d+)?', e):
            return e
        if len(e) >= 2 and e[0] == e[-1] and e[0] in '\'"':
            return json.dumps(e[1:-1])
        assert re.fullmatch(r'[A-Za-z_$][\w$]*(\.[\w$]+)*', e), f'unsupported expression {e!r}'
        head, *rest = e.split('.')
        base = head if head in scope else 'v.' + head
        return base + ''.join('?.' + r for r in rest)

    def interp_value(self, raw, scope):
        """Attribute/CSS value → JS expression source."""
        whole = re.fullmatch(r'\s*\{\{([\s\S]+?)\}\}\s*', raw)
        if whole:
            return self.expr(whole.group(1), scope), True
        if '{{' in raw:
            parts = INTERP.split(raw); out = ''
            for i, p in enumerate(parts):
                out += ('${' + self.expr(p, scope) + ' ?? ""}') if i % 2 else p.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
            return '`' + out + '`', True
        return json.dumps(raw, ensure_ascii=False), False

    def style(self, css, scope):
        props = {}
        for d in split_decls(html.unescape(css)):
            k, _, val = d.partition(':')
            props[camel(k.strip())] = self.interp_value(val.strip(), scope)[0]
        return '{{ ' + ', '.join(f'{json.dumps(k) if not re.fullmatch(r"[A-Za-z_$][\w$]*", k) else k}: {v}' for k, v in props.items()) + ' }}'

    def pseudo_class(self, pseudo, css):
        key = pseudo + '|' + css
        if key not in self.pseudo_rules:
            cls = 'pc-' + hashlib.sha1(key.encode()).hexdigest()[:7]
            decls = ';'.join(d if d.rstrip().endswith('!important') else d + ' !important' for d in split_decls(html.unescape(css)))
            self.pseudo_rules[key] = (cls, f'.{cls}:{PSEUDO[pseudo]}{{{decls}}}')
        return self.pseudo_rules[key][0]

    # ── nodes ──
    def text(self, raw, scope):
        txt = html.unescape(raw)
        if '{{' not in txt:
            if not txt.strip():
                return ['{" "}'] if ' ' in txt else []
            collapsed = re.sub(r'\s+', ' ', txt)
            if not re.search(r'[{}<>&"]', collapsed) and collapsed == collapsed.strip():
                return [collapsed]
            return ['{' + json.dumps(collapsed, ensure_ascii=False) + '}']
        out = []
        for i, p in enumerate(INTERP.split(txt)):
            if i % 2:
                out.append('{t(' + self.expr(p, scope) + ')}')
            elif p:
                collapsed = re.sub(r'\s+', ' ', p)
                if collapsed.strip() or ' ' in p:
                    out.append('{' + json.dumps(collapsed, ensure_ascii=False) + '}')
        return out

    INLINE = {'span', 'a', 'img', 'strong', 'em', 'b', 'i', 'button', 'input', 'label', 'svg', 'textarea', 'code', 'small', 'select'}

    @staticmethod
    def display_of(n):
        m = re.search(r'(?:^|;)\s*display\s*:\s*([\w-]+)', dict(n.attrs).get('style', ''))
        return m.group(1) if m else None

    def is_inline(self, n, first):
        """Is the rendered box at this edge of `n` inline-level (so whitespace next to it shows)?"""
        if n is None:
            return False
        if n.tag == '#text':
            return bool(n.text.strip())
        if n.tag == '#comment':
            return False
        if n.tag.startswith('sc-'):
            real = [k for k in n.kids if not (k.tag == '#text' and not k.text.strip()) and k.tag != '#comment']
            return self.is_inline(real[0] if first else real[-1], first) if real else False
        d = self.display_of(n)
        if d:
            return d.startswith('inline')
        return n.tag in self.INLINE

    def children(self, node, scope, ind, flex=None):
        if flex is None:
            d = self.display_of(node) or ''
            flex = any(x in d for x in ('flex', 'grid'))
        out = []
        kids = node.kids
        for i, k in enumerate(kids):
            if k.tag == '#text' and not k.text.strip():
                prev = kids[i - 1] if i else None
                nxt = kids[i + 1] if i + 1 < len(kids) else None
                if flex or not (self.is_inline(prev, False) and self.is_inline(nxt, True)):
                    continue  # collapsible whitespace with no visible effect here
            if k.tag == '#text' and flex and '{{' not in k.text:
                k = Node('#text'); k.text = kids[i].text.strip()
            out.extend(self.node(k, scope, ind, flex))
        return out

    def node(self, n, scope, ind, flex=False):
        pad = '  ' * ind
        if n.tag == '#text':
            return [pad + x for x in self.text(n.text, scope)]
        if n.tag == '#comment':
            return [pad + '{/* ' + n.text.replace('*/', '* /') + ' */}']
        a = dict(n.attrs)
        if n.tag == 'sc-for':
            lst = self.expr(INTERP.fullmatch(a['list'].strip()).group(1), scope)
            var = a.get('as', 'item'); inner = scope | {var}
            body = self.children(n, inner, ind + 2, flex)
            return [pad + f'{{({lst} || []).map(({var}, $i) => (',
                    pad + '  <Fragment key={$i}>', *body, pad + '  </Fragment>', pad + '))}']
        if n.tag == 'sc-if':
            cond = self.expr(INTERP.fullmatch(a['value'].strip()).group(1), scope)
            body = self.children(n, scope, ind + 2, flex)
            return [pad + f'{{{cond} ? (', pad + '  <>', *body, pad + '  </>', pad + ') : null}']
        props, classes = [], []
        for name, val in n.attrs:
            if name.startswith('hint-'):
                continue
            if name.startswith('style-'):
                classes.append(self.pseudo_class(name[6:], val)); continue
            if name == 'style':
                props.append('style=' + self.style(val, scope)); continue
            if name == 'class':
                classes.insert(0, val); continue
            key = ATTR_MAP.get(name, name)
            if '-' in key and not (key.startswith('aria-') or key.startswith('data-')):
                key = camel(key)
            if val == '' and key in BOOL_ATTRS:
                props.append(key); continue
            js, dynamic = self.interp_value(html.unescape(val), scope)
            props.append(f'{key}={{{js}}}' if dynamic or '&' in val or '"' in js[1:-1] or '\\' in js else f'{key}={js}')
        if classes:
            props.insert(0, 'className=' + json.dumps(' '.join(classes)))
        open_tag = '<' + n.tag + (' ' + ' '.join(props) if props else '')
        if n.tag in VOID or not n.kids:
            return [pad + open_tag + ' />']
        body = self.children(n, scope, ind + 1)
        if len(body) == 1 and len(body[0].strip()) + len(open_tag) < 160 and not body[0].strip().startswith('{/*'):
            return [pad + open_tag + '>' + body[0].strip() + '</' + n.tag + '>']
        return [pad + open_tag + '>', *body, pad + '</' + n.tag + '>']


def main():
    src_path, comp, out_path, css_path = sys.argv[1:5]
    src = pathlib.Path(src_path).read_text()
    body = src[src.index('<x-dc>') + 6: src.index('</x-dc>')]
    body = re.sub(r'<helmet>[\s\S]*?</helmet>', '', body)
    root = parse(body)
    css_file = pathlib.Path(css_path)
    rules = {}
    if css_file.exists():  # keep rules from views converted earlier (shared stylesheet)
        for m in re.finditer(r'/\* (.+?) \*/\n(\.(pc-\w+)[^\n]+)', css_file.read_text()):
            rules[m.group(1)] = (m.group(3), m.group(2))
    em = Emitter(rules)
    lines = em.children(root, set(), 3)
    jsx = '\n'.join(lines)
    out = f"""// AUTO-GENERATED by tools/dc2jsx.py from the approved design template
// ({pathlib.Path(src_path).name}). The markup and inline styles are the design's own —
// edit the template and re-run `npm run views` rather than hand-editing layout here.
// All data and behaviour arrive through `v` (see the matching *Logic component).
import {{ Fragment }} from 'react';
import {{ t }} from './interp';

export default function {comp}({{ v }}) {{
  return (
    <>
{jsx}
    </>
  );
}}
"""
    pathlib.Path(out_path).write_text(out)
    css = '/* AUTO-GENERATED by tools/dc2jsx.py — pseudo-class styles from the design templates. */\n'
    css += '\n'.join(f'/* {k} */\n{rule}' for k, (cls, rule) in rules.items()) + '\n'
    css_file.write_text(css)
    print(f'{comp}: {len(lines)} lines, {len(rules)} pseudo rules')


if __name__ == '__main__':
    main()
