import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fioGet, fioGetCsv, FIO_USERNAME } from '../client.js';
import { filterContracts, filterExchangeTrades, filterTradesCsv } from '../filters.js';

function compactStore(store: any): any {
  return {
    name: store.Name,
    type: store.Type,
    weightLoad: Math.round((store.WeightLoad ?? 0) * 100) / 100,
    weightCap: store.WeightCapacity,
    volLoad: Math.round((store.VolumeLoad ?? 0) * 100) / 100,
    volCap: store.VolumeCapacity,
    items: (store.StorageItems ?? []).map((i: any) => {
      const item: any = { ticker: i.MaterialTicker, amount: i.MaterialAmount };
      if (i.MaterialValue) item.value = i.MaterialValue;
      if (i.TotalWeight) item.weight = Math.round(i.TotalWeight * 100) / 100;
      if (i.TotalVolume) item.vol = Math.round(i.TotalVolume * 100) / 100;
      return item;
    }),
  };
}

function compactWorkforcePlanet(p: any): any {
  return {
    planet: p.PlanetNaturalId ?? p.PlanetName,
    workforces: (p.Workforces ?? []).map((wf: any) => ({
      type: wf.WorkforceTypeName,
      population: wf.Population,
      capacity: wf.Capacity,
      required: wf.Required,
      satisfaction: wf.Satisfaction,
      needs: (wf.WorkforceNeeds ?? []).map((n: any) => {
        const need: any = {
          ticker: n.MaterialTicker,
          category: n.Category,
          essential: n.Essential,
          per100: n.UnitsPerOneHundred,
          satisfaction: n.Satisfaction,
        };
        return need;
      }),
    })),
  };
}

function stripNulls(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && v !== undefined) {
        const stripped = stripNulls(v);
        if (!Array.isArray(stripped) || stripped.length > 0) result[k] = stripped;
      }
    }
    return result;
  }
  return obj;
}

function compactContracts(raw: any[]): any[] {
  return raw.map((c: any) => {
    const compact: any = {
      id: c.ContractLocalId,
      status: c.Status,
      party: c.Party,
      partner: c.PartnerCompanyCode || c.PartnerName,
      date: new Date(c.DateEpochMs).toISOString(),
      conditions: (c.Conditions ?? []).map((cond: any) => {
        const s = stripNulls(cond);
        delete s.MaterialId;
        delete s.BlockId;
        delete s.ConditionId;
        delete s.Dependencies;
        if (s.Weight === 0) delete s.Weight;
        if (s.Volume === 0) delete s.Volume;
        return s;
      }),
    };
    if (c.Name) compact.name = c.Name;
    if (c.DueDateEpochMs) compact.dueDate = new Date(c.DueDateEpochMs).toISOString();
    if (c.CanExtend) compact.canExtend = true;
    if (c.CanRequestTermination) compact.canTerminate = true;
    if (c.TerminationSent) compact.terminationSent = true;
    if (c.TerminationReceived) compact.terminationReceived = true;
    return compact;
  });
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerAccountTools(server: McpServer): void {
  server.registerTool(
    'fio_get_storage',
    {
      description: 'Get all storage contents for a user across all their warehouses and bases.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/storage/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify((data as any[]).map(compactStore)) }] };
    },
  );

  server.registerTool(
    'fio_get_storage_on_planet',
    {
      description: 'Get storage contents for a user on a specific planet.',
      inputSchema: {
        planet: z.string().describe('Planet name or natural ID'),
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ planet, userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/storage/${encodeURIComponent(user)}/${encodeURIComponent(planet)}`);
      return { content: [{ type: 'text', text: JSON.stringify(compactStore(data)) }] };
    },
  );

  server.registerTool(
    'fio_get_ships',
    {
      description:
        "Get ships for a user. Returns ship details including condition, thrust, and repair materials. Use fio_get_storage to see each ship's cargo, STL fuel, and FTL fuel stores separately.",
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/ship/ships/${encodeURIComponent(user)}`);
      const compact = (data as any[]).map((s: any) => ({
        name: s.Name,
        registration: s.Registration,
        condition: Math.round((s.Condition ?? 0) * 1000) / 10,
        thrust: s.Thrust,
        mass: Math.round(s.OperatingEmptyMass),
        reactorPower: s.ReactorPower,
        emitterPower: s.EmitterPower,
        location: s.Location || null,
        flightId: s.FlightId || null,
        repairMaterials: (s.RepairMaterials ?? []).map((r: any) => ({
          ticker: r.MaterialTicker,
          amount: r.Amount,
        })),
      }));
      return { content: [{ type: 'text', text: JSON.stringify(compact) }] };
    },
  );

  server.registerTool(
    'fio_get_sites',
    {
      description: 'Get all base sites in the game. Returns site details including owner, planet, and buildings.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/sites/all');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_workforce',
    {
      description: 'Get workforce allocation for a user across all their bases.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/workforce/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify((data as any[]).map(compactWorkforcePlanet)) }] };
    },
  );

  server.registerTool(
    'fio_get_workforce_on_planet',
    {
      description: 'Get workforce allocation for a user on a specific planet.',
      inputSchema: {
        planet: z.string().describe('Planet name or natural ID'),
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ planet, userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/workforce/${encodeURIComponent(user)}/${encodeURIComponent(planet)}`);
      return { content: [{ type: 'text', text: JSON.stringify(compactWorkforcePlanet(data)) }] };
    },
  );

  server.registerTool(
    'fio_get_contracts',
    {
      description:
        'Get contracts for a user. Supports optional filtering by status, recency, and count limit to keep responses manageable.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
        status: z.string().optional().describe("Filter by contract status, e.g. 'CLOSED', 'FULFILLED', 'PENDING'"),
        days: z.number().optional().describe('Only return contracts created within the last N days'),
        limit: z.number().optional().describe('Maximum number of contracts to return (applied after other filters)'),
      },
      annotations: readOnly,
    },
    async ({ userName, status, days, limit }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/contract/allcontracts/${encodeURIComponent(user)}`);
      const filtered = filterContracts(data as any[], { status, days, limit });
      return { content: [{ type: 'text', text: JSON.stringify(compactContracts(filtered)) }] };
    },
  );

  server.registerTool(
    'fio_get_contract_concerns',
    {
      description: 'Get contracts that need attention (e.g. deadlines approaching, unfulfilled conditions) for a user.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/contract/concerns/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_user',
    {
      description: 'Get public profile information for a user.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/user/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_exchange_trades_csv',
    {
      description:
        'Get full commodity exchange trade history for a user as CSV. Supports filtering by status, recency, and row limit.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
        status: z.string().optional().describe("Filter by order status column, e.g. 'FILLED'"),
        days: z.number().optional().describe('Only return rows from the last N days'),
        limit: z.number().optional().describe('Maximum number of data rows to return'),
      },
      annotations: readOnly,
    },
    async ({ userName, status, days, limit }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGetCsv(`/csv/cxos?username=${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: filterTradesCsv(data, { status, days, limit }) }] };
    },
  );

  server.registerTool(
    'fio_get_exchange_trades',
    {
      description:
        'Get commodity exchange trade history for a user. Returns buy/sell orders on exchanges. Supports filtering by status, recency, and count limit.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
        status: z.string().optional().describe("Filter by order status, e.g. 'FILLED', 'PLACED', 'PARTIALLY_FILLED'"),
        days: z.number().optional().describe('Only return orders created within the last N days'),
        limit: z.number().optional().describe('Maximum number of orders to return (applied after other filters)'),
      },
      annotations: readOnly,
    },
    async ({ userName, status, days, limit }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/cxos/${encodeURIComponent(user)}`);
      const filtered = filterExchangeTrades(data as any[], { status, days, limit });
      return { content: [{ type: 'text', text: JSON.stringify(filtered) }] };
    },
  );

  server.registerTool(
    'fio_get_ship_flights',
    {
      description: 'Get ship flight data for a user including current location, destination, and ETA.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/ship/flights/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_ship_fuel',
    {
      description: 'Get ship fuel store data for a user.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/ship/ships/fuel/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_contract_shipments',
    {
      description: 'Get shipment location tracking for all contract shipments.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/contract/shipments');
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_burn_rate',
    {
      description: 'Get burn rate settings for a user, including days of consumable supply remaining per base.',
      inputSchema: {
        userName: z.string().optional().describe('Username to query (defaults to the configured FIO_USERNAME)'),
      },
      annotations: readOnly,
    },
    async ({ userName }) => {
      const user = userName ?? FIO_USERNAME;
      const data = await fioGet(`/usersettings/burnrate/${encodeURIComponent(user)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );
}
