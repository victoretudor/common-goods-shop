import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Set by the auth provider; every request sends it as a Bearer token. */
export function setApiToken(value: string | null) {
  token = value;
}

/** Called when the server rejects our token (expired or signed out elsewhere). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export async function api<T>(path: string, method: Method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the shop. Check your internet connection.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.fieldErrors);
  }
  return data as T;
}
