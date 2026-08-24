/**
 * Lightweight web search utility for live device specifications, warranty, and technical queries
 */
export async function performWebSearch(query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    const snippets = [];
    const titles = [];
    const urls = [];

    // Extract snippets
    const snippetRegex = /<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      const clean = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      if (clean.length > 25) {
        snippets.push(clean);
      }
    }

    // Extract titles & URLs
    const titleRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let titleMatch;
    while ((titleMatch = titleRegex.exec(html)) !== null && urls.length < 5) {
      let rawUrl = titleMatch[1];
      const matchUddg = rawUrl.match(/uddg=([^&]+)/);
      if (matchUddg) {
        rawUrl = decodeURIComponent(matchUddg[1]);
      }
      const cleanTitle = titleMatch[2].replace(/<[^>]+>/g, "").trim();
      if (rawUrl.startsWith("http")) {
        urls.push({ url: rawUrl, title: cleanTitle || "Web Search Reference" });
      }
    }

    return {
      snippets,
      citations: urls.slice(0, 3).map((u) => ({
        title: u.title,
        url: u.url,
        source_type: "web_search",
        score: 0.92,
      })),
    };
  } catch (err) {
    console.warn(`[WebSearch] Search lookup failed (${err.message}).`);
    return { snippets: [], citations: [] };
  }
}

export default { performWebSearch };
