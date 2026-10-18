import { EMA, RSI, MACD, BollingerBands, ATR, Stochastic } from 'technicalindicators';

export interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalAnalysis {
  pair: string;
  timeframe: string;
  currentPrice: number;
  indicators: {
    ema20: number;
    ema50: number;
    ema200: number;
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    bollingerBands: { upper: number; middle: number; lower: number };
    atr: number;
    stochastic: { k: number; d: number };
  };
  signals: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    momentum: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
    volatility: 'HIGH' | 'LOW' | 'NORMAL';
    entry: 'BUY' | 'SELL' | 'WAIT';
    confidence: number;
    reasons: string[];
  };
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}

export function calculateIndicators(candles: CandleData[], pair: string, timeframe: string): TechnicalAnalysis {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const currentPrice = closes[closes.length - 1];

  const ema20Values = EMA.calculate({ period: 20, values: closes });
  const ema50Values = EMA.calculate({ period: 50, values: closes });
  const ema200Values = EMA.calculate({ period: 200, values: closes });

  const rsiValues = RSI.calculate({ period: 14, values: closes });

  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const bbValues = BollingerBands.calculate({
    period: 20,
    values: closes,
    stdDev: 2,
  });

  const atrValues = ATR.calculate({
    period: 14,
    high: highs,
    low: lows,
    close: closes,
  });

  const stochValues = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3,
  });

  const ema20 = ema20Values[ema20Values.length - 1] || 0;
  const ema50 = ema50Values[ema50Values.length - 1] || 0;
  const ema200 = ema200Values[ema200Values.length - 1] || 0;
  const rsi = rsiValues[rsiValues.length - 1] || 50;
  const lastMacd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };
  const lastBB = bbValues[bbValues.length - 1] || { upper: 0, middle: 0, lower: 0 };
  const atr = atrValues[atrValues.length - 1] || 0;
  const lastStoch = stochValues[stochValues.length - 1] || { k: 50, d: 50 };

  const signals = analyzeSignals(currentPrice, ema20, ema50, ema200, rsi, lastMacd, lastBB, lastStoch, atr);
  const keyLevels = findKeyLevels(candles);

  return {
    pair,
    timeframe,
    currentPrice,
    indicators: {
      ema20,
      ema50,
      ema200,
      rsi,
      macd: { macd: lastMacd.MACD || 0, signal: lastMacd.signal || 0, histogram: lastMacd.histogram || 0 },
      bollingerBands: { upper: lastBB.upper, middle: lastBB.middle, lower: lastBB.lower },
      atr,
      stochastic: { k: lastStoch.k, d: lastStoch.d },
    },
    signals,
    keyLevels,
  };
}

function analyzeSignals(
  price: number, ema20: number, ema50: number, ema200: number,
  rsi: number, macd: any, bb: any, stoch: any, atr: number
): TechnicalAnalysis['signals'] {
  const reasons: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // Trend via EMAs
  if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
    bullishScore += 3;
    reasons.push('EMAs alignées haussières (20 > 50 > 200)');
  } else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
    bearishScore += 3;
    reasons.push('EMAs alignées baissières (20 < 50 < 200)');
  } else if (price > ema200) {
    bullishScore += 1;
    reasons.push('Prix au-dessus de la EMA 200');
  } else {
    bearishScore += 1;
    reasons.push('Prix en-dessous de la EMA 200');
  }

  // RSI
  if (rsi > 70) {
    bearishScore += 2;
    reasons.push(`RSI en surachat (${rsi.toFixed(1)})`);
  } else if (rsi < 30) {
    bullishScore += 2;
    reasons.push(`RSI en survente (${rsi.toFixed(1)})`);
  } else if (rsi > 50) {
    bullishScore += 1;
    reasons.push(`RSI haussier (${rsi.toFixed(1)})`);
  } else {
    bearishScore += 1;
    reasons.push(`RSI baissier (${rsi.toFixed(1)})`);
  }

  // MACD
  if (macd.histogram > 0 && macd.MACD > macd.signal) {
    bullishScore += 2;
    reasons.push('MACD histogramme positif + croisement haussier');
  } else if (macd.histogram < 0 && macd.MACD < macd.signal) {
    bearishScore += 2;
    reasons.push('MACD histogramme négatif + croisement baissier');
  }

  // Bollinger Bands
  if (price <= bb.lower) {
    bullishScore += 1;
    reasons.push('Prix sur la bande de Bollinger inférieure (survente)');
  } else if (price >= bb.upper) {
    bearishScore += 1;
    reasons.push('Prix sur la bande de Bollinger supérieure (surachat)');
  }

  // Stochastic
  if (stoch.k < 20 && stoch.d < 20) {
    bullishScore += 1;
    reasons.push('Stochastique en zone de survente');
  } else if (stoch.k > 80 && stoch.d > 80) {
    bearishScore += 1;
    reasons.push('Stochastique en zone de surachat');
  }

  const totalScore = bullishScore + bearishScore;
  const trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = bullishScore > bearishScore + 2 ? 'BULLISH' : bearishScore > bullishScore + 2 ? 'BEARISH' : 'NEUTRAL';
  const momentum: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' = rsi > 70 || stoch.k > 80 ? 'OVERBOUGHT' : rsi < 30 || stoch.k < 20 ? 'OVERSOLD' : 'NEUTRAL';
  const avgRange = atr / price;
  const volatility: 'HIGH' | 'LOW' | 'NORMAL' = avgRange > 0.015 ? 'HIGH' : avgRange < 0.005 ? 'LOW' : 'NORMAL';

  let entry: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  if (bullishScore >= 6 && momentum !== 'OVERBOUGHT') entry = 'BUY';
  else if (bearishScore >= 6 && momentum !== 'OVERSOLD') entry = 'SELL';

  const confidence = Math.min(Math.round((Math.abs(bullishScore - bearishScore) / totalScore) * 100), 95);

  return { trend, momentum, volatility, entry, confidence, reasons };
}

function findKeyLevels(candles: CandleData[]): { support: number[]; resistance: number[] } {
  const recentCandles = candles.slice(-50);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);
  const currentPrice = recentCandles[recentCandles.length - 1].close;

  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = 2; i < recentCandles.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      pivotHighs.push(highs[i]);
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      pivotLows.push(lows[i]);
    }
  }

  const support = [...new Set(pivotLows)].filter(l => l < currentPrice).sort((a, b) => b - a).slice(0, 3);
  const resistance = [...new Set(pivotHighs)].filter(h => h > currentPrice).sort((a, b) => a - b).slice(0, 3);

  return { support, resistance };
}
