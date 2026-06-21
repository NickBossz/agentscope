import type { OrganizationRole } from "./types";

const roleWeight: Record<OrganizationRole, number> = {
  viewer: 0,
  developer: 1,
  admin: 2,
  owner: 3,
};

export function hasMinimumRole(
  currentRole: OrganizationRole,
  requiredRole: OrganizationRole,
): boolean {
  return roleWeight[currentRole] >= roleWeight[requiredRole];
}
