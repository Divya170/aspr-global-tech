// Countries for the phone field: dial code, national-number length range and an example.
// US first (main market), then key markets, then the rest alphabetically.

const C = (iso, name, dial, min, max, example) => ({ iso, name, dial, min, max, example, flag: flag(iso) });
const flag = (iso) => String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));

const TOP = [
  C('US', 'United States', '1', 10, 10, '(555) 010-1234'),
  C('CA', 'Canada', '1', 10, 10, '(555) 010-1234'),
  C('GB', 'United Kingdom', '44', 9, 10, '7911 123456'),
  C('AU', 'Australia', '61', 9, 9, '412 345 678'),
  C('AE', 'United Arab Emirates', '971', 8, 9, '50 123 4567'),
  C('IN', 'India', '91', 10, 10, '98765 43210'),
];

const REST = [
  C('AT', 'Austria', '43', 7, 13, '664 123456'),
  C('BH', 'Bahrain', '973', 8, 8, '3600 1234'),
  C('BD', 'Bangladesh', '880', 10, 10, '1812 345678'),
  C('BE', 'Belgium', '32', 8, 9, '470 12 34 56'),
  C('BR', 'Brazil', '55', 10, 11, '11 91234 5678'),
  C('CN', 'China', '86', 11, 11, '131 2345 6789'),
  C('DK', 'Denmark', '45', 8, 8, '20 12 34 56'),
  C('EG', 'Egypt', '20', 10, 10, '100 123 4567'),
  C('FI', 'Finland', '358', 6, 11, '41 2345678'),
  C('FR', 'France', '33', 9, 9, '6 12 34 56 78'),
  C('DE', 'Germany', '49', 7, 12, '1512 3456789'),
  C('HK', 'Hong Kong', '852', 8, 8, '5123 4567'),
  C('IE', 'Ireland', '353', 7, 9, '85 012 3456'),
  C('IL', 'Israel', '972', 9, 9, '50 234 5678'),
  C('IT', 'Italy', '39', 6, 11, '312 345 6789'),
  C('JP', 'Japan', '81', 10, 10, '90 1234 5678'),
  C('KE', 'Kenya', '254', 9, 9, '712 123456'),
  C('KW', 'Kuwait', '965', 8, 8, '500 12345'),
  C('MY', 'Malaysia', '60', 9, 10, '12 345 6789'),
  C('MX', 'Mexico', '52', 10, 10, '222 123 4567'),
  C('NP', 'Nepal', '977', 10, 10, '984 1234567'),
  C('NL', 'Netherlands', '31', 9, 9, '6 12345678'),
  C('NZ', 'New Zealand', '64', 8, 10, '21 123 4567'),
  C('NG', 'Nigeria', '234', 10, 10, '802 123 4567'),
  C('NO', 'Norway', '47', 8, 8, '406 12 345'),
  C('OM', 'Oman', '968', 8, 8, '9212 3456'),
  C('PK', 'Pakistan', '92', 10, 10, '301 2345678'),
  C('PH', 'Philippines', '63', 10, 10, '905 123 4567'),
  C('PL', 'Poland', '48', 9, 9, '512 345 678'),
  C('PT', 'Portugal', '351', 9, 9, '912 345 678'),
  C('QA', 'Qatar', '974', 8, 8, '3312 3456'),
  C('SA', 'Saudi Arabia', '966', 9, 9, '51 234 5678'),
  C('SG', 'Singapore', '65', 8, 8, '8123 4567'),
  C('ZA', 'South Africa', '27', 9, 9, '71 123 4567'),
  C('KR', 'South Korea', '82', 9, 10, '10 2000 0000'),
  C('ES', 'Spain', '34', 9, 9, '612 34 56 78'),
  C('LK', 'Sri Lanka', '94', 9, 9, '71 234 5678'),
  C('SE', 'Sweden', '46', 7, 10, '70 123 45 67'),
  C('CH', 'Switzerland', '41', 9, 9, '78 123 45 67'),
  C('TR', 'Turkey', '90', 10, 10, '501 234 5678'),
];

export const COUNTRIES = [...TOP, ...REST];
export const DEFAULT_COUNTRY = 'US';

export const findCountry = (iso) => COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0];

/** National digits only — drops a typed dial code or a leading trunk 0 (e.g. UK 07911… → 7911…). */
function national(country, phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (String(phone || '').trim().startsWith('+') && d.startsWith(country.dial)) d = d.slice(country.dial.length);
  if (d.length > country.max && d.startsWith('0')) d = d.slice(1);
  return d;
}

/** The number as stored: "+<dial> <national digits>". */
export function fullPhone(iso, phone) {
  const c = findCountry(iso);
  return `+${c.dial} ${national(c, phone)}`;
}

export function phoneError(iso, phone) {
  const c = findCountry(iso);
  const n = national(c, phone).length;
  if (!n) return 'Enter your phone or WhatsApp number.';
  if (n < c.min || n > c.max) {
    const len = c.min === c.max ? `${c.min}` : `${c.min}–${c.max}`;
    return `${c.name} numbers have ${len} digits after +${c.dial} — check the number.`;
  }
  return null;
}

/** Best guess at the visitor's country from the browser locale; falls back to the US. */
export function guessCountry() {
  try {
    const langs = navigator.languages || [navigator.language];
    for (const l of langs) {
      const region = (l.split('-')[1] || '').toUpperCase();
      if (region && COUNTRIES.some((c) => c.iso === region)) return region;
    }
  } catch { /* ignore */ }
  return DEFAULT_COUNTRY;
}
