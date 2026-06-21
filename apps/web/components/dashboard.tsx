"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "developer" | "viewer";
}

interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  defaultEnvironment: "development" | "staging" | "production";
  archivedAt: string | null;
}

interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  environment: "development" | "staging" | "production";
  revokedAt: string | null;
  createdAt: string;
}

export function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);

  const selectedOrganization = organizations.find(
    (organization) => organization.id === selectedOrganizationId,
  );
  const canAdminister = selectedOrganization
    ? selectedOrganization.role === "owner" ||
      selectedOrganization.role === "admin"
    : false;

  const loadOrganizations = useCallback(async () => {
    const [me, organizationData] = await Promise.all([
      apiRequest<{ user: User }>("/v1/auth/me"),
      apiRequest<{ organizations: Organization[] }>("/v1/organizations"),
    ]);
    setUser(me.user);
    setOrganizations(organizationData.organizations);
    setSelectedOrganizationId(
      (current) => current || organizationData.organizations[0]?.id || "",
    );
  }, []);

  const loadProjects = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setProjects([]);
      return;
    }
    const result = await apiRequest<{ projects: Project[] }>(
      `/v1/organizations/${organizationId}/projects`,
    );
    setProjects(result.projects);
    setSelectedProjectId((current) =>
      result.projects.some((project) => project.id === current)
        ? current
        : result.projects.find((project) => !project.archivedAt)?.id || "",
    );
  }, []);

  const loadKeys = useCallback(async (projectId: string) => {
    if (!projectId) {
      setApiKeys([]);
      return;
    }
    const result = await apiRequest<{ apiKeys: ApiKeySummary[] }>(
      `/v1/projects/${projectId}/api-keys`,
    );
    setApiKeys(result.apiKeys);
  }, []);

  useEffect(() => {
    loadOrganizations()
      .catch(() => router.replace("/signin"))
      .finally(() => setLoading(false));
  }, [loadOrganizations, router]);

  useEffect(() => {
    loadProjects(selectedOrganizationId).catch((caught: unknown) => {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar projetos.",
      );
    });
  }, [loadProjects, selectedOrganizationId]);

  useEffect(() => {
    loadKeys(selectedProjectId).catch((caught: unknown) => {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar chaves.",
      );
    });
  }, [loadKeys, selectedProjectId]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    const form = new FormData(formElement);
    try {
      const result = await apiRequest<{ organization: Organization }>(
        "/v1/organizations",
        {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name") ?? ""),
            slug: String(form.get("slug") ?? ""),
          }),
        },
      );
      formElement.reset();
      await loadOrganizations();
      setSelectedOrganizationId(result.organization.id);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao criar organização.",
      );
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    const form = new FormData(formElement);
    try {
      const result = await apiRequest<{ project: Project }>("/v1/projects", {
        method: "POST",
        body: JSON.stringify({
          organizationId: selectedOrganizationId,
          name: String(form.get("name") ?? ""),
          slug: String(form.get("slug") ?? ""),
          description: String(form.get("description") ?? ""),
          defaultEnvironment: String(form.get("environment") ?? "development"),
          retentionDays: 30,
          capturePrompts: true,
          captureResponses: true,
          redactedFields: [],
        }),
      });
      formElement.reset();
      await loadProjects(selectedOrganizationId);
      setSelectedProjectId(result.project.id);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao criar projeto.",
      );
    }
  }

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingKey) {
      return;
    }
    const formElement = event.currentTarget;
    setError(null);
    setCreatedKey(null);
    setCreatingKey(true);
    const form = new FormData(formElement);
    try {
      const result = await apiRequest<{
        apiKey: ApiKeySummary & { key: string };
      }>(`/v1/projects/${selectedProjectId}/api-keys`, {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          environment: String(form.get("environment") ?? "development"),
        }),
      });
      formElement.reset();
      setCreatedKey(result.apiKey.key);
      await loadKeys(selectedProjectId);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao criar chave.",
      );
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeKey(apiKeyId: string) {
    setError(null);
    try {
      await apiRequest(`/v1/api-keys/${apiKeyId}`, { method: "DELETE" });
      await loadKeys(selectedProjectId);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao revogar chave.",
      );
    }
  }

  async function rotateKey(apiKeyId: string) {
    setError(null);
    setCreatedKey(null);
    try {
      const result = await apiRequest<{
        apiKey: ApiKeySummary & { key: string };
      }>(`/v1/api-keys/${apiKeyId}/rotate`, { method: "POST" });
      setCreatedKey(result.apiKey.key);
      await loadKeys(selectedProjectId);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao rotacionar chave.",
      );
    }
  }

  async function signOut() {
    await apiRequest("/v1/auth/signout", { method: "POST" });
    router.replace("/signin");
  }

  if (loading) {
    return (
      <main className="shell py-12 text-zinc-400">Carregando workspace…</main>
    );
  }

  return (
    <main className="shell py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-violet-400">AgentScope</p>
          <h1 className="text-3xl font-semibold">Olá, {user?.name}</h1>
        </div>
        <button
          className="button button-secondary"
          onClick={signOut}
          type="button"
        >
          Sair
        </button>
      </header>

      {error ? (
        <p className="mb-5 rounded-xl border border-red-900 bg-red-950/60 p-4 text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <section className="space-y-6">
          <div className="panel p-5">
            <h2 className="text-lg font-semibold">Organização</h2>
            {organizations.length ? (
              <select
                className="field mt-4"
                onChange={(event) =>
                  setSelectedOrganizationId(event.target.value)
                }
                value={selectedOrganizationId}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} · {organization.role}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">
                Crie seu primeiro workspace abaixo.
              </p>
            )}
            <form className="mt-5 grid gap-3" onSubmit={createOrganization}>
              <input
                className="field"
                name="name"
                placeholder="Nome da organização"
                required
              />
              <input
                className="field"
                name="slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="minha-organizacao"
                required
              />
              <button className="button" type="submit">
                Criar organização
              </button>
            </form>
          </div>

          <div className="panel p-5">
            <h2 className="text-lg font-semibold">Projetos</h2>
            {projects.length ? (
              <div className="mt-4 grid gap-2">
                {projects.map((project) => (
                  <button
                    className={`rounded-xl border p-3 text-left ${
                      project.id === selectedProjectId
                        ? "border-violet-500 bg-violet-950/30"
                        : "border-zinc-800 bg-zinc-950/50"
                    }`}
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    type="button"
                  >
                    <span className="font-medium">{project.name}</span>
                    <span className="block text-xs text-zinc-500">
                      {project.slug}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">
                Nenhum projeto nesta organização.
              </p>
            )}
            {selectedOrganizationId && canAdminister ? (
              <form className="mt-5 grid gap-3" onSubmit={createProject}>
                <input
                  className="field"
                  name="name"
                  placeholder="Nome do projeto"
                  required
                />
                <input
                  className="field"
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="meu-agente"
                  required
                />
                <textarea
                  className="field"
                  name="description"
                  placeholder="Descrição"
                  rows={2}
                />
                <select
                  className="field"
                  name="environment"
                  defaultValue="development"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
                <button className="button" type="submit">
                  Criar projeto
                </button>
              </form>
            ) : null}
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-violet-400">
                Project access
              </p>
              <h2 className="mt-1 text-xl font-semibold">API keys</h2>
            </div>
          </div>

          {createdKey ? (
            <div className="my-5 rounded-xl border border-amber-800 bg-amber-950/30 p-4">
              <p className="font-semibold text-amber-200">
                Copie agora. Ela não será exibida novamente.
              </p>
              <code className="mt-3 block overflow-x-auto rounded-lg bg-black/40 p-3 text-sm text-amber-100">
                {createdKey}
              </code>
            </div>
          ) : null}

          {selectedProjectId && canAdminister ? (
            <form
              className="my-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]"
              onSubmit={createKey}
            >
              <input
                className="field"
                name="name"
                placeholder="Nome da chave"
                required
              />
              <select
                className="field"
                name="environment"
                defaultValue="development"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
              <button className="button" disabled={creatingKey} type="submit">
                {creatingKey ? "Gerando…" : "Gerar chave"}
              </button>
            </form>
          ) : null}

          <div className="grid gap-3">
            {apiKeys.map((apiKey) => (
              <article
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                key={apiKey.id}
              >
                <div>
                  <p className="font-medium">{apiKey.name}</p>
                  <code className="text-sm text-zinc-500">
                    {apiKey.prefix}_••••••••
                  </code>
                  <p className="mt-1 text-xs uppercase text-zinc-500">
                    {apiKey.environment} ·{" "}
                    {apiKey.revokedAt ? "revoked" : "active"}
                  </p>
                </div>
                {!apiKey.revokedAt && canAdminister ? (
                  <div className="flex gap-2">
                    <button
                      className="button button-secondary"
                      onClick={() => rotateKey(apiKey.id)}
                      type="button"
                    >
                      Rotacionar
                    </button>
                    <button
                      className="button button-danger"
                      onClick={() => revokeKey(apiKey.id)}
                      type="button"
                    >
                      Revogar
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            {!apiKeys.length ? (
              <p className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
                Selecione um projeto e gere a primeira chave.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
