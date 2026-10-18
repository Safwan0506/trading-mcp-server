# Trading Analysis MCP Server

**A Model Context Protocol (MCP) server that gives Claude real-time forex trading analysis capabilities -- technical indicators, economic calendar, and combined verdicts with actionable trade plans.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.0-blueviolet)](https://modelcontextprotocol.io/)
[![Alpha Vantage](https://img.shields.io/badge/Alpha_Vantage-API-orange)](https://www.alphavantage.co/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that allows AI assistants like Claude to connect to external tools and data sources. An MCP server exposes callable tools that the AI can invoke on demand, enabling it to go beyond its training data and interact with live systems. This server turns Claude into a forex analysis assistant with access to real-time market data and economic news.

---

## Features

- **Technical Analysis** -- EMA (20/50/200), RSI, MACD, Bollinger Bands, ATR, Stochastic oscillator with automated signal generation
- **Fundamental Analysis** -- Live economic calendar scraped from Forex Factory with impact classification (High / Medium / Low)
- **Combined Verdicts** -- Confluence scoring that merges technical and fundamental biases into a single BUY / SELL / WAIT recommendation
- **Trade Plans** -- Suggested entry, stop loss, and take profit levels calculated from ATR with risk-reward ratios
- **Multi-Timeframe Analysis** -- Top-down confirmation across D1, H1, and your chosen entry timeframe
- **10 Major Forex Pairs** -- EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, EUR/GBP, EUR/JPY, GBP/JPY
- **7 Timeframes** -- M1, M5, M15, M30, H1, H4, D1

---

## Available Tools

| Tool | Description |
|---|---|
| `analyze_pair` | Full technical analysis for a forex pair -- computes EMA, RSI, MACD, Bollinger Bands, Stochastic, and ATR. Returns a BUY/SELL/WAIT signal with confidence score, key support/resistance levels, and detailed reasoning. |
| `forex_calendar` | Fetches the current week's economic calendar from Forex Factory. Displays high and medium impact events with time, currency, forecast, and actual values. Optionally filter by currency. |
| `full_analysis` | Combines technical analysis with fundamental data to produce a final verdict. Outputs a confluence score, suggested entry/SL/TP levels, and risk-reward ratios. |
| `multi_timeframe` | Top-down analysis across D1 > H1 > entry timeframe. Checks whether all timeframes are aligned to confirm or deny a trade setup. Ideal for scalping confirmation. |
| `available_pairs` | Lists all supported forex pairs. |

---

## Technical Indicators

| Indicator | Configuration | Usage |
|---|---|---|
| EMA | Periods 20, 50, 200 | Trend direction and strength |
| RSI | Period 14 | Overbought / Oversold detection |
| MACD | 12 / 26 / 9 | Momentum and crossover signals |
| Bollinger Bands | Period 20, StdDev 2 | Volatility and mean reversion |
| ATR | Period 14 | Volatility measurement, SL/TP sizing |
| Stochastic | Period 14, Signal 3 | Overbought / Oversold confirmation |

---

## Tech Stack

- **Runtime** -- Node.js with ES2022 target
- **Language** -- TypeScript 5.4 (strict mode)
- **MCP Framework** -- `@modelcontextprotocol/sdk` 1.0
- **Technical Indicators** -- `technicalindicators` 3.1
- **Market Data** -- Alpha Vantage REST API via `node-fetch` 3.3
- **Web Scraping** -- `cheerio` 1.0 (Forex Factory calendar)

---

## Getting Started

### Prerequisites

- Node.js 18+
- An Alpha Vantage API key (free tier: 25 requests/day) -- get one at [alphavantage.co](https://www.alphavantage.co/support/#api-key)

### Installation

```bash
git clone https://github.com/safwan-djazouli/trading-mcp-server.git
cd trading-mcp-server
npm install
npm run build
```

### Configure in Claude Desktop

Add the following to your Claude Desktop MCP configuration file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "trading-analysis": {
      "command": "node",
      "args": ["C:/Users/Administrateur/trading-mcp-server/dist/index.js"],
      "env": {
        "ALPHA_VANTAGE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

> Replace `YOUR_API_KEY_HERE` with your actual Alpha Vantage API key and adjust the path to match your installation directory.

### Configure in Claude Code

Add the server to your `.mcp.json` file:

```json
{
  "mcpServers": {
    "trading-analysis": {
      "command": "node",
      "args": ["C:/Users/Administrateur/trading-mcp-server/dist/index.js"],
      "env": {
        "ALPHA_VANTAGE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

Restart Claude Code after saving the configuration.

---

## Usage Examples

Once the server is connected, you can ask Claude:

```
Analyze EUR/USD on the M15 timeframe
```

```
Show me the economic calendar for this week, filtered by USD
```

```
Give me a full analysis of GBP/USD on M5 with a trade plan
```

```
Run a multi-timeframe analysis on EUR/USD with M5 entry
```

---

## API Rate Limits

| Plan | Requests/Day | Requests/Minute |
|---|---|---|
| Free | 25 | 5 |
| Premium ($49.99/mo) | Unlimited | Unlimited |

For heavier usage, consider migrating to [Twelve Data](https://twelvedata.com/) (800 requests/day on the free tier) by modifying `src/market-data.ts`.

---

## Project Structure

```
trading-mcp-server/
  src/
    index.ts           # MCP server setup, tool definitions, and response formatting
    indicators.ts      # Technical indicator calculations and signal generation
    market-data.ts     # Alpha Vantage API client and candle data fetching
    forex-factory.ts   # Forex Factory scraper and fundamental analysis
  dist/                # Compiled JavaScript output
  package.json
  tsconfig.json
```

---

## Author

**Safwan Djazouli**

---

## License

This project is licensed under the MIT License.
