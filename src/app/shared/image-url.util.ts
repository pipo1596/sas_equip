// Guards against bad data in image-URL fields (seen in the wild: a
// thumbnailUrl of "Available in Regular 100% Polyester" — a description
// string, not a path) reaching an <img [src]> or being requested as a URL.
// A raw '%' not part of a valid escape sequence crashes the dev server's
// URL decoding, so we only treat a value as displayable when it looks like
// an actual path or absolute URL.
export function isDisplayableImageUrl(url: string | null | undefined): url is string {
  return !!url && /^(https?:\/\/|\/)/.test(url);
}
