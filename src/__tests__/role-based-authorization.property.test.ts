import * as fc from 'fast-check';
import { Pool } from 'pg';
import { AuthorizationService } from '../services/AuthorizationService';
import { UserRepository } from '../repositories/UserRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { Role } from '../models/Role';
import { Action, Permission } from '../types';

/**
 * Feature: penetration-testing-platform
 * Property 25: التفويض بناءً على الأدوار
 * 
 * **يتحقق من: المتطلبات 7.3**
 * 
 * لأي مستخدم مصادق، يجب على النظام منح الوصول إلى الموارد والعمليات
 * بناءً على الأدوار والصلاحيات المخصصة له فقط
 * 
 * This property verifies that:
 * 1. Users with appropriate role permissions can access resources
 * 2. Users without appropriate role permissions cannot access resources
 * 3. Multiple roles combine permissions correctly
 * 4. Permission checks are based on both resource and action
 * 5. Users with no roles have no permissions
 * 
 * To run this test:
 *   npm test -- role-based-authorization.property.test.ts --run
 * 
 * Or run all tests:
 *   npm test
 */

describe('Property 25: Role-Based Authorization', () => {
  let mockDb: Pool;
  let authService: AuthorizationService;
  let userRepository: UserRepository;
  let roleRepository: RoleRepository;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      query: jest.fn(),
    } as unknown as Pool;

    authService = new AuthorizationService(mockDb);
    userRepository = new UserRepository(mockDb);
    roleRepository = new RoleRepository(mockDb);
  });

  /**
   * Arbitrary generators for property-based testing
   */
  const arbitraryAction = (): fc.Arbitrary<Action> =>
    fc.constantFrom<Action>('READ', 'WRITE', 'DELETE', 'EXECUTE');

  const arbitraryResource = (): fc.Arbitrary<string> =>
    fc.constantFrom(
      'scans',
      'phishing',
      'network',
      'authorizations',
      'audit',
      'users',
      'reports'
    );

  const arbitraryPermission = (): fc.Arbitrary<Permission> =>
    fc.record({
      resource: arbitraryResource(),
      actions: fc.array(arbitraryAction(), { minLength: 1, maxLength: 4 }),
    });

  const arbitraryRole = (): fc.Arbitrary<Role> =>
    fc.record({
      id: fc.uuid(),
      name: fc.constantFrom('ADMIN', 'PENTESTER', 'AUDITOR', 'VIEWER'),
      description: fc.option(fc.string(), { nil: undefined }),
      permissions: fc.array(arbitraryPermission(), { minLength: 0, maxLength: 5 }),
      createdAt: fc.date(),
    }).map((data) => new Role(data));

  /**
   * Property: Users with role that has permission can access resource
   */
  test('property: users with required permission can access resource', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryResource(), // resource
        arbitraryAction(), // action
        fc.array(arbitraryPermission(), { minLength: 1, maxLength: 3 }), // role permissions
        async (userId, resource, action, rolePermissions) => {
          // Ensure at least one permission grants access to the resource/action
          const grantingPermission: Permission = {
            resource,
            actions: [action],
          };
          const allPermissions = [grantingPermission, ...rolePermissions];

          const role = new Role({
            id: 'test-role-id',
            name: 'TEST_ROLE',
            permissions: allPermissions,
            createdAt: new Date(),
          });

          // Mock getUserRoles to return role with permission
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              return Promise.resolve({
                rows: allPermissions.flatMap((p) =>
                  p.actions.map((a) => ({
                    resource: p.resource,
                    action: a,
                  }))
                ),
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check permission
          const result = await authService.checkPermission(userId, resource, action);

          // Property: User should have access
          expect(result.allowed).toBe(true);
          expect(result.reason).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Users without required permission cannot access resource
   */
  test('property: users without required permission cannot access resource', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryResource(), // requested resource
        arbitraryAction(), // requested action
        fc.array(arbitraryPermission(), { minLength: 1, maxLength: 3 }), // role permissions
        async (userId, requestedResource, requestedAction, rolePermissions) => {
          // Ensure none of the permissions grant access to requested resource/action
          const filteredPermissions = rolePermissions.filter(
            (p) => p.resource !== requestedResource || !p.actions.includes(requestedAction)
          );

          // Skip if we accidentally created a permission that grants access
          fc.pre(
            !filteredPermissions.some(
              (p) => p.resource === requestedResource && p.actions.includes(requestedAction)
            )
          );

          const role = new Role({
            id: 'test-role-id',
            name: 'TEST_ROLE',
            permissions: filteredPermissions,
            createdAt: new Date(),
          });

          // Mock getUserRoles to return role without required permission
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              return Promise.resolve({
                rows: filteredPermissions.flatMap((p) =>
                  p.actions.map((a) => ({
                    resource: p.resource,
                    action: a,
                  }))
                ),
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check permission
          const result = await authService.checkPermission(
            userId,
            requestedResource,
            requestedAction
          );

          // Property: User should NOT have access
          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
          expect(result.reason).toContain('does not have');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Users with no roles have no permissions
   */
  test('property: users with no roles cannot access any resource', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryResource(), // resource
        arbitraryAction(), // action
        async (userId, resource, action) => {
          // Mock getUserRoles to return empty array (no roles)
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles')) {
              return Promise.resolve({ rows: [] });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check permission
          const result = await authService.checkPermission(userId, resource, action);

          // Property: User should NOT have access
          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
          expect(result.reason).toContain('no roles');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple roles combine permissions correctly
   */
  test('property: multiple roles combine permissions (union)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryResource(), // resource
        arbitraryAction(), // action
        fc.array(arbitraryRole(), { minLength: 2, maxLength: 4 }), // multiple roles
        async (userId, resource, action, roles) => {
          // Check if any role has the permission
          const hasPermission = roles.some((role) =>
            role.permissions.some(
              (p) => p.resource === resource && p.actions.includes(action)
            )
          );

          // Mock getUserRoles to return multiple roles
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: roles.map((role) => ({
                  id: role.id,
                  name: role.name,
                  description: role.description,
                  created_at: role.createdAt,
                })),
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              // Return all permissions from all roles
              const allPermissions = roles.flatMap((role) =>
                role.permissions.flatMap((p) =>
                  p.actions.map((a) => ({
                    resource: p.resource,
                    action: a,
                  }))
                )
              );
              return Promise.resolve({ rows: allPermissions });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check permission
          const result = await authService.checkPermission(userId, resource, action);

          // Property: Access should match whether any role has permission
          expect(result.allowed).toBe(hasPermission);

          if (hasPermission) {
            expect(result.reason).toBeUndefined();
          } else {
            expect(result.reason).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Permission check is specific to both resource AND action
   */
  test('property: permission requires both matching resource and action', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryResource(), // resource
        arbitraryAction(), // action1
        arbitraryAction(), // action2 (different action)
        async (userId, resource, action1, action2) => {
          // Ensure actions are different
          fc.pre(action1 !== action2);

          // Create role with permission for resource + action1 only
          const role = new Role({
            id: 'test-role-id',
            name: 'TEST_ROLE',
            permissions: [
              {
                resource,
                actions: [action1], // Only action1, not action2
              },
            ],
            createdAt: new Date(),
          });

          // Mock getUserRoles
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              return Promise.resolve({
                rows: [
                  {
                    resource,
                    action: action1,
                  },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check permission for action1 (should succeed)
          const result1 = await authService.checkPermission(userId, resource, action1);
          expect(result1.allowed).toBe(true);

          // Check permission for action2 (should fail)
          const result2 = await authService.checkPermission(userId, resource, action2);
          expect(result2.allowed).toBe(false);
          expect(result2.reason).toContain('does not have');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Permission check is specific to resource
   */
  test('property: permission for one resource does not grant access to another', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryResource(), // resource1
        arbitraryResource(), // resource2
        arbitraryAction(), // action
        async (userId, resource1, resource2, action) => {
          // Ensure resources are different
          fc.pre(resource1 !== resource2);

          // Create role with permission for resource1 only
          const role = new Role({
            id: 'test-role-id',
            name: 'TEST_ROLE',
            permissions: [
              {
                resource: resource1,
                actions: [action],
              },
            ],
            createdAt: new Date(),
          });

          // Mock getUserRoles
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              return Promise.resolve({
                rows: [
                  {
                    resource: resource1,
                    action,
                  },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check permission for resource1 (should succeed)
          const result1 = await authService.checkPermission(userId, resource1, action);
          expect(result1.allowed).toBe(true);

          // Check permission for resource2 (should fail)
          const result2 = await authService.checkPermission(userId, resource2, action);
          expect(result2.allowed).toBe(false);
          expect(result2.reason).toContain('does not have');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: checkAnyPermission succeeds if user has at least one permission
   */
  test('property: checkAnyPermission grants access if any permission matches', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.array(
          fc.record({
            resource: arbitraryResource(),
            action: arbitraryAction(),
          }),
          { minLength: 2, maxLength: 5 }
        ), // requested permissions
        fc.integer({ min: 0, max: 4 }), // index of permission to grant
        async (userId, requestedPermissions, grantedIndex) => {
          // Ensure index is valid
          fc.pre(grantedIndex < requestedPermissions.length);

          // Grant only one of the requested permissions
          const grantedPermission = requestedPermissions[grantedIndex];

          const role = new Role({
            id: 'test-role-id',
            name: 'TEST_ROLE',
            permissions: [
              {
                resource: grantedPermission.resource,
                actions: [grantedPermission.action],
              },
            ],
            createdAt: new Date(),
          });

          // Mock getUserRoles
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              return Promise.resolve({
                rows: [
                  {
                    resource: grantedPermission.resource,
                    action: grantedPermission.action,
                  },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check any permission
          const result = await authService.checkAnyPermission(userId, requestedPermissions);

          // Property: Should succeed because one permission is granted
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: checkAllPermissions succeeds only if user has all permissions
   */
  test('property: checkAllPermissions requires all permissions to be granted', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.array(
          fc.record({
            resource: arbitraryResource(),
            action: arbitraryAction(),
          }),
          { minLength: 2, maxLength: 4 }
        ), // requested permissions
        fc.boolean(), // whether to grant all permissions
        async (userId, requestedPermissions, grantAll) => {
          // Create role with either all or some permissions
          const grantedPermissions = grantAll
            ? requestedPermissions
            : requestedPermissions.slice(0, -1); // Grant all except last

          const role = new Role({
            id: 'test-role-id',
            name: 'TEST_ROLE',
            permissions: grantedPermissions.map((p) => ({
              resource: p.resource,
              actions: [p.action],
            })),
            createdAt: new Date(),
          });

          // Mock getUserRoles
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              return Promise.resolve({
                rows: grantedPermissions.map((p) => ({
                  resource: p.resource,
                  action: p.action,
                })),
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check all permissions
          const result = await authService.checkAllPermissions(userId, requestedPermissions);

          // Property: Should succeed only if all permissions are granted
          expect(result.allowed).toBe(grantAll);

          if (!grantAll) {
            expect(result.reason).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role-specific helper methods work correctly
   */
  test('property: role-specific checks match actual role assignments', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.constantFrom('ADMIN', 'PENTESTER', 'AUDITOR', 'VIEWER'), // roleName
        async (userId, roleName) => {
          const role = new Role({
            id: 'test-role-id',
            name: roleName,
            permissions: [],
            createdAt: new Date(),
          });

          // Mock getUserRoles
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions')) {
              return Promise.resolve({ rows: [] });
            }
            return Promise.resolve({ rows: [] });
          });

          // Check role-specific methods
          const isAdmin = await authService.isAdmin(userId);
          const isPentester = await authService.isPentester(userId);
          const isAuditor = await authService.isAuditor(userId);

          // Property: Only the matching role check should return true
          expect(isAdmin).toBe(roleName === 'ADMIN');
          expect(isPentester).toBe(roleName === 'PENTESTER');
          expect(isAuditor).toBe(roleName === 'AUDITOR');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Authorization is consistent across multiple checks
   */
  test('property: repeated permission checks return consistent results', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryResource(), // resource
        arbitraryAction(), // action
        arbitraryRole(), // role
        fc.integer({ min: 2, max: 5 }), // number of checks
        async (userId, resource, action, role, numChecks) => {
          // Mock getUserRoles
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('user_roles') && query.includes('JOIN roles')) {
              return Promise.resolve({
                rows: [
                  {
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    created_at: role.createdAt,
                  },
                ],
              });
            }
            if (query.includes('role_permissions') && query.includes('JOIN permissions')) {
              return Promise.resolve({
                rows: role.permissions.flatMap((p) =>
                  p.actions.map((a) => ({
                    resource: p.resource,
                    action: a,
                  }))
                ),
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Perform multiple checks
          const results = [];
          for (let i = 0; i < numChecks; i++) {
            const result = await authService.checkPermission(userId, resource, action);
            results.push(result.allowed);
          }

          // Property: All results should be identical
          const firstResult = results[0];
          expect(results.every((r) => r === firstResult)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});
