import { describe, expect, test } from "bun:test";

const shouldRun = process.env.RUN_PHASE1_INTEGRATION === "1";
const apiUrl = process.env.API_URL ?? "http://localhost:3001";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

interface ApiResponse<TData> {
  status: number;
  data: TData | undefined;
  errorCode: string | undefined;
  cookie: string | undefined;
  raw: string;
}

async function apiRequest<TData>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    cookie?: string | undefined;
  } = {},
): Promise<ApiResponse<TData>> {
  const headers = new Headers({
    origin: appUrl,
  });
  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (init.cookie) {
    headers.set("cookie", init.cookie);
  }

  const requestInit: RequestInit = {
    method: init.method ?? "GET",
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  };
  const response = await fetch(`${apiUrl}${path}`, requestInit);
  const raw = await response.text();
  const payload = JSON.parse(raw) as {
    data?: TData;
    error?: { code?: string };
  };
  const setCookie = response.headers.get("set-cookie");

  return {
    status: response.status,
    data: payload.data,
    errorCode: payload.error?.code,
    cookie: setCookie?.split(";")[0],
    raw,
  };
}

function required<TValue>(
  value: TValue | undefined,
  description: string,
): TValue {
  if (value === undefined) {
    throw new Error(`${description} was not returned.`);
  }
  return value;
}

describe.skipIf(!shouldRun)("Phase 1 integration", () => {
  test("protects tenants and manages the API key lifecycle", async () => {
    const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const password = "Integration!12345";
    const emailA = `phase1-${unique}-a@example.test`;
    const emailB = `phase1-${unique}-b@example.test`;

    const shortPassword = await apiRequest("/v1/auth/signup", {
      method: "POST",
      body: {
        name: "Short password",
        email: `short-${unique}@example.test`,
        password: "short",
      },
    });
    expect(shortPassword.status).toBe(400);
    expect(shortPassword.errorCode).toBe("VALIDATION_ERROR");

    const signupA = await apiRequest<{
      user: { id: string };
    }>("/v1/auth/signup", {
      method: "POST",
      body: { name: "Integration A", email: emailA, password },
    });
    expect(signupA.status).toBe(201);
    expect(signupA.cookie).toBeDefined();
    const cookieA = required(signupA.cookie, "First session cookie");

    const duplicate = await apiRequest("/v1/auth/signup", {
      method: "POST",
      body: { name: "Duplicate", email: emailA, password },
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.errorCode).toBe("EMAIL_ALREADY_EXISTS");

    const organizationA = await apiRequest<{
      organization: { id: string; role: string };
    }>("/v1/organizations", {
      method: "POST",
      cookie: cookieA,
      body: { name: "Integration A", slug: `org-${unique}-a` },
    });
    expect(organizationA.status).toBe(201);
    expect(organizationA.data?.organization.role).toBe("owner");
    const organizationId = required(
      organizationA.data?.organization.id,
      "Organization ID",
    );

    const project = await apiRequest<{
      project: { id: string };
    }>("/v1/projects", {
      method: "POST",
      cookie: cookieA,
      body: {
        organizationId,
        name: "Integration project",
        slug: "integration-project",
        description: "Phase 1 integration test",
        defaultEnvironment: "development",
        retentionDays: 30,
        capturePrompts: true,
        captureResponses: true,
        redactedFields: [],
      },
    });
    expect(project.status).toBe(201);
    const projectId = required(project.data?.project.id, "Project ID");

    const updatedProject = await apiRequest<{
      project: { name: string; slug: string };
    }>(`/v1/projects/${projectId}`, {
      method: "PATCH",
      cookie: cookieA,
      body: {
        name: "Updated integration project",
        slug: "updated-integration-project",
      },
    });
    expect(updatedProject.status).toBe(200);
    expect(updatedProject.data?.project.name).toBe(
      "Updated integration project",
    );

    const createdKey = await apiRequest<{
      apiKey: { id: string; key: string };
    }>(`/v1/projects/${projectId}/api-keys`, {
      method: "POST",
      cookie: cookieA,
      body: { name: "Integration key", environment: "development" },
    });
    expect(createdKey.status).toBe(201);
    const createdApiKey = required(createdKey.data?.apiKey, "Created API key");
    const rawKey = createdApiKey.key;
    expect(rawKey).toStartWith("as_dev_");

    const listedKeys = await apiRequest<{
      apiKeys: Array<{ id: string; revokedAt: string | null }>;
    }>(`/v1/projects/${projectId}/api-keys`, {
      cookie: cookieA,
    });
    expect(listedKeys.raw).not.toContain(rawKey);

    const rotatedKey = await apiRequest<{
      apiKey: { id: string; key: string };
    }>(`/v1/api-keys/${createdApiKey.id}/rotate`, {
      method: "POST",
      cookie: cookieA,
    });
    expect(rotatedKey.status).toBe(201);
    expect(rotatedKey.data?.apiKey.key).not.toBe(rawKey);
    const rotatedApiKey = required(rotatedKey.data?.apiKey, "Rotated API key");

    const revokedKey = await apiRequest(`/v1/api-keys/${rotatedApiKey.id}`, {
      method: "DELETE",
      cookie: cookieA,
    });
    expect(revokedKey.status).toBe(200);

    const signupB = await apiRequest("/v1/auth/signup", {
      method: "POST",
      body: { name: "Integration B", email: emailB, password },
    });
    const cookieB = required(signupB.cookie, "Second session cookie");
    const crossTenant = await apiRequest(`/v1/projects/${projectId}/api-keys`, {
      cookie: cookieB,
    });
    expect(crossTenant.status).toBe(403);
    expect(crossTenant.errorCode).toBe("INSUFFICIENT_PROJECT_ACCESS");

    const archived = await apiRequest(`/v1/projects/${projectId}`, {
      method: "DELETE",
      cookie: cookieA,
    });
    expect(archived.status).toBe(200);

    const keyOnArchivedProject = await apiRequest(
      `/v1/projects/${projectId}/api-keys`,
      {
        method: "POST",
        cookie: cookieA,
        body: { name: "Blocked key", environment: "development" },
      },
    );
    expect(keyOnArchivedProject.status).toBe(409);
    expect(keyOnArchivedProject.errorCode).toBe("PROJECT_ARCHIVED");
  }, 30_000);
});
