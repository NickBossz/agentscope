import type { Database } from "@agentscope/database";
import { organizationMembers, projects } from "@agentscope/database";
import {
  DomainError,
  hasMinimumRole,
  type OrganizationRole,
} from "@agentscope/shared";
import { and, eq } from "drizzle-orm";

export async function requireOrganizationRole(
  database: Database["db"],
  userId: string,
  organizationId: string,
  minimumRole: OrganizationRole,
): Promise<OrganizationRole> {
  const [membership] = await database
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership || !hasMinimumRole(membership.role, minimumRole)) {
    throw new DomainError(
      "INSUFFICIENT_ORGANIZATION_ACCESS",
      "You do not have permission to access this organization.",
      403,
    );
  }

  return membership.role;
}

export async function requireProjectRole(
  database: Database["db"],
  userId: string,
  projectId: string,
  minimumRole: OrganizationRole,
): Promise<{ organizationId: string; archivedAt: Date | null }> {
  const [result] = await database
    .select({
      organizationId: projects.organizationId,
      archivedAt: projects.archivedAt,
      role: organizationMembers.role,
    })
    .from(projects)
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, projects.organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!result || !hasMinimumRole(result.role, minimumRole)) {
    throw new DomainError(
      "INSUFFICIENT_PROJECT_ACCESS",
      "You do not have permission to access this project.",
      403,
    );
  }

  return {
    organizationId: result.organizationId,
    archivedAt: result.archivedAt,
  };
}
