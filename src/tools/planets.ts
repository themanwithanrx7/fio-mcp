import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fioGet, fioPost } from '../client.js';

function compactInfrastructure(data: any): any {
  const projects = (data.InfrastructureProjects ?? [])
    .filter((p: any) => p.SimulationPeriod === 0)
    .map((p: any) => {
      const proj: any = { type: p.Type, ticker: p.Ticker, level: p.CurrentLevel };
      if (p.UpkeepStatus) proj.upkeepStatus = Math.round(p.UpkeepStatus * 1000) / 1000;
      if (p.UpgradeStatus) proj.upgradeStatus = Math.round(p.UpgradeStatus * 1000) / 1000;
      if (p.UpgradeCosts?.length)
        proj.upgradeCosts = p.UpgradeCosts.map((c: any) => ({
          ticker: c.CommodityTicker ?? c.Ticker,
          amount: c.Amount,
        }));
      if (p.Upkeeps?.length)
        proj.upkeeps = p.Upkeeps.map((u: any) => ({ ticker: u.CommodityTicker ?? u.Ticker, amount: u.Amount }));
      return proj;
    });

  // Current period report (SimulationPeriod 0)
  const report = (data.InfrastructureReports ?? []).find((r: any) => r.SimulationPeriod === 0);
  const compactReport = report
    ? {
        population: {
          pioneer: report.NextPopulationPioneer,
          settler: report.NextPopulationSettler,
          technician: report.NextPopulationTechnician,
          engineer: report.NextPopulationEngineer,
          scientist: report.NextPopulationScientist,
        },
        happiness: {
          pioneer: report.AverageHappinessPioneer,
          settler: report.AverageHappinessSettler,
          technician: report.AverageHappinessTechnician,
          engineer: report.AverageHappinessEngineer,
          scientist: report.AverageHappinessScientist,
        },
        openJobs: {
          pioneer: report.OpenJobsPioneer,
          settler: report.OpenJobsSettler,
          technician: report.OpenJobsTechnician,
          engineer: report.OpenJobsEngineer,
          scientist: report.OpenJobsScientist,
        },
        needFulfillment: {
          lifeSupport: report.NeedFulfillmentLifeSupport,
          safety: report.NeedFulfillmentSafety,
          health: report.NeedFulfillmentHealth,
          comfort: report.NeedFulfillmentComfort,
          culture: report.NeedFulfillmentCulture,
          education: report.NeedFulfillmentEducation,
        },
      }
    : null;

  return {
    projects,
    report: compactReport,
    programs: (data.InfrastructurePrograms ?? []).map((p: any) => ({
      category: p.Category,
      program: p.Program,
      start: new Date(p.StartTimestampEpochMs).toISOString(),
      end: new Date(p.EndTimestampEpochMs).toISOString(),
    })),
  };
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerPlanetTools(server: McpServer): void {
  server.registerTool(
    'fio_get_all_planets',
    {
      description:
        'Get a list of all planets with minimal data (name, id, system). Use fio_get_planet for full details on a specific planet.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/planet/allplanets');
      // Compact: skip name when it equals the natural ID (unnamed planets)
      const compact = (data as any[]).map((p: any) => {
        const id = p.PlanetNaturalId;
        const name = p.PlanetName;
        return name && name !== id ? { id, name } : { id };
      });
      return { content: [{ type: 'text', text: JSON.stringify(compact) }] };
    },
  );

  server.registerTool(
    'fio_get_planet',
    {
      description:
        'Get full details for a specific planet including resources, environment, fertility, build slots, and COGC program.',
      inputSchema: { planet: z.string().describe("Planet name or natural ID, e.g. 'Montem', 'UV-351a', 'Katoa'") },
      annotations: readOnly,
    },
    async ({ planet }) => {
      const data = await fioGet(`/planet/${encodeURIComponent(planet)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_search_planets',
    {
      description:
        'Search for planets matching specific criteria such as distance, resources, or environment conditions.',
      inputSchema: {
        searchTerms: z
          .array(
            z.object({
              name: z
                .string()
                .describe("Search field name, e.g. 'ResourceSymbol', 'Distance', 'HasAdministrationCenter'"),
              value: z.string().describe('Value to match'),
              operator: z.string().optional().describe("Comparison operator, e.g. 'GTE', 'EQ'"),
            }),
          )
          .describe('Array of search criteria objects'),
      },
      annotations: readOnly,
    },
    async ({ searchTerms }) => {
      const data = await fioPost('/planet/search', searchTerms);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_planet_sites',
    {
      description: 'Get all player-built sites (bases) on a planet.',
      inputSchema: { planet: z.string().describe('Planet name or natural ID') },
      annotations: readOnly,
    },
    async ({ planet }) => {
      const data = await fioGet(`/planet/sites/${encodeURIComponent(planet)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_all_systems',
    {
      description: 'Get all star systems and sectors in the game universe.',
      annotations: readOnly,
    },
    async () => {
      const data = await fioGet('/systemstars/all');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_system',
    {
      description: 'Get details for a specific star system including connected systems and planets.',
      inputSchema: { systemId: z.string().describe("System ID or name, e.g. 'UV-351'") },
      annotations: readOnly,
    },
    async ({ systemId }) => {
      const data = await fioGet(`/systemstars/${encodeURIComponent(systemId)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'fio_get_infrastructure',
    {
      description: 'Get infrastructure details for a planet (population, administrator center level, CoGC, etc.).',
      inputSchema: { planet: z.string().describe('Planet name, natural ID, or infrastructure ID') },
      annotations: readOnly,
    },
    async ({ planet }) => {
      const data = await fioGet(`/infrastructure/${encodeURIComponent(planet)}`);
      return { content: [{ type: 'text', text: JSON.stringify(compactInfrastructure(data)) }] };
    },
  );

  server.registerTool(
    'fio_get_jump_count',
    {
      description: 'Get the number of jumps between two star systems.',
      inputSchema: {
        source: z.string().describe("Source system ID or name, e.g. 'UV-351'"),
        destination: z.string().describe("Destination system ID or name, e.g. 'Moria'"),
      },
      annotations: readOnly,
    },
    async ({ source, destination }) => {
      const data = await fioGet(
        `/systemstars/jumpcount/${encodeURIComponent(source)}/${encodeURIComponent(destination)}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );

  server.registerTool(
    'fio_get_jump_route',
    {
      description: 'Get the full jump route between two star systems, listing each system along the path.',
      inputSchema: {
        source: z.string().describe("Source system ID or name, e.g. 'UV-351'"),
        destination: z.string().describe("Destination system ID or name, e.g. 'Moria'"),
      },
      annotations: readOnly,
    },
    async ({ source, destination }) => {
      const data = await fioGet(
        `/systemstars/jumproute/${encodeURIComponent(source)}/${encodeURIComponent(destination)}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  );
}
