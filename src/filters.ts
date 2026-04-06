export interface FilterOptions {
  status?: string;
  days?: number;
  limit?: number;
}

export function filterContracts(contracts: any[], opts: FilterOptions): any[] {
  let result = contracts;

  if (opts.status) {
    const s = opts.status.toUpperCase();
    result = result.filter((c: any) => c.Status === s);
  }

  if (opts.days) {
    const cutoff = Date.now() - opts.days * 86400000;
    result = result.filter((c: any) => c.DateEpochMs >= cutoff);
  }

  if (opts.limit) {
    result = result.slice(0, opts.limit);
  }

  return result;
}

export function filterExchangeTrades(orders: any[], opts: FilterOptions): any[] {
  let result = orders;

  if (opts.status) {
    const s = opts.status.toUpperCase();
    result = result.filter((o: any) => o.Status === s);
  }

  if (opts.days) {
    const cutoff = Date.now() - opts.days * 86400000;
    result = result.filter((o: any) => o.CreatedEpochMs >= cutoff);
  }

  if (opts.limit) {
    result = result.slice(0, opts.limit);
  }

  return result;
}

export function filterTradesCsv(csv: string, opts: FilterOptions): string {
  const lines = csv.split('\n');
  if (lines.length <= 1) return csv;

  const header = lines[0];
  const cols = header.split(',');
  const dateIdx = cols.findIndex(c => c.trim().toLowerCase() === 'date');
  const statusIdx = cols.findIndex(c => c.trim().toLowerCase() === 'orderstatus');
  let rows = lines.slice(1).filter(r => r.trim() !== '');

  if (opts.status && statusIdx >= 0) {
    const s = opts.status.toUpperCase();
    rows = rows.filter(r => {
      const fields = r.split(',');
      return fields[statusIdx]?.trim().toUpperCase() === s;
    });
  }

  if (opts.days && dateIdx >= 0) {
    const cutoff = Date.now() - opts.days * 86400000;
    rows = rows.filter(r => {
      const fields = r.split(',');
      const ts = new Date(fields[dateIdx]?.trim()).getTime();
      return ts >= cutoff;
    });
  }

  if (opts.limit) {
    rows = rows.slice(0, opts.limit);
  }

  return [header, ...rows].join('\n');
}
