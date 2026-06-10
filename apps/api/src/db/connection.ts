import type { ClientConfig } from "pg";

export function createPostgresConnectionConfig(connectionString: string): ClientConfig {
  const sslMode = readSslMode(connectionString);
  const normalizedConnectionString = removeSslMode(connectionString);

  if (!sslMode || sslMode === "disable") {
    return { connectionString: normalizedConnectionString };
  }

  return {
    connectionString: normalizedConnectionString,
    ssl: {
      rejectUnauthorized: sslMode === "verify-full",
    },
  };
}

function readSslMode(connectionString: string) {
  try {
    return new URL(connectionString).searchParams.get("sslmode");
  } catch {
    return null;
  }
}

function removeSslMode(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return connectionString;
  }
}
