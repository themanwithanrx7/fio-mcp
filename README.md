# fio-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [FIO](https://fnar.net) community API, giving LLMs access to game data from [Prosperous Universe](https://prosperousuniverse.com).

## Prerequisites

- Node.js >= 18
- A FIO API key (get one at <https://fio.fnar.net/settings/api>)
- Your Prosperous Universe username

## Quick Start

### npx (no install)

```json
{
  "mcpServers": {
    "fio": {
      "command": "npx",
      "args": ["-y", "fio-mcp"],
      "env": {
        "FIO_API_KEY": "your_api_key",
        "FIO_USERNAME": "YourIngameName"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "fio": {
      "command": "npx",
      "args": ["-y", "fio-mcp"],
      "env": {
        "FIO_API_KEY": "your_api_key",
        "FIO_USERNAME": "YourIngameName"
      }
    }
  }
}
```

### From source

```bash
git clone https://github.com/themanwithanrx7/fio-mcp.git
cd fio-mcp
pnpm install
pnpm build
```

Then point your MCP client at the built output:

```json
{
  "mcpServers": {
    "fio": {
      "command": "node",
      "args": ["/path/to/fio-mcp/dist/index.js"],
      "env": {
        "FIO_API_KEY": "your_api_key",
        "FIO_USERNAME": "YourIngameName"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIO_API_KEY` | Yes | FIO API key or AuthToken |
| `FIO_USERNAME` | No | Prosperous Universe username (used as default for user-specific tools) |

## Available Tools

### Market & Exchange

| Tool | Description |
|------|-------------|
| `fio_get_exchange` | Commodity exchange data for a ticker (e.g. `CU.NC1`) |
| `fio_get_all_exchanges` | Summary of all commodity exchanges |
| `fio_get_exchange_full` | Price snapshot for all active materials across all exchanges |
| `fio_get_price_history` | Historical daily price data for a ticker |
| `fio_get_exchange_orders` | Open exchange orders for a company |
| `fio_get_exchange_trades` | Exchange trade history for a user |
| `fio_get_exchange_trades_csv` | Exchange trade history as CSV |
| `fio_get_local_market` | Local market ads for a planet |
| `fio_search_local_market` | Search local markets for a material |
| `fio_get_company_local_market` | Local market ads by company |

### Planets & Navigation

| Tool | Description |
|------|-------------|
| `fio_get_all_planets` | List all planets (minimal data) |
| `fio_get_planet` | Full planet details |
| `fio_search_planets` | Search planets by criteria |
| `fio_get_planet_sites` | Player-built sites on a planet |
| `fio_get_all_systems` | All star systems |
| `fio_get_system` | Star system details |
| `fio_get_infrastructure` | Planet infrastructure details |
| `fio_get_jump_count` | Jump count between two systems |
| `fio_get_jump_route` | Full jump route between two systems |

### Production & Materials

| Tool | Description |
|------|-------------|
| `fio_get_all_buildings` | All buildings with costs and workforce |
| `fio_get_building` | Building details by ticker |
| `fio_get_all_materials` | All materials with categories and weights |
| `fio_get_material` | Material details by ticker |
| `fio_get_materials_by_category` | Materials in a category |
| `fio_get_all_recipes` | All production recipes |
| `fio_get_workforce_needs` | Workforce consumption rates by tier |
| `fio_get_production` | User's production lines (all planets) |
| `fio_get_production_on_planet` | User's production lines on a planet |

### Account & Logistics

| Tool | Description |
|------|-------------|
| `fio_get_storage` | User's storage across all bases |
| `fio_get_storage_on_planet` | User's storage on a planet |
| `fio_get_ships` | User's ships |
| `fio_get_ship_flights` | Ship flight data (location, destination, ETA) |
| `fio_get_ship_fuel` | Ship fuel stores |
| `fio_get_sites` | All base sites in the game |
| `fio_get_workforce` | User's workforce across all bases |
| `fio_get_workforce_on_planet` | User's workforce on a planet |
| `fio_get_contracts` | User's contracts (filterable by status/days/limit) |
| `fio_get_contract_concerns` | Contracts needing attention |
| `fio_get_contract_shipments` | Shipment location tracking |
| `fio_get_burn_rate` | Consumable supply burn rate per base |
| `fio_get_user` | User public profile |

User-specific tools accept an optional `userName` parameter and default to `FIO_USERNAME`.

## Development

```bash
pnpm install
pnpm dev          # Run with tsx (no build needed)
pnpm build        # Compile TypeScript
pnpm test         # Run tests
pnpm lint         # Lint with oxlint
pnpm fmt          # Format with oxfmt
pnpm fmt:check    # Check formatting
pnpm check        # fmt:check + lint + build
```

## License

MIT
