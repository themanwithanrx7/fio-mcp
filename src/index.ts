#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMarketTools } from './tools/market.js';
import { registerProductionTools } from './tools/production.js';
import { registerPlanetTools } from './tools/planets.js';
import { registerAccountTools } from './tools/account.js';

const server = new McpServer({
  name: 'fio-mcp',
  version: '1.0.0',
});

registerMarketTools(server);
registerProductionTools(server);
registerPlanetTools(server);
registerAccountTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
