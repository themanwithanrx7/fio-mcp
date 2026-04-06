import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fioGet, FIO_USERNAME } from '../client.js';

function compactProduction(raw: any[]): any[] {
  return raw.map((line: any) => ({
    planet: line.PlanetNaturalId ?? line.PlanetName,
    type: line.Type,
    capacity: line.Capacity,
    efficiency: Math.round(line.Efficiency * 1000) / 1000,
    condition: Math.round(line.Condition * 1000) / 1000,
    orders: (line.Orders ?? []).map((order: any) => {
      const compact: any = {
        recipe: order.StandardRecipeName,
        inputs: (order.Inputs ?? []).map((i: any) => ({ ticker: i.MaterialTicker, amount: i.MaterialAmount })),
        outputs: (order.Outputs ?? []).map((o: any) => ({ ticker: o.MaterialTicker, amount: o.MaterialAmount })),
        durationHrs: Math.round(order.DurationMs / 36000) / 100,
        recurring: order.Recurring,
        halted: order.IsHalted,
      };
      if (order.StartedEpochMs != null) compact.started = new Date(order.StartedEpochMs).toISOString();
      if (order.CompletionEpochMs != null) compact.completion = new Date(order.CompletionEpochMs).toISOString();
      if (order.CompletedPercentage != null) compact.progress = Math.round(order.CompletedPercentage * 1000) / 1000;
      if (order.ProductionFee != null) {
        compact.fee = { amount: Math.round(order.ProductionFee * 100) / 100, currency: order.ProductionFeeCurrency };
        if (order.ProductionFeeCollectorName) compact.fee.collector = order.ProductionFeeCollectorName;
      }
      return compact;
    }),
  }));
}

function compactBuilding(b: any): any {
  const workforce: any = {};
  if (b.Pioneers) workforce.pioneers = b.Pioneers;
  if (b.Settlers) workforce.settlers = b.Settlers;
  if (b.Technicians) workforce.technicians = b.Technicians;
  if (b.Engineers) workforce.engineers = b.Engineers;
  if (b.Scientists) workforce.scientists = b.Scientists;
  return {
    ticker: b.Ticker,
    name: b.Name,
    expertise: b.Expertise,
    area: b.AreaCost,
    workforce,
    costs: (b.BuildingCosts ?? []).map((c: any) => ({ ticker: c.CommodityTicker, amount: c.Amount })),
    recipes: (b.Recipes ?? []).map((r: any) => ({
      recipe: r.StandardRecipeName,
      durationHrs: Math.round(r.DurationMs / 36000) / 100,
    })),
  };
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerProductionTools(server: McpServer): void {
  server.registerTool(
    'fio_get_all_buildings',
    {
      description: 'Get a list of all buildings in the game with their details (costs, workforce requirements, area).',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/building/allbuildings');
      return { content: [{ type: 'text', text: JSON.stringify((data as any[]).map(compactBuilding)) }] };
    },
  );

  server.registerTool(
    'fio_get_building',
    {
      description: "Get details for a specific building by its ticker (e.g. 'FRM' for Farm, 'SME' for Smelter).",
      inputSchema: { ticker: z.string().describe("Building ticker, e.g. 'FRM', 'SME', 'PP1'") },
      annotations: readOnly,
    },
    async ({ ticker }) => {
      const data = await fioGet(`/building/${encodeURIComponent(ticker)}`);
      return { content: [{ type: 'text', text: JSON.stringify(compactBuilding(data)) }] };
    },
  );

  server.registerTool(
    'fio_get_all_materials',
    {
      description: 'Get a list of all materials in the game with their tickers, names, categories, and weights.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/material/allmaterials');
      const compact = (data as any[]).map((m: any) => ({
        ticker: m.Ticker,
        name: m.Name,
        category: m.CategoryName,
        weight: m.Weight,
        volume: m.Volume,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(compact) }] };
    },
  );

  server.registerTool(
    'fio_get_material',
    {
      description: "Get details for a specific material by its ticker (e.g. 'CU' for Copper, 'FE' for Iron).",
      inputSchema: { ticker: z.string().describe("Material ticker, e.g. 'CU', 'FE', 'H2O', 'RAT'") },
      annotations: readOnly,
    },
    async ({ ticker }) => {
      const data = await fioGet(`/material/${encodeURIComponent(ticker)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_materials_by_category',
    {
      description: "Get all materials in a specific category (e.g. 'metals', 'chemicals', 'agricultural products').",
      inputSchema: {
        category: z.string().describe("Material category name, e.g. 'metals', 'chemicals', 'construction materials'"),
      },
      annotations: readOnly,
    },
    async ({ category }) => {
      const data = await fioGet(`/material/category/${encodeURIComponent(category)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_all_recipes',
    {
      description: 'Get all production recipes in the game, including inputs, outputs, building, and duration.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/recipes/allrecipes');
      const compact = (data as any[]).map((r: any) => ({
        building: r.BuildingTicker,
        recipe: r.StandardRecipeName,
        inputs: r.Inputs,
        outputs: r.Outputs,
        durationHrs: Math.round(r.TimeMs / 36000) / 100,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(compact) }] };
    },
  );

  server.registerTool(
    'fio_get_workforce_needs',
    {
      description:
        'Get workforce needs and consumption rates for all workforce tiers (pioneers, settlers, technicians, engineers, scientists).',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/global/workforceneeds');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_production',
    {
      description: 'Get production lines for a user across all their planets.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/production/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify(compactProduction(data as any[])) }] };
    },
  );

  server.registerTool(
    'fio_get_production_on_planet',
    {
      description: 'Get production lines for a user on a specific planet.',
      inputSchema: {
        planet: z.string().describe('Planet identifier or name'),
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ planet, userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/production/${encodeURIComponent(user)}/${encodeURIComponent(planet)}`);
      return { content: [{ type: 'text', text: JSON.stringify(compactProduction(data as any[])) }] };
    },
  );
}
