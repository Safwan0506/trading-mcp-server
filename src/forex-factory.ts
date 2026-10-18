import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface ForexNews {
  time: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  event: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface FundamentalAnalysis {
  upcomingHighImpact: ForexNews[];
  currencyBias: Record<string, 'BULLISH' | 'BEARISH' | 'NEUTRAL'>;
  summary: string;
}

export async function fetchForexFactoryCalendar(): Promise<ForexNews[]> {
  try {
    const url = 'https://www.forexfactory.com/calendar?week=this';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const news: ForexNews[] = [];

    $('tr.calendar__row').each((_, row) => {
      const $row = $(row);
      const time = $row.find('.calendar__time').text().trim();
      const currency = $row.find('.calendar__currency').text().trim();
      const event = $row.find('.calendar__event-title').text().trim();
      const actual = $row.find('.calendar__actual').text().trim();
      const forecast = $row.find('.calendar__forecast').text().trim();
      const previous = $row.find('.calendar__previous').text().trim();

      let impact: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if ($row.find('.icon--ff-impact-red').length > 0) impact = 'HIGH';
      else if ($row.find('.icon--ff-impact-ora').length > 0) impact = 'MEDIUM';
      else if ($row.find('.icon--ff-impact-yel').length > 0) impact = 'LOW';

      if (event && currency) {
        news.push({ time, currency, impact, event, actual: actual || undefined, forecast: forecast || undefined, previous: previous || undefined });
      }
    });

    return news;
  } catch (error) {
    console.error('Erreur scraping Forex Factory:', error);
    return getFallbackCalendar();
  }
}

function getFallbackCalendar(): ForexNews[] {
  return [
    { time: 'N/A', currency: 'USD', impact: 'HIGH', event: 'Calendrier indisponible - vérifiez manuellement Forex Factory' },
  ];
}

export function analyzeFundamentals(news: ForexNews[], targetPair: string): FundamentalAnalysis {
  const currencies = targetPair.split('/');
  const highImpact = news.filter(n => n.impact === 'HIGH');

  const relevantNews = highImpact.filter(n =>
    currencies.some(c => c === n.currency)
  );

  const upcomingHighImpact = relevantNews.slice(0, 10);

  const currencyBias: Record<string, 'BULLISH' | 'BEARISH' | 'NEUTRAL'> = {};
  for (const curr of currencies) {
    const currNews = highImpact.filter(n => n.currency === curr);
    let positive = 0;
    let negative = 0;

    for (const n of currNews) {
      if (n.actual && n.forecast) {
        const actual = parseFloat(n.actual.replace('%', ''));
        const forecast = parseFloat(n.forecast.replace('%', ''));
        if (!isNaN(actual) && !isNaN(forecast)) {
          if (actual > forecast) positive++;
          else if (actual < forecast) negative++;
        }
      }
    }

    currencyBias[curr] = positive > negative ? 'BULLISH' : negative > positive ? 'BEARISH' : 'NEUTRAL';
  }

  const summary = generateFundamentalSummary(upcomingHighImpact, currencyBias, targetPair);

  return { upcomingHighImpact, currencyBias, summary };
}

function generateFundamentalSummary(
  news: ForexNews[],
  bias: Record<string, string>,
  pair: string
): string {
  const parts: string[] = [];
  const [base, quote] = pair.split('/');

  parts.push(`📊 Analyse fondamentale ${pair}:`);

  if (news.length === 0) {
    parts.push('Aucune news high-impact à venir pour cette paire.');
  } else {
    parts.push(`${news.length} événement(s) high-impact à surveiller:`);
    for (const n of news.slice(0, 5)) {
      parts.push(`  • [${n.currency}] ${n.event} (${n.time})`);
      if (n.forecast) parts.push(`    Prévision: ${n.forecast} | Précédent: ${n.previous || 'N/A'}`);
    }
  }

  parts.push('');
  parts.push('Biais fondamental:');
  parts.push(`  ${base}: ${bias[base] || 'NEUTRAL'}`);
  parts.push(`  ${quote}: ${bias[quote] || 'NEUTRAL'}`);

  if (bias[base] === 'BULLISH' && bias[quote] === 'BEARISH') {
    parts.push(`  → Confluence haussière pour ${pair}`);
  } else if (bias[base] === 'BEARISH' && bias[quote] === 'BULLISH') {
    parts.push(`  → Confluence baissière pour ${pair}`);
  } else {
    parts.push(`  → Pas de confluence claire, prudence`);
  }

  return parts.join('\n');
}
