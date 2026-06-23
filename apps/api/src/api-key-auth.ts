import type { Database } from "@agentscope/database";
import { apiKeys, projectSettings, projects } from "@agentscope/database";
import { DomainError } from "@agentscope/shared";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { config } from "./config";
import { apiKeyPrefix, hashSecret, secretsEqual } from "./security";

export interface AuthenticatedProjectKey {
  apiKeyId: string;
  projectId: string;
  organizationId: string;
  environment: "development" | "staging" | "production";
  settings: {
    capturePrompts: boolean;
    captureResponses: boolean;
    redactedFields: string[];
  };
}

export async function authenticateProjectApiKey(
  database: Database["db"],
  rawKey: string,
): Promise<AuthenticatedProjectKey> {
  const prefix = apiKeyPrefix(rawKey);
  if (!prefix) {
    throw new DomainError("INVALID_API_KEY", "The API key is invalid.", 401);
  }

  const [candidate] = await database
    .select({
      apiKeyId: apiKeys.id,
      keyHash: apiKeys.keyHash,
      projectId: apiKeys.projectId,
      organizationId: apiKeys.organizationId,
      environment: apiKeys.environment,
      capturePrompts: projectSettings.capturePrompts,
      captureResponses: projectSettings.captureResponses,
      redactedFields: projectSettings.redactedFields,
    })
    .from(apiKeys)
    .innerJoin(projects, eq(projects.id, apiKeys.projectId))
    .innerJoin(
      projectSettings,
      eq(projectSettings.projectId, apiKeys.projectId),
    )
    .where(
      and(
        eq(apiKeys.prefix, prefix),
        isNull(apiKeys.revokedAt),
        isNull(projects.archivedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
      ),
    )
    .limit(1);

  const suppliedHash = hashSecret(rawKey, config.AUTH_SECRET);
  if (!candidate || !secretsEqual(candidate.keyHash, suppliedHash)) {
    throw new DomainError("INVALID_API_KEY", "The API key is invalid.", 401);
  }

  return {
    apiKeyId: candidate.apiKeyId,
    projectId: candidate.projectId,
    organizationId: candidate.organizationId,
    environment: candidate.environment,
    settings: {
      capturePrompts: candidate.capturePrompts,
      captureResponses: candidate.captureResponses,
      redactedFields: candidate.redactedFields,
    },
  };
}
