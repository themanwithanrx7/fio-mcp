const BASE_URL = 'https://rest.fnar.net';

const apiKey = process.env.FIO_API_KEY;
if (!apiKey) {
  throw new Error('FIO_API_KEY environment variable is required');
}

export const FIO_USERNAME = process.env.FIO_USERNAME ?? '';

function getHeaders(): Record<string, string> {
  return {
    Authorization: apiKey!,
    'Content-Type': 'application/json',
  };
}

export async function fioGet(path: string): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    throw new Error(`FIO API error ${res.status}: ${res.statusText} (${path})`);
  }
  return res.json();
}

export async function fioGetCsv(path: string): Promise<string> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}apikey=${encodeURIComponent(apiKey!)}`;
  const res = await fetch(url, { headers: { Authorization: apiKey! } });
  if (!res.ok) {
    throw new Error(`FIO API error ${res.status}: ${res.statusText} (${path})`);
  }
  return res.text();
}

export async function fioPost(path: string, body: unknown): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`FIO API error ${res.status}: ${res.statusText} (${path})`);
  }
  return res.json();
}
