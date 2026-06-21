export interface TelemetryConfiguration {
  serviceName: string;
  otlpEndpoint: string;
}

export function telemetryConfiguration(
  serviceName: string,
  otlpEndpoint: string,
): TelemetryConfiguration {
  return { serviceName, otlpEndpoint };
}
