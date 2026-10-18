# Trading Analysis MCP Server - Setup

## 1. Obtenir une clé API Alpha Vantage (gratuit)

1. Allez sur https://www.alphavantage.co/support/#api-key
2. Remplissez le formulaire (email + nom)
3. Copiez votre clé API

## 2. Configurer la clé API

Editez le fichier `C:\Users\Administrateur\.mcp.json` et remplacez `YOUR_API_KEY_HERE` par votre vraie clé.

## 3. Redemarrer Claude Code

Fermez et relancez Claude Code pour que le serveur MCP soit detecte.

## 4. Utilisation

Une fois connecte, vous pouvez demander a Claude :

- "Analyse EUR/USD en M15"
- "Montre-moi le calendrier eco de la semaine"
- "Fais une analyse complete GBP/USD en M5"
- "Analyse multi-timeframe EUR/USD avec entree en M5"

## Outils disponibles

| Outil | Description |
|-------|-------------|
| `analyze_pair` | Analyse technique pure (EMA, RSI, MACD, BB, Stoch) |
| `forex_calendar` | Calendrier Forex Factory (news high/medium impact) |
| `full_analysis` | Technique + Fondamental + Verdict + Plan de trade |
| `multi_timeframe` | Analyse top-down D1 > H1 > TF d'entree |
| `available_pairs` | Liste des paires supportees |

## Paires supportees

EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, EUR/GBP, EUR/JPY, GBP/JPY

## Limites API gratuite Alpha Vantage

- 25 requetes par jour (gratuit)
- 5 requetes par minute
- Pour un usage intensif, la cle premium est a $49.99/mois (illimite)

## Alternative : Twelve Data (plus de requetes gratuites)

Si 25 requetes/jour ne suffisent pas, Twelve Data offre 800 requetes/jour en gratuit.
Pour migrer, modifiez `src/market-data.ts` pour utiliser l'API Twelve Data.
