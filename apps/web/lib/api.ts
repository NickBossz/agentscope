const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export class ApiRequestError extends Error {
  public constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = value.error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

export async function apiRequest<TData>(
  path: string,
  init: RequestInit = {},
): Promise<TData> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new ApiRequestError(
        payload.error.message,
        payload.error.code,
        response.status,
      );
    }
    throw new ApiRequestError(
      "A solicitação falhou.",
      "UNKNOWN_ERROR",
      response.status,
    );
  }

  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    throw new ApiRequestError(
      "A resposta da API é inválida.",
      "INVALID_RESPONSE",
      500,
    );
  }

  return payload.data as TData;
}
