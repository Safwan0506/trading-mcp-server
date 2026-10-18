import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fetchForexData, getAvailablePairs, MarketDataConfig } from './market-data.js';
import { calculateIndicators } from './indicators.js';
import { fetchForexFactoryCalendar, analyzeFundamentals } from './forex-factory.js';

const config: MarketDataConfig = {
  apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
};

const server = new Server(
  { name: 'trading-analysis', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze_pair',
      description: 'Analyse technique complète d\'une paire forex (indicateurs, signaux, niveaux clés). Combine EMA, RSI, MACD, Bollinger, Stochastic pour générer un signal BUY/SELL/WAIT avec niveau de confiance.',
      inputSchema: {
        type: 'object',
        properties: {
          pair: {
            type: 'string',
            description: 'Paire forex (ex: EUR/USD, GBP/USD, USD/JPY)',
            enum: getAvailablePairs(),
          },
          timeframe: {
            type: 'string',
            description: 'Timeframe d\'analyse',
            enum: ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
          },
        },
        required: ['pair', 'timeframe'],
      },
    },
    {
      name: 'forex_calendar',
      description: 'Récupère le calendrier économique de Forex Factory (news high/medium/low impact) pour la semaine en cours.',
      inputSchema: {
        type: 'object',
        properties: {
          currency: {
            type: 'string',
            description: 'Filtrer par devise (ex: USD, EUR, GBP). Vide = toutes.',
          },
        },
      },
    },
    {
      name: 'full_analysis',
      description: 'Analyse complète combinant technique + fondamental pour une paire forex. Donne un verdict final avec score de confiance, niveaux d\'entrée suggérés, stop loss et take profit.',
      inputSchema: {
        type: 'object',
        properties: {
          pair: {
            type: 'string',
            description: 'Paire forex à analyser',
            enum: getAvailablePairs(),
          },
          timeframe: {
            type: 'string',
            description: 'Timeframe principal',
            enum: ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
          },
        },
        required: ['pair', 'timeframe'],
      },
    },
    {
      name: 'multi_timeframe',
      description: 'Analyse multi-timeframe (top-down) : D1 → H4 → timeframe d\'entrée. Identifie si les timeframes sont alignés pour confirmer un trade.',
      inputSchema: {
        type: 'object',
        properties: {
          pair: {
            type: 'string',
            description: 'Paire forex',
            enum: getAvailablePairs(),
          },
          entry_timeframe: {
            type: 'string',
            description: 'Timeframe d\'entrée (scalping)',
            enum: ['M1', 'M5', 'M15'],
          },
        },
        required: ['pair', 'entry_timeframe'],
      },
    },
    {
      name: 'available_pairs',
      description: 'Liste les paires forex disponibles pour l\'analyse.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_pair': {
        const candles = await fetchForexData(args!.pair as string, args!.timeframe as string, config);
        const analysis = calculateIndicators(candles, args!.pair as string, args!.timeframe as string);
        return { content: [{ type: 'text', text: formatTechnicalAnalysis(analysis) }] };
      }

      case 'forex_calendar': {
        const news = await fetchForexFactoryCalendar();
        const filtered = args?.currency
          ? news.filter(n => n.currency === (args.currency as string).toUpperCase())
          : news;
        return { content: [{ type: 'text', text: formatCalendar(filtered) }] };
      }

      case 'full_analysis': {
        const pair = args!.pair as string;
        const tf = args!.timeframe as string;

        const [candles, news] = await Promise.all([
          fetchForexData(pair, tf, config),
          fetchForexFactoryCalendar(),
        ]);

        const technical = calculateIndicators(candles, pair, tf);
        const fundamental = analyzeFundamentals(news, pair);
        const verdict = generateVerdict(technical, fundamental);

        return { content: [{ type: 'text', text: verdict }] };
      }

      case 'multi_timeframe': {
        const pair = args!.pair as string;
        const entryTf = args!.entry_timeframe as string;

        const [d1Candles, h1Candles, entryCandles] = await Promise.all([
          fetchForexData(pair, 'D1', config),
          fetchForexData(pair, 'H1', config),
          fetchForexData(pair, entryTf, config),
        ]);

        const d1Analysis = calculateIndicators(d1Candles, pair, 'D1');
        const h1Analysis = calculateIndicators(h1Candles, pair, 'H1');
        const entryAnalysis = calculateIndicators(entryCandles, pair, entryTf);

        const mtfResult = formatMultiTimeframe(d1Analysis, h1Analysis, entryAnalysis);
        return { content: [{ type: 'text', text: mtfResult }] };
      }

      case 'available_pairs': {
        return { content: [{ type: 'text', text: `Paires disponibles:\n${getAvailablePairs().join('\n')}` }] };
      }

      default:
        return { content: [{ type: 'text', text: `Outil inconnu: ${name}` }] };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `❌ Erreur: ${error.message}` }] };
  }
});

function formatTechnicalAnalysis(a: any): string {
  return `
═══════════════════════════════════════════
📈 ANALYSE TECHNIQUE: ${a.pair} (${a.timeframe})
═══════════════════════════════════════════

💰 Prix actuel: ${a.currentPrice.toFixed(5)}

📊 INDICATEURS:
  EMA 20:  ${a.indicators.ema20.toFixed(5)}
  EMA 50:  ${a.indicators.ema50.toFixed(5)}
  EMA 200: ${a.indicators.ema200.toFixed(5)}
  RSI(14): ${a.indicators.rsi.toFixed(1)}
  MACD:    ${a.indicators.macd.macd.toFixed(5)} (Signal: ${a.indicators.macd.signal.toFixed(5)})
  BB:      [${a.indicators.bollingerBands.lower.toFixed(5)} - ${a.indicators.bollingerBands.upper.toFixed(5)}]
  ATR(14): ${a.indicators.atr.toFixed(5)}
  Stoch:   K=${a.indicators.stochastic.k.toFixed(1)} D=${a.indicators.stochastic.d.toFixed(1)}

🎯 SIGNAUX:
  Tendance:   ${a.signals.trend}
  Momentum:   ${a.signals.momentum}
  Volatilité: ${a.signals.volatility}
  Signal:     ${a.signals.entry}
  Confiance:  ${a.signals.confidence}%

📝 Raisons:
${a.signals.reasons.map((r: string) => `  • ${r}`).join('\n')}

🔑 NIVEAUX CLÉS:
  Résistances: ${a.keyLevels.resistance.map((r: number) => r.toFixed(5)).join(' | ') || 'N/A'}
  Supports:    ${a.keyLevels.support.map((s: number) => s.toFixed(5)).join(' | ') || 'N/A'}
═══════════════════════════════════════════`;
}

function formatCalendar(news: any[]): string {
  const highImpact = news.filter((n: any) => n.impact === 'HIGH');
  const medImpact = news.filter((n: any) => n.impact === 'MEDIUM');

  let result = '═══════════════════════════════════════════\n';
  result += '📅 CALENDRIER ÉCONOMIQUE (semaine en cours)\n';
  result += '═══════════════════════════════════════════\n\n';

  result += '🔴 HIGH IMPACT:\n';
  if (highImpact.length === 0) result += '  Aucun événement\n';
  for (const n of highImpact) {
    result += `  [${n.time}] ${n.currency} - ${n.event}`;
    if (n.forecast) result += ` (Prev: ${n.forecast})`;
    if (n.actual) result += ` → Actual: ${n.actual}`;
    result += '\n';
  }

  result += '\n🟠 MEDIUM IMPACT:\n';
  if (medImpact.length === 0) result += '  Aucun événement\n';
  for (const n of medImpact.slice(0, 10)) {
    result += `  [${n.time}] ${n.currency} - ${n.event}\n`;
  }

  return result;
}

function generateVerdict(technical: any, fundamental: any): string {
  const techSignal = technical.signals;
  const fundBias = fundamental.currencyBias;
  const [base, quote] = technical.pair.split('/');

  let confluenceScore = techSignal.confidence;
  let direction = techSignal.entry;

  // Ajuster avec le fondamental
  if (techSignal.entry === 'BUY' && fundBias[base] === 'BULLISH') confluenceScore += 10;
  if (techSignal.entry === 'BUY' && fundBias[quote] === 'BEARISH') confluenceScore += 10;
  if (techSignal.entry === 'SELL' && fundBias[base] === 'BEARISH') confluenceScore += 10;
  if (techSignal.entry === 'SELL' && fundBias[quote] === 'BULLISH') confluenceScore += 10;

  // Contradiction fondamental/technique
  if (techSignal.entry === 'BUY' && fundBias[base] === 'BEARISH') confluenceScore -= 15;
  if (techSignal.entry === 'SELL' && fundBias[base] === 'BULLISH') confluenceScore -= 15;

  confluenceScore = Math.max(0, Math.min(95, confluenceScore));

  const atr = technical.indicators.atr;
  const sl = atr * 1.5;
  const tp1 = atr * 2;
  const tp2 = atr * 3;

  let result = `
╔═══════════════════════════════════════════╗
║  🎯 ANALYSE COMPLÈTE: ${technical.pair}
║  Timeframe: ${technical.timeframe}
╚═══════════════════════════════════════════╝

━━━ TECHNIQUE ━━━
  Signal: ${techSignal.entry} | Tendance: ${techSignal.trend}
  Confiance technique: ${techSignal.confidence}%
  Momentum: ${techSignal.momentum} | Volatilité: ${techSignal.volatility}

━━━ FONDAMENTAL ━━━
${fundamental.summary}

━━━ VERDICT FINAL ━━━
  📍 Direction: ${direction}
  📊 Score de confluence: ${confluenceScore}%
  ${confluenceScore >= 70 ? '✅ CONFLUENCE FORTE' : confluenceScore >= 50 ? '⚠️ CONFLUENCE MODÉRÉE' : '❌ PAS DE CONFLUENCE'}
`;

  if (direction !== 'WAIT') {
    const price = technical.currentPrice;
    const entry = price;
    const stopLoss = direction === 'BUY' ? price - sl : price + sl;
    const takeProfit1 = direction === 'BUY' ? price + tp1 : price - tp1;
    const takeProfit2 = direction === 'BUY' ? price + tp2 : price - tp2;

    result += `
━━━ PLAN DE TRADE SUGGÉRÉ ━━━
  Entrée:  ${entry.toFixed(5)}
  Stop Loss: ${stopLoss.toFixed(5)} (${(sl * 10000).toFixed(1)} pips)
  TP1: ${takeProfit1.toFixed(5)} (${(tp1 * 10000).toFixed(1)} pips) - R:R 1:1.3
  TP2: ${takeProfit2.toFixed(5)} (${(tp2 * 10000).toFixed(1)} pips) - R:R 1:2

  ⚠️  RAPPEL: Toujours confirmer visuellement sur le chart.
  ⚠️  Ne risquer que 1-2% du capital par trade.
`;
  } else {
    result += `
  ⏸️  RECOMMANDATION: ATTENDRE
  Pas de confluence suffisante pour entrer.
  Attendez un meilleur setup ou un timeframe aligné.
`;
  }

  result += `
━━━ NIVEAUX CLÉS ━━━
  Résistances: ${technical.keyLevels.resistance.map((r: number) => r.toFixed(5)).join(' | ') || 'N/A'}
  Supports:    ${technical.keyLevels.support.map((s: number) => s.toFixed(5)).join(' | ') || 'N/A'}

━━━ RAISONS ━━━
${techSignal.reasons.map((r: string) => `  • ${r}`).join('\n')}
`;

  return result;
}

function formatMultiTimeframe(d1: any, h1: any, entry: any): string {
  const aligned = d1.signals.trend === h1.signals.trend && h1.signals.trend === entry.signals.trend;
  const direction = aligned ? d1.signals.trend : 'MIXED';

  return `
╔═══════════════════════════════════════════╗
║  📐 ANALYSE MULTI-TIMEFRAME: ${d1.pair}
╚═══════════════════════════════════════════╝

📅 D1 (Tendance de fond):
  Trend: ${d1.signals.trend} | RSI: ${d1.indicators.rsi.toFixed(1)}
  Signal: ${d1.signals.entry} | Confiance: ${d1.signals.confidence}%

⏰ H1 (Contexte intermédiaire):
  Trend: ${h1.signals.trend} | RSI: ${h1.indicators.rsi.toFixed(1)}
  Signal: ${h1.signals.entry} | Confiance: ${h1.signals.confidence}%

⚡ ${entry.timeframe} (Entrée scalping):
  Trend: ${entry.signals.trend} | RSI: ${entry.indicators.rsi.toFixed(1)}
  Signal: ${entry.signals.entry} | Confiance: ${entry.signals.confidence}%

━━━ ALIGNEMENT ━━━
  ${aligned ? '✅ TIMEFRAMES ALIGNÉS → ' + direction : '❌ TIMEFRAMES NON ALIGNÉS → PRUDENCE'}
  ${aligned ? 'Feu vert pour chercher une entrée en ' + entry.timeframe : 'Attendre l\'alignement ou trader avec un lot réduit'}

━━━ CONSEIL SCALPING ━━━
  ${aligned && direction === 'BULLISH' ? '→ Chercher des BUY sur pullback vers EMA20/support en ' + entry.timeframe : ''}
  ${aligned && direction === 'BEARISH' ? '→ Chercher des SELL sur rejection de résistance/EMA20 en ' + entry.timeframe : ''}
  ${!aligned ? '→ Pas de setup clair. Patience.' : ''}
`;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Trading Analysis MCP Server running');
}

main().catch(console.error);
