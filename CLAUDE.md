# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build   # Compile TypeScript → dist/
npm run dev     # Run directly with tsx (no build needed, for development)
npm start       # Run compiled output from dist/index.js
npm test        # Run unit tests with vitest
```

## Environment Variables

Required at runtime:

```
FIO_API_KEY=<FIO API key or AuthToken>
FIO_USERNAME=<Prosperous Universe username>
```

See `.env.example` for details on obtaining these.

## Architecture

This is a TypeScript MCP server that wraps the FIO community API (`https://rest.fnar.net`) for the game Prosperous Universe. It exposes game data as MCP tools that LLMs can call.

**Entry point:** `src/index.ts` — creates an `McpServer`, calls each domain's `register*Tools(server)` function, then connects via `StdioServerTransport`.

**HTTP client:** `src/client.ts` — exports `fioGet(path)` and `fioPost(path, body)`. Reads `FIO_API_KEY` from env at startup (throws if missing). All requests hit `https://rest.fnar.net` with `Authorization: <key>` header.

**Tool modules** (`src/tools/`):
- `market.ts` — exchange prices, order books, price history, local market ads
- `production.ts` — buildings, materials, recipes, workforce needs, production lines
- `planets.ts` — planet details, planet search, star systems, infrastructure
- `account.ts` — storage, ships, sites, workforce, contracts, exchange trades (all default to `FIO_USERNAME`). Contracts and exchange trade tools support optional `status`, `days`, and `limit` filters.

User-specific tools (storage, workforce, contracts, production) accept an optional `userName` parameter and fall back to the `FIO_USERNAME` env var when omitted.

## FIO API Reference

Base URL: `https://rest.fnar.net` — Full docs at https://doc.fnar.net/#/ (Swagger spec: https://doc.fnar.net/api.json)

### Endpoints already implemented

| Category | Endpoint | Tool |
|----------|----------|------|
| exchange | `GET /exchange/{ExchangeTicker}` | `fio_get_exchange` |
| exchange | `GET /exchange/all` | `fio_get_all_exchanges` |
| exchange | `GET /exchange/full` | `fio_get_exchange_full` |
| exchange | `GET /exchange/cxpc/{ExchangeTicker}` | `fio_get_price_history` |
| exchange | `GET /exchange/orders/{CompanyCode}` | `fio_get_exchange_orders` |
| exchange | `GET /exchange/orders/{CompanyCode}/{ExchangeCode}` | `fio_get_exchange_trades` |
| localmarket | `GET /localmarket/planet/{Planet}` | `fio_get_local_market` |
| localmarket | `GET /localmarket/company/{Company}` | `fio_get_company_local_market` |
| localmarket | `POST /localmarket/search` | `fio_search_local_market` |
| building | `GET /building/allbuildings` | `fio_get_all_buildings` |
| building | `GET /building/{BuildingTicker}` | `fio_get_building` |
| material | `GET /material/allmaterials` | `fio_get_all_materials` |
| material | `GET /material/{MaterialTicker}` | `fio_get_material` |
| material | `GET /material/category/{CategoryName}` | `fio_get_materials_by_category` |
| recipes | `GET /recipes/allrecipes` | `fio_get_all_recipes` |
| global | `GET /global/workforceneeds` | `fio_get_workforce_needs` |
| production | `GET /production/{UserName}` | `fio_get_production` |
| production | `GET /production/{UserName}/{Planet}` | `fio_get_production_on_planet` |
| planet | `GET /planet/allplanets` | `fio_get_all_planets` |
| planet | `GET /planet/{Planet}` | `fio_get_planet` |
| planet | `POST /planet/search` | `fio_search_planets` |
| planet | `GET /planet/sites/{Planet}` | `fio_get_planet_sites` |
| systemstars | `GET /systemstars/all` | `fio_get_all_systems` |
| systemstars | `GET /systemstars/{SystemId}` | `fio_get_system` |
| infrastructure | `GET /infrastructure/{Planet}` | `fio_get_infrastructure` |
| storage | `GET /storage/{UserName}` | `fio_get_storage` |
| storage | `GET /storage/{UserName}/{Planet}` | `fio_get_storage_on_planet` |
| ship | `GET /ship/ships/{UserName}` | `fio_get_ships` |
| sites | `GET /sites/all` | `fio_get_sites` |
| workforce | `GET /workforce/{UserName}` | `fio_get_workforce` |
| workforce | `GET /workforce/{UserName}/{Planet}` | `fio_get_workforce_on_planet` |
| contract | `GET /contract/allcontracts/{UserName}` | `fio_get_contracts` |
| contract | `GET /contract/concerns/{UserName}` | `fio_get_contract_concerns` |
| user | `GET /user/{UserName}` | `fio_get_user` |
| cxos | `GET /cxos/{UserName}` | `fio_get_exchange_trades` |

### Endpoints NOT yet implemented (candidates for new tools)

**Ship & Navigation (high priority — needed for logistics/routing):**
- `GET /ship/flights/{UserName}` — ship flight data (current location, destination, ETA)
- `GET /ship/ships/fuel/{UserName}` — ship fuel store data
- `GET /systemstars/jumpcount/{Source}/{Destination}` — jump count between two systems
- `GET /systemstars/jumproute/{Source}/{Destination}` — full jump route between two systems
- `GET /systemstars/star/{Star}` — individual star system data
- `GET /systemstars/worldsectors` — world sector data

**Sites & Storage:**
- `GET /sites/{UserName}` — user site data (auth-scoped, unlike `/sites/all`)
- `GET /sites/{UserName}/{Planet}` — site data for a specific planet
- `GET /sites/planets/{UserName}` — list of planets with sites
- `GET /sites/warehouses/{UserName}` — all warehouse sites
- `GET /storage/planets/{UserName}` — list of planets with storage

**Company & Social:**
- `GET /company/code/{CompanyCode}` — company lookup by code
- `GET /company/name/{CompanyName}` — company lookup by name
- `GET /user/allusers` — all FIO users

**Contracts:**
- `GET /contract/allcontracts` — current user's contracts (no username needed)
- `GET /contract/loans/{UserName}` — loan contracts
- `GET /contract/shipments` — shipment location tracking

**Exchange:**
- `GET /exchange/station` — exchange station data
- `GET /exchange/cxpc/{Ticker}/{TimeStamp}` — historical price chart from timestamp

**Local Market:**
- `GET /localmarket/{LocalMarketId}` — market by ID
- `GET /localmarket/planet/{Planet}/{Type}` — filtered by ad type
- `GET /localmarket/shipping/source/{SourcePlanet}` — shipping ads from planet
- `GET /localmarket/shipping/destination/{DestinationPlanet}` — shipping ads to planet

**Planet:**
- `GET /planet/allplanets/full` — complete planet data (heavier than minimal)
- `GET /planet/sitescount/{Planet}` — count of sites on a planet

**Production:**
- `GET /production/planets/{UserName}` — list planets with production lines

**Rain (normalized/spreadsheet data):**
- `GET /rain/userliquid/{UserName}` — liquid assets
- `GET /rain/userplanets/{UserName}` — user's planets
- `GET /rain/userplanetbuildings/{UserName}` — user's buildings
- `GET /rain/userplanetproduction/{UserName}` — production overview
- `GET /rain/userstorage/{UserName}` — storage data (normalized)

**Burn Rate Settings:**
- `GET /usersettings/burnrate/{UserName}` — burn rate settings
- `GET /usersettings/burnrate/{UserName}/{PlanetNaturalId}` — per-planet burn rate

**CSV Export:**
- `GET /csv/burnrate` — user burn rate as CSV
- `GET /csv/inventory` — user inventory as CSV
- `GET /csv/sites` — user sites as CSV
- Various other CSV endpoints for bulk data export

**Recipes:**
- `GET /recipes/{Ticker}` — recipes for a specific building ticker

## Adding to Claude Code

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "fio": {
      "command": "node",
      "args": ["/home/mrrx7/fio-mcp/dist/index.js"],
      "env": {
        "FIO_API_KEY": "your_key_here",
        "FIO_USERNAME": "YourIngameName"
      }
    }
  }
}
```
