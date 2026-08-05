// Stopgap for a server-side bug: the API declares/serves charset=ISO-8859-1,
// but the underlying text is actually Windows-1252. Two distinct symptoms
// show up depending on where in the pipeline a character got mangled:
//
// 1. Characters already corrupted upstream of the HTTP layer arrive as a
//    JSON unicode escape sequence (plain ASCII in the response body, e.g.
//    the JSON source text for code point U+0095) - the server's own string
//    already holds the wrong C1 control code. These survive JSON.parse
//    intact and need remapping back to the CP1252 character they actually
//    represent (repairCp1252Mojibake, below).
// 2. Characters sent as raw, unescaped high bytes (0x80-0xFF) are lost
//    entirely: fetch()'s response.text()/.json() always force-decode as
//    UTF-8 regardless of the Content-Type header, and a lone Latin-1 byte
//    like 0xAE (the registered-trademark sign) is not a valid standalone
//    UTF-8 byte, so the browser replaces it with the U+FFFD replacement
//    character during the decode itself - before any JS runs. There is no
//    recovering the original byte after the fact, so this case must be
//    fixed by decoding the raw response bytes as windows-1252 in the first
//    place (decodeWindows1252Text, below), instead of via response.text().
//
// Remove both once the API serves real UTF-8 (or correctly declares and
// encodes windows-1252).
const CP1252_C1_MAP: Readonly<Record<number, string>> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„',
  0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ',
  0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ',
  0x8E: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“',
  0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›',
  0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ',
};

const C1_RANGE_START = 0x80;
const C1_RANGE_END = 0x9F;

export function repairCp1252Mojibake(text: string): string {
  let result = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    result += (code >= C1_RANGE_START && code <= C1_RANGE_END) ? (CP1252_C1_MAP[code] ?? ch) : ch;
  }
  return result;
}

// Case 1 above only manifests once a JSON escape sequence like the source
// text for U+0095 has been unescaped into a real character by JSON.parse -
// running repairCp1252Mojibake on the raw response text beforehand does
// nothing, since the escape sequence is still plain ASCII at that point.
// Call this on the value JSON.parse returns instead, so it walks every
// string it actually contains.
export function repairCp1252MojibakeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return repairCp1252Mojibake(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(item => repairCp1252MojibakeDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = repairCp1252MojibakeDeep(val);
    }
    return result as T;
  }
  return value;
}

// Reads a Response body as raw bytes and decodes it as windows-1252 instead
// of letting fetch()/Response.text() force-decode it as UTF-8. Use this in
// place of response.text() wherever the API response is affected by the
// charset bug described above.
export async function decodeWindows1252Text(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();
  return new TextDecoder('windows-1252').decode(buffer);
}
