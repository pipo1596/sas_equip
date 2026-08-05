// Encodes every non-ASCII character in WYSIWYG (Quill) HTML as a numeric
// character reference (e.g. a bullet becomes its numeric entity) before the
// content is sent to the API. The payload stays plain ASCII on the wire, so
// it can't be corrupted by the server's charset bug in either direction -
// any HTML parser (including Quill re-rendering the saved value later)
// decodes numeric entities back to the original character on display.
export function htmlEncodeNonAscii(html: string): string {
  let result = '';
  for (const ch of html) {
    const code = ch.codePointAt(0) ?? 0;
    result += code > 127 ? `&#${code};` : ch;
  }
  return result;
}
