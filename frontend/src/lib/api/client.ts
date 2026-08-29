export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type ApiEnvelope<T> = { data: T; meta: { requestId: string } };

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = (await response.json()) as ApiEnvelope<T> | { error: { message: string } };
  if (!response.ok)
    throw new ApiError(
      'error' in payload ? payload.error.message : 'AdFlow API request failed.',
      response.status,
    );
  return (payload as ApiEnvelope<T>).data;
}
