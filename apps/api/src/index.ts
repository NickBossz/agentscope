import {
  apiKeys,
  auditLogs,
  createDatabase,
  isDatabaseConnectionError,
  organizationMembers,
  organizations,
  projectSettings,
  projects,
  sessions,
  users,
} from "@agentscope/database";
import {
  createApiKeySchema,
  createOrganizationSchema,
  createProjectSchema,
  DomainError,
  errorEnvelope,
  signInSchema,
  signUpSchema,
  successEnvelope,
  updateProjectSchema,
} from "@agentscope/shared";
import { cors } from "@elysiajs/cors";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { ZodError } from "zod";
import { requireSameOrigin, requireUser } from "./auth";
import { requireOrganizationRole, requireProjectRole } from "./authorization";
import { config } from "./config";
import { databaseErrorCode } from "./database-errors";
import {
  createApiKey,
  createOpaqueToken,
  expiredSessionCookie,
  hashSecret,
  sessionCookie,
} from "./security";

const database = createDatabase(config.DATABASE_URL);
const isProduction = config.NODE_ENV === "production";

function requiredResult<TValue>(
  value: TValue | undefined,
  operation: string,
): TValue {
  if (value === undefined) {
    throw new DomainError(
      "DATABASE_WRITE_FAILED",
      `The ${operation} operation did not return a result.`,
      500,
    );
  }
  return value;
}

const app = new Elysia()
  .use(
    cors({
      origin: config.APP_URL,
      credentials: true,
      allowedHeaders: ["content-type", "authorization"],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .onError(({ error, set }) => {
    if (error instanceof DomainError) {
      set.status = error.status;
      return errorEnvelope(error);
    }

    if (error instanceof ZodError) {
      set.status = 400;
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request payload is invalid.",
          details: { issues: error.issues },
        },
      };
    }

    if (databaseErrorCode(error) === "23505") {
      set.status = 409;
      return {
        error: {
          code: "RESOURCE_ALREADY_EXISTS",
          message: "A resource with the same unique fields already exists.",
          details: {},
        },
      };
    }

    if (isDatabaseConnectionError(error)) {
      database.reset();
      console.error(
        "Database connection was recycled after a connection error.",
      );
      set.status = 503;
      return {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "The database is temporarily unavailable.",
          details: {},
        },
      };
    }

    console.error("Unhandled API error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    set.status = 500;
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        details: {},
      },
    };
  })
  .get("/health", async ({ set }) => {
    try {
      await database.db.execute(sql`select 1`);
      return successEnvelope({ status: "ok", database: "connected" });
    } catch (error: unknown) {
      if (isDatabaseConnectionError(error)) {
        database.reset();
      }
      set.status = 503;
      return {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "The database is temporarily unavailable.",
          details: {},
        },
      };
    }
  })
  .post("/v1/auth/signup", async ({ body, request, set }) => {
    requireSameOrigin(request);
    const input = signUpSchema.parse(body);
    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });

    let user: { id: string; name: string; email: string } | undefined;
    try {
      const insertedUsers = await database.db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
        })
        .returning({ id: users.id, name: users.name, email: users.email });
      user = requiredResult(insertedUsers[0], "user creation");
    } catch (error: unknown) {
      if (databaseErrorCode(error) === "23505") {
        throw new DomainError(
          "EMAIL_ALREADY_EXISTS",
          "An account already uses this email.",
          409,
        );
      }
      throw error;
    }

    const createdUser = requiredResult(user, "user creation");
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + config.SESSION_TTL_SECONDS * 1000);
    await database.db.insert(sessions).values({
      userId: createdUser.id,
      tokenHash: hashSecret(token, config.AUTH_SECRET),
      expiresAt,
    });

    set.status = 201;
    set.headers["set-cookie"] = sessionCookie(token, expiresAt, isProduction);
    return successEnvelope({ user: createdUser });
  })
  .post("/v1/auth/signin", async ({ body, request, set }) => {
    requireSameOrigin(request);
    const input = signInSchema.parse(body);
    const [user] = await database.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (
      !user ||
      !(await Bun.password.verify(input.password, user.passwordHash))
    ) {
      throw new DomainError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
        401,
      );
    }

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + config.SESSION_TTL_SECONDS * 1000);
    await database.db.insert(sessions).values({
      userId: user.id,
      tokenHash: hashSecret(token, config.AUTH_SECRET),
      expiresAt,
    });

    set.headers["set-cookie"] = sessionCookie(token, expiresAt, isProduction);
    return successEnvelope({
      user: { id: user.id, name: user.name, email: user.email },
    });
  })
  .post("/v1/auth/signout", async ({ request, set }) => {
    requireSameOrigin(request);
    const token = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("agentscope_session="))
      ?.split("=")
      .slice(1)
      .join("=");

    if (token) {
      await database.db
        .delete(sessions)
        .where(
          eq(
            sessions.tokenHash,
            hashSecret(decodeURIComponent(token), config.AUTH_SECRET),
          ),
        );
    }

    set.headers["set-cookie"] = expiredSessionCookie(isProduction);
    return successEnvelope({ signedOut: true });
  })
  .get("/v1/auth/me", async ({ request }) => {
    const user = await requireUser(database.db, request);
    return successEnvelope({ user });
  })
  .get("/v1/organizations", async ({ request }) => {
    const user = await requireUser(database.db, request);
    const rows = await database.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: organizationMembers.role,
        createdAt: organizations.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(eq(organizationMembers.userId, user.id))
      .orderBy(organizations.name);

    return successEnvelope({ organizations: rows });
  })
  .post("/v1/organizations", async ({ body, request, set }) => {
    requireSameOrigin(request);
    const user = await requireUser(database.db, request);
    const input = createOrganizationSchema.parse(body);

    const organization = await database.db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(organizations)
        .values(input)
        .returning({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          createdAt: organizations.createdAt,
        });
      const organization = requiredResult(created, "organization creation");

      await transaction.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      });
      return organization;
    });

    set.status = 201;
    return successEnvelope({
      organization: { ...organization, role: "owner" as const },
    });
  })
  .get(
    "/v1/organizations/:organizationId/projects",
    async ({ params, request }) => {
      const user = await requireUser(database.db, request);
      await requireOrganizationRole(
        database.db,
        user.id,
        params.organizationId,
        "viewer",
      );

      const rows = await database.db
        .select({
          id: projects.id,
          organizationId: projects.organizationId,
          name: projects.name,
          slug: projects.slug,
          description: projects.description,
          defaultEnvironment: projects.defaultEnvironment,
          archivedAt: projects.archivedAt,
          retentionDays: projectSettings.retentionDays,
          capturePrompts: projectSettings.capturePrompts,
          captureResponses: projectSettings.captureResponses,
          redactedFields: projectSettings.redactedFields,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .innerJoin(projectSettings, eq(projectSettings.projectId, projects.id))
        .where(eq(projects.organizationId, params.organizationId))
        .orderBy(desc(projects.createdAt));

      return successEnvelope({ projects: rows });
    },
  )
  .post("/v1/projects", async ({ body, request, set }) => {
    requireSameOrigin(request);
    const user = await requireUser(database.db, request);
    const input = createProjectSchema.parse(body);
    await requireOrganizationRole(
      database.db,
      user.id,
      input.organizationId,
      "admin",
    );

    const project = await database.db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(projects)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          defaultEnvironment: input.defaultEnvironment,
        })
        .returning();
      const project = requiredResult(created, "project creation");

      const [settings] = await transaction
        .insert(projectSettings)
        .values({
          projectId: project.id,
          organizationId: input.organizationId,
          retentionDays: input.retentionDays,
          capturePrompts: input.capturePrompts,
          captureResponses: input.captureResponses,
          redactedFields: input.redactedFields,
        })
        .returning();

      return {
        ...project,
        settings: requiredResult(settings, "project settings creation"),
      };
    });

    set.status = 201;
    return successEnvelope({ project });
  })
  .patch("/v1/projects/:projectId", async ({ body, params, request }) => {
    requireSameOrigin(request);
    const user = await requireUser(database.db, request);
    const access = await requireProjectRole(
      database.db,
      user.id,
      params.projectId,
      "admin",
    );
    const input = updateProjectSchema.parse(body);

    const project = await database.db.transaction(async (transaction) => {
      const projectChanges = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.defaultEnvironment !== undefined
          ? { defaultEnvironment: input.defaultEnvironment }
          : {}),
        updatedAt: new Date(),
      };
      const [updated] = await transaction
        .update(projects)
        .set(projectChanges)
        .where(
          and(
            eq(projects.id, params.projectId),
            eq(projects.organizationId, access.organizationId),
          ),
        )
        .returning();

      const settingChanges = {
        ...(input.retentionDays !== undefined
          ? { retentionDays: input.retentionDays }
          : {}),
        ...(input.capturePrompts !== undefined
          ? { capturePrompts: input.capturePrompts }
          : {}),
        ...(input.captureResponses !== undefined
          ? { captureResponses: input.captureResponses }
          : {}),
        ...(input.redactedFields !== undefined
          ? { redactedFields: input.redactedFields }
          : {}),
        updatedAt: new Date(),
      };
      const [settings] = await transaction
        .update(projectSettings)
        .set(settingChanges)
        .where(
          and(
            eq(projectSettings.projectId, params.projectId),
            eq(projectSettings.organizationId, access.organizationId),
          ),
        )
        .returning();

      return { ...updated, settings };
    });

    return successEnvelope({ project });
  })
  .delete("/v1/projects/:projectId", async ({ params, request }) => {
    requireSameOrigin(request);
    const user = await requireUser(database.db, request);
    const access = await requireProjectRole(
      database.db,
      user.id,
      params.projectId,
      "admin",
    );
    const [project] = await database.db
      .update(projects)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, params.projectId),
          eq(projects.organizationId, access.organizationId),
          isNull(projects.archivedAt),
        ),
      )
      .returning();

    if (!project) {
      throw new DomainError(
        "PROJECT_NOT_FOUND",
        "The active project was not found.",
        404,
      );
    }
    return successEnvelope({ project });
  })
  .get("/v1/projects/:projectId/api-keys", async ({ params, request }) => {
    const user = await requireUser(database.db, request);
    await requireProjectRole(
      database.db,
      user.id,
      params.projectId,
      "developer",
    );
    const rows = await database.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        environment: apiKeys.environment,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.projectId, params.projectId))
      .orderBy(desc(apiKeys.createdAt));

    return successEnvelope({ apiKeys: rows });
  })
  .post(
    "/v1/projects/:projectId/api-keys",
    async ({ body, params, request, set }) => {
      requireSameOrigin(request);
      const user = await requireUser(database.db, request);
      const access = await requireProjectRole(
        database.db,
        user.id,
        params.projectId,
        "admin",
      );
      if (access.archivedAt) {
        throw new DomainError(
          "PROJECT_ARCHIVED",
          "Archived projects cannot create API keys.",
          409,
        );
      }
      const input = createApiKeySchema.parse(body);
      const generated = createApiKey(input.environment, config.AUTH_SECRET);
      const apiKey = await database.db.transaction(async (transaction) => {
        const createdRows = await transaction
          .insert(apiKeys)
          .values({
            organizationId: access.organizationId,
            projectId: params.projectId,
            name: input.name,
            prefix: generated.prefix,
            keyHash: generated.keyHash,
            environment: input.environment,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            createdByUserId: user.id,
          })
          .returning({
            id: apiKeys.id,
            name: apiKeys.name,
            prefix: apiKeys.prefix,
            environment: apiKeys.environment,
            expiresAt: apiKeys.expiresAt,
            createdAt: apiKeys.createdAt,
          });
        const created = requiredResult(createdRows[0], "API key creation");
        await transaction.insert(auditLogs).values({
          organizationId: access.organizationId,
          projectId: params.projectId,
          actorUserId: user.id,
          action: "api_key.created",
          targetId: created.id,
          metadata: {
            prefix: generated.prefix,
            environment: input.environment,
          },
        });
        return created;
      });

      set.status = 201;
      return successEnvelope({ apiKey: { ...apiKey, key: generated.rawKey } });
    },
  )
  .post("/v1/api-keys/:apiKeyId/rotate", async ({ params, request, set }) => {
    requireSameOrigin(request);
    const user = await requireUser(database.db, request);
    const [current] = await database.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, params.apiKeyId), isNull(apiKeys.revokedAt)))
      .limit(1);
    if (!current) {
      throw new DomainError(
        "API_KEY_NOT_FOUND",
        "The active API key was not found.",
        404,
      );
    }
    const access = await requireProjectRole(
      database.db,
      user.id,
      current.projectId,
      "admin",
    );
    if (access.archivedAt) {
      throw new DomainError(
        "PROJECT_ARCHIVED",
        "Archived projects cannot rotate API keys.",
        409,
      );
    }

    const generated = createApiKey(current.environment, config.AUTH_SECRET);
    const replacement = await database.db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(apiKeys)
        .values({
          organizationId: current.organizationId,
          projectId: current.projectId,
          name: current.name,
          prefix: generated.prefix,
          keyHash: generated.keyHash,
          environment: current.environment,
          expiresAt: current.expiresAt,
          rotatedFromId: current.id,
          createdByUserId: user.id,
        })
        .returning({
          id: apiKeys.id,
          name: apiKeys.name,
          prefix: apiKeys.prefix,
          environment: apiKeys.environment,
          expiresAt: apiKeys.expiresAt,
          createdAt: apiKeys.createdAt,
        });
      const rotatedKey = requiredResult(created, "API key rotation");
      await transaction
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, current.id), isNull(apiKeys.revokedAt)));
      await transaction.insert(auditLogs).values({
        organizationId: current.organizationId,
        projectId: current.projectId,
        actorUserId: user.id,
        action: "api_key.rotated",
        targetId: rotatedKey.id,
        metadata: { rotatedFromId: current.id, prefix: generated.prefix },
      });
      return rotatedKey;
    });

    set.status = 201;
    return successEnvelope({
      apiKey: { ...replacement, key: generated.rawKey },
    });
  })
  .delete("/v1/api-keys/:apiKeyId", async ({ params, request }) => {
    requireSameOrigin(request);
    const user = await requireUser(database.db, request);
    const [current] = await database.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, params.apiKeyId), isNull(apiKeys.revokedAt)))
      .limit(1);
    if (!current) {
      throw new DomainError(
        "API_KEY_NOT_FOUND",
        "The active API key was not found.",
        404,
      );
    }
    await requireProjectRole(database.db, user.id, current.projectId, "admin");

    const [revoked] = await database.db.transaction(async (transaction) => {
      const updated = await transaction
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, current.id), isNull(apiKeys.revokedAt)))
        .returning({
          id: apiKeys.id,
          revokedAt: apiKeys.revokedAt,
        });
      await transaction.insert(auditLogs).values({
        organizationId: current.organizationId,
        projectId: current.projectId,
        actorUserId: user.id,
        action: "api_key.revoked",
        targetId: current.id,
        metadata: { prefix: current.prefix },
      });
      return updated;
    });

    return successEnvelope({ apiKey: revoked });
  })
  .listen({ port: 3001, hostname: "0.0.0.0" });

console.info(`AgentScope API is running at ${app.server?.url}`);

process.on("SIGTERM", async () => {
  await database.pool.end();
  process.exit(0);
});
