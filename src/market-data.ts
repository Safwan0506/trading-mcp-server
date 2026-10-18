import fetch from 'node-fetch';
import { CandleData } from './indicators.js';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

export interface MarketDataConfig {
  apiKey: string;
}

const FOREX_PAIRS: Record<string, { from: string; to: string }> = {
  'EUR/USD': { from: 'EUR', to: 'USD' },
  'GBP/USD': { from: 'GBP', to: 'USD' },
  'USD/JPY': { from: 'USD', to: 'JPY' },
  'USD/CHF': { from: 'USD', to: 'CHF' },
  'AUD/USD': { from: 'AUD', to: 'USD' },
  'NZD/USD': { from: 'NZD', to: 'USD' },
  'USD/CAD': { from: 'USD', to: 'CAD' },
  'EUR/GBP': { from: 'EUR', to: 'GBP' },
  'EUR/JPY': { from: 'EUR', to: 'JPY' },
  'GBP/JPY': { from: 'GBP', to: 'JPY' },
};

export function getAvailablePairs(): string[] {
  return Object.keys(FOREX_PAIRS);
}

export async function fetchForexData(
  pair: string,
  timeframe: string,
  config: MarketDataConfig
): Promise<CandleData[]> {
  const pairInfo = FOREX_PAIRS[pair.toUpperCase()];
  if (!pairInfo) {
    throw new Error(`Paire non supportée: ${pair}. Disponibles: ${Object.keys(FOREX_PAIRS).join(', ')}`);
  }

  const interval = mapTimeframe(timeframe);
  const func = interval === 'daily' ? 'FX_DAILY' : 'FX_INTRADAY';

  const params = new URLSearchParams({
    function: func,
    from_symbol: pairInfo.from,
    to_symbol: pairInfo.to,
    apikey: config.apiKey,
    outputsize: 'full',
  });

  if (func === 'FX_INTRADAY') {
    params.set('interval', interval);
  }

  const url = `${ALPHA_VANTAGE_BASE}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json() as any;

  if (data['Error Message']) {
    throw new Error(`API Error: ${data['Error Message']}`);
  }
  if (data['Note']) {
    throw new Error(`API Rate Limit: ${data['Note']}`);
  }

  const timeSeriesKey = Object.keys(data).find(k => k.startsWith('Time Series'));
  if (!timeSeriesKey) {
    throw new Error(`Pas de données reçues pour ${pair} ${timeframe}. Réponse: ${JSON.stringify(data).slice(0, 200)}`);
  }

  const timeSeries = data[timeSeriesKey];
  const candles: CandleData[] = Object.entries(timeSeries)
    .map(([timestamp, values]: [string, any]) => ({
      timestamp,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
    }))
    .reverse()
    .slice(-300);

  return candles;
}

function mapTimeframe(tf: string): string {
  const map: Record<string, string> = {
    'M1': '1min',
    'M5': '5min',
    'M15': '15min',
    'M30': '30min',
    'H1': '60min',
    'H4': '60min', // Alpha Vantage ne supporte pas H4, on prend H1
    'D1': 'daily',
  };
  return map[tf.toUpperCase()] || '15min';
}
