import { describe, it, expect } from "vitest";
import { filterContracts, filterExchangeTrades, filterTradesCsv } from "../src/filters.js";

const makeContract = (overrides: Partial<{ Status: string; DateEpochMs: number }> = {}) => ({
  ContractLocalId: "c1",
  Status: "CLOSED",
  DateEpochMs: Date.now(),
  Party: "SELF",
  Conditions: [],
  ...overrides,
});

describe("filterContracts", () => {
  it("returns all contracts when no filters given", () => {
    const contracts = [makeContract(), makeContract()];
    expect(filterContracts(contracts, {})).toHaveLength(2);
  });

  it("filters by status (case-insensitive)", () => {
    const contracts = [
      makeContract({ Status: "CLOSED" }),
      makeContract({ Status: "FULFILLED" }),
      makeContract({ Status: "CLOSED" }),
    ];
    expect(filterContracts(contracts, { status: "closed" })).toHaveLength(2);
  });

  it("filters by days", () => {
    const now = Date.now();
    const contracts = [
      makeContract({ DateEpochMs: now - 1 * 86400000 }),
      makeContract({ DateEpochMs: now - 5 * 86400000 }),
      makeContract({ DateEpochMs: now - 10 * 86400000 }),
    ];
    expect(filterContracts(contracts, { days: 3 })).toHaveLength(1);
    expect(filterContracts(contracts, { days: 7 })).toHaveLength(2);
  });

  it("applies limit after other filters", () => {
    const contracts = [
      makeContract({ Status: "CLOSED" }),
      makeContract({ Status: "CLOSED" }),
      makeContract({ Status: "CLOSED" }),
    ];
    expect(filterContracts(contracts, { status: "CLOSED", limit: 2 })).toHaveLength(2);
  });

  it("combines status + days + limit", () => {
    const now = Date.now();
    const contracts = [
      makeContract({ Status: "CLOSED", DateEpochMs: now - 1 * 86400000 }),
      makeContract({ Status: "FULFILLED", DateEpochMs: now - 1 * 86400000 }),
      makeContract({ Status: "CLOSED", DateEpochMs: now - 1 * 86400000 }),
      makeContract({ Status: "CLOSED", DateEpochMs: now - 30 * 86400000 }),
    ];
    const result = filterContracts(contracts, { status: "CLOSED", days: 7, limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].Status).toBe("CLOSED");
  });
});

const makeTradeOrder = (overrides: Partial<{
  Status: string;
  CreatedEpochMs: number;
  OrderType: string;
  MaterialTicker: string;
}> = {}) => ({
  CXOSTradeOrderId: "t1",
  Status: "FILLED",
  OrderType: "SELLING",
  MaterialTicker: "CU",
  CreatedEpochMs: Date.now(),
  Trades: [],
  ...overrides,
});

describe("filterExchangeTrades", () => {
  it("returns all when no filters given", () => {
    const orders = [makeTradeOrder(), makeTradeOrder()];
    expect(filterExchangeTrades(orders, {})).toHaveLength(2);
  });

  it("filters by status (case-insensitive)", () => {
    const orders = [
      makeTradeOrder({ Status: "FILLED" }),
      makeTradeOrder({ Status: "PLACED" }),
    ];
    expect(filterExchangeTrades(orders, { status: "filled" })).toHaveLength(1);
  });

  it("filters by days based on CreatedEpochMs", () => {
    const now = Date.now();
    const orders = [
      makeTradeOrder({ CreatedEpochMs: now - 1 * 86400000 }),
      makeTradeOrder({ CreatedEpochMs: now - 10 * 86400000 }),
    ];
    expect(filterExchangeTrades(orders, { days: 3 })).toHaveLength(1);
  });

  it("applies limit", () => {
    const orders = [makeTradeOrder(), makeTradeOrder(), makeTradeOrder()];
    expect(filterExchangeTrades(orders, { limit: 2 })).toHaveLength(2);
  });
});

describe("filterTradesCsv", () => {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
  const header = "Ticker,Exchange,Date,Amount,Price,Currency,OrderType,OrderStatus";
  const makeCsv = (rows: string[]) => [header, ...rows].join("\n");

  it("returns all rows when no filters given", () => {
    const csv = makeCsv([
      `CU,CI1,${daysAgo(1)},100,500,CIS,SELLING,FILLED`,
      `FE,CI1,${daysAgo(2)},200,300,CIS,BUYING,FILLED`,
    ]);
    const result = filterTradesCsv(csv, {});
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
  });

  it("filters by days", () => {
    const csv = makeCsv([
      `CU,CI1,${daysAgo(1)},100,500,CIS,SELLING,FILLED`,
      `FE,CI1,${daysAgo(10)},200,300,CIS,BUYING,FILLED`,
    ]);
    const result = filterTradesCsv(csv, { days: 3 });
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
  });

  it("filters by status", () => {
    const csv = makeCsv([
      `CU,CI1,${daysAgo(1)},100,500,CIS,SELLING,FILLED`,
      `FE,CI1,${daysAgo(1)},200,300,CIS,BUYING,PLACED`,
    ]);
    const result = filterTradesCsv(csv, { status: "FILLED" });
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
  });

  it("applies limit", () => {
    const csv = makeCsv([
      `CU,CI1,${daysAgo(1)},100,500,CIS,SELLING,FILLED`,
      `FE,CI1,${daysAgo(1)},200,300,CIS,BUYING,FILLED`,
      `AL,CI1,${daysAgo(1)},50,1200,CIS,SELLING,FILLED`,
    ]);
    const result = filterTradesCsv(csv, { limit: 2 });
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
  });

  it("handles empty CSV gracefully", () => {
    const result = filterTradesCsv(header, { days: 7 });
    expect(result).toBe(header);
  });
});
