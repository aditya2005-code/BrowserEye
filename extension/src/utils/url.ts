/**
 * Helper to extract domain from a full URL string, removing 'www.' if present.
 */
export function getDomain(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname.replace(/^www\./i, '');
  } catch (_error) {
    return 'unknown';
  }
}
