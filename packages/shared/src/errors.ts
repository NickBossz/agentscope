import type { ApiErrorEnvelope } from "./types";

export class DomainError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function errorEnvelope(error: DomainError): ApiErrorEnvelope {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

export function successEnvelope<TData>(data: TData): { data: TData } {
  return { data };
}
