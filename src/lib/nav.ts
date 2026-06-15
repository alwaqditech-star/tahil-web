/** يحوّل رابط إشعار (قديماً كاملاً أو localhost) إلى مسار نسبي داخل التطبيق */
export function toAppPath(link: string): string {
  if (link.startsWith("/")) return link;
  try {
    const url = new URL(link);
    return url.pathname + url.search + url.hash;
  } catch {
    return link.startsWith("/") ? link : `/${link}`;
  }
}
