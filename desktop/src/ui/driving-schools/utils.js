// @ts-check
export const api = /** @type {any} */ (window).mebbisAPI;

export function cleanError(err) {
  const raw = err?.message || '';
  const m = raw.match(/Error invoking remote method '[^']+':\s*(?:Error:\s*)?(.+)$/);
  const msg = (m ? m[1] : raw).trim();
  return msg
    .replace(/https?:\/\/[^\s"'\])]+/g, '[server]')
    .replace(/[^\s"'\])]*\.mtsk\.app[^\s"'\])]*/g, '[server]');
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
