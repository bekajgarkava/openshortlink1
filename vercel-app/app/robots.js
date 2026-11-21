// Let compliant crawlers retrieve X-Robots-Tag and meta noindex.
// Disallowing crawling could prevent crawlers from seeing the noindex directive.
export default function robots() {
 return { rules: [{ userAgent: "*", allow: "/" }] };
}
