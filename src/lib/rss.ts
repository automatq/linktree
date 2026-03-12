export async function fetchLatestRssItem(
  feedUrl: string
): Promise<{ title: string; url: string } | null> {
  try {
    const res = await fetch(feedUrl, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "TriLink/1.0 (RSS reader)" },
    });
    if (!res.ok) return null;
    const xml = await res.text();

    // RSS 2.0
    const itemMatch = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/);
    if (itemMatch) {
      const item = itemMatch[1];
      const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch =
        item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/) ||
        item.match(/<link[^>]* href="([^"]+)"/);
      const title = titleMatch?.[1]?.trim() ?? "";
      const url = linkMatch?.[1]?.trim() ?? "";
      if (title && url) return { title, url };
    }

    // Atom
    const entryMatch = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/);
    if (entryMatch) {
      const entry = entryMatch[1];
      const titleMatch = entry.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = entry.match(/<link[^>]* href="([^"]+)"/);
      const title = titleMatch?.[1]?.trim() ?? "";
      const url = linkMatch?.[1]?.trim() ?? "";
      if (title && url) return { title, url };
    }

    return null;
  } catch {
    return null;
  }
}
