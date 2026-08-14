import { createServerFn } from "@tanstack/react-start";

export type LiveGoldRates = Record<number, { sell: number; buy: number }>;

/**
 * Server function to fetch and scrape live Egyptian gold prices.
 * Runs on the server side, completely bypassing CORS constraints.
 */
export const fetchLiveEgyptianGoldRates = createServerFn({
  method: "GET",
}).handler(async (): Promise<LiveGoldRates> => {
  try {
    const res = await fetch("https://egypt.gold-price-today.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch webpage, status: ${res.status}`);
    }

    const html = await res.text();
    
    // Scrape Karat, Sell Price, and Buy Price rows
    const rowRegex = /<tr[\s\S]*?عيار\s*(24|22|21|18|14)[\s\S]*?tracking-tight">([\d,]+)[\s\S]*?tracking-tight">([\d,]+)/g;
    
    const rates: LiveGoldRates = {};
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const karat = parseInt(match[1] ?? "0");
      const sell = parseFloat((match[2] ?? "0").replace(/,/g, ""));
      const buy = parseFloat((match[3] ?? "0").replace(/,/g, ""));
      
      // Capture the first occurrence (which is the latest pricing)
      if (!rates[karat]) {
        rates[karat] = { sell, buy };
      }
    }

    return rates;
  } catch (err) {
    console.error("Error scraping live gold rates:", err);
    throw err;
  }
});
