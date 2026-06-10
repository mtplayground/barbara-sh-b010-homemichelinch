export interface HealthResponse {
  ok: true;
  service: "api";
  timestamp: string;
}

export function createHealthResponse(now: Date = new Date()): HealthResponse {
  return {
    ok: true,
    service: "api",
    timestamp: now.toISOString(),
  };
}
