import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fioGet, fioPost } from '../client.js';

// Only include materials with any market activity; use compact keys to minimize size.
// Supply/demand available via fio_get_exchange for individual tickers.
function compactExchangeSummary(entry: any): any | null {
  if (entry.Price == null && entry.Ask == null && entry.Bid == null) return null;
  const compact: any = { t: `${entry.MaterialTicker}.${entry.ExchangeCode}` };
  if (entry.Price != null) compact.p = entry.Price;
  if (entry.Ask != null) compact.a = entry.Ask;
  if (entry.Bid != null) compact.b = entry.Bid;
  return compact;
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerMarketTools(server: McpServer): void {
  server.registerTool(
    'fio_get_exchange',
    {
      description:
        "Get commodity exchange data for a specific ticker (e.g. 'CU.NC1' for copper on NC1 exchange). Returns current price, ask/bid, volume, and recent trades.",
      inputSchema: {
        ticker: z.string().describe("Exchange ticker in format MATERIAL.EXCHANGE, e.g. 'CU.NC1', 'FE.CI1'"),
      },
      annotations: readOnly,
    },
    async ({ ticker }) => {
      const data = await fioGet(`/exchange/${encodeURIComponent(ticker)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_all_exchanges',
    {
      description:
        'Get summarized data for all commodity exchanges. Returns current prices and volumes across all traded materials.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/exchange/all');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_exchange_full',
    {
      description:
        'Get price snapshot for all active materials across all exchanges. Each entry: t=MATERIAL.EXCHANGE, p=price, a=ask, b=bid. Use fio_get_exchange for a specific ticker to get supply/demand and order book.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/exchange/full');
      const compact = (data as any[]).map(compactExchangeSummary).filter(Boolean);
      return { content: [{ type: 'text', text: JSON.stringify(compact) }] };
    },
  );

  server.registerTool(
    'fio_get_price_history',
    {
      description: 'Get historical daily price data for a commodity exchange ticker. Useful for spotting trends.',
      inputSchema: {
        ticker: z.string().describe("Exchange ticker, e.g. 'CU.NC1'"),
        days: z.number().optional().describe('Number of most recent days to return (default 90)'),
      },
      annotations: readOnly,
    },
    async ({ ticker, days }) => {
      const data = await fioGet(`/exchange/cxpc/${encodeURIComponent(ticker)}`);
      const limit = days ?? 90;
      const trimmed = (data as any[]).slice(-limit);
      const compact = trimmed.map((d: any) => ({
        date: new Date(d.DateEpochMs).toISOString().slice(0, 10),
        open: Math.round(d.Open * 100) / 100,
        close: Math.round(d.Close * 100) / 100,
        high: Math.round(d.High * 100) / 100,
        low: Math.round(d.Low * 100) / 100,
        volume: Math.round(d.Volume * 100) / 100,
        traded: d.Traded,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(compact) }] };
    },
  );

  server.registerTool(
    'fio_get_exchange_orders',
    {
      description: 'Get all open exchange orders for a company on all exchanges, or on a specific exchange.',
      inputSchema: {
        companyCode: z.string().describe("The company code, e.g. 'ACME'"),
        exchangeCode: z.string().optional().describe("Optional exchange code to filter, e.g. 'NC1'"),
      },
      annotations: readOnly,
    },
    async ({ companyCode, exchangeCode }) => {
      const path = exchangeCode
        ? `/exchange/orders/${encodeURIComponent(companyCode)}/${encodeURIComponent(exchangeCode)}`
        : `/exchange/orders/${encodeURIComponent(companyCode)}`;
      const data = await fioGet(path);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_local_market',
    {
      description: 'Get local market ads for a planet. Optionally filter by type (BUY, SELL, or SHIP).',
      inputSchema: {
        planet: z.string().describe("Planet identifier or name, e.g. 'Montem' or 'UV-351a'"),
        type: z.enum(['BUY', 'SELL', 'SHIP']).optional().describe('Ad type filter: BUY, SELL, or SHIP'),
      },
      annotations: readOnly,
    },
    async ({ planet, type }) => {
      const path = type
        ? `/localmarket/planet/${encodeURIComponent(planet)}/${type}`
        : `/localmarket/planet/${encodeURIComponent(planet)}`;
      const data = await fioGet(path);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_search_local_market',
    {
      description: 'Search local markets across all planets for a specific material.',
      inputSchema: {
        materialTicker: z.string().describe("Material ticker, e.g. 'CU', 'FE', 'H2O'"),
        category: z.string().optional().describe('Ad category: BUY or SELL'),
      },
      annotations: readOnly,
    },
    async ({ materialTicker, category }) => {
      const data = await fioPost('/localmarket/search', { MaterialTicker: materialTicker, Category: category });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_company_local_market',
    {
      description: 'Get all local market ads posted by a specific company.',
      inputSchema: { company: z.string().describe('Company code or name') },
      annotations: readOnly,
    },
    async ({ company }) => {
      const data = await fioGet(`/localmarket/company/${encodeURIComponent(company)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
