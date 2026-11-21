/**
 * Shared typed fetch wrapper for the client-facing service layer.
 *
 * Components should never call `fetch` directly; they should call a
 * `<domain>.service.ts` module which in turn uses `apiFetch`.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  credentials?: RequestCredentials;
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams
  );
}

async function readBody(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    if (!text) return undefined;
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function getErrorMessage(data: unknown, res: Response): string {
  if (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return res.statusText || `Request failed with status ${res.status}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (isRawBody(options.body)) {
      body = options.body;
    } else {
      const hasContentType = Object.keys(headers).some(
        (key) => key.toLowerCase() === "content-type",
      );
      if (!hasContentType) headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(path, {
    method,
    headers,
    body,
    signal: options.signal,
    cache: options.cache,
    credentials: options.credentials,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(getErrorMessage(data, res), res.status, data);
  }

  if (res.status === 204) return undefined as T;

  const data = await readBody(res);
  return data as T;
}

type QueryValue = string | number | boolean | null | undefined;

export function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.append(key, String(value));
  }
  return search.toString();
}

export function withQuery(
  path: string,
  params: Record<string, QueryValue>,
): string {
  const query = toQuery(params);
  return query ? `${path}?${query}` : path;
}
