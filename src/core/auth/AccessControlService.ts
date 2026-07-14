import { Pool } from 'pg';
import { Action } from '../types';

interface RoleRow {
  name: string;
}

interface PermissionRow {
  allowed: boolean;
}

export class AccessControlService {
  constructor(private readonly db: Pool) {}

  async getUserRoles(userId: string): Promise<string[]> {
    const result = await this.db.query<RoleRow>(
      `SELECT r.name
       FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1
       ORDER BY r.name ASC`,
      [userId]
    );

    return result.rows.map((row) => row.name);
  }

  async hasRole(userId: string, roles: string[]): Promise<boolean> {
    const normalizedRoles = roles.map((role) => role.toUpperCase());
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some((role) => normalizedRoles.includes(role.toUpperCase()));
  }

  async checkPermission(
    userId: string,
    resource: string,
    action: Action
  ): Promise<boolean> {
    const result = await this.db.query<PermissionRow>(
      `SELECT EXISTS (
         SELECT 1
         FROM user_roles ur
         INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
         INNER JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = $1
           AND LOWER(p.resource) = LOWER($2)
           AND UPPER(p.action) = UPPER($3)
       ) AS allowed`,
      [userId, resource, action]
    );

    return result.rows[0]?.allowed ?? false;
  }
}
