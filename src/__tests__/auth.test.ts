import { Pool } from 'pg';
import { AuthenticationService } from '../services/AuthenticationService';
import { AuthorizationService } from '../services/AuthorizationService';
import { MFAService } from '../services/MFAService';
import { UserRepository } from '../repositories/UserRepository';
import { RoleRepository } from '../repositories/RoleRepository';

// Mock database connection
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

describe('Authentication and Authorization System', () => {
  describe('AuthenticationService', () => {
    let authService: AuthenticationService;

    beforeEach(() => {
      authService = new AuthenticationService(mockDb);
      jest.clearAllMocks();
    });

    test('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should verify password correctly', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('MFAService', () => {
    let mfaService: MFAService;

    beforeEach(() => {
      mfaService = new MFAService(mockDb);
      jest.clearAllMocks();
    });

    test('should generate valid TOTP token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const token = mfaService.getCurrentToken(secret);

      expect(token).toBeDefined();
      expect(token.length).toBe(6);
      expect(/^\d{6}$/.test(token)).toBe(true);
    });
  });

  describe('User Model', () => {
    test('should create user with correct properties', () => {
      const { User } = require('../models/User');
      
      const user = new User({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        mfaEnabled: false,
        accountLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(user.id).toBe('123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.isLocked()).toBe(false);
      expect(user.hasMFA()).toBe(false);
    });

    test('should convert to safe object without sensitive data', () => {
      const { User } = require('../models/User');
      
      const user = new User({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        mfaSecret: 'secret',
        mfaEnabled: true,
        accountLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const safeUser = user.toSafeObject();

      expect(safeUser.id).toBe('123');
      expect(safeUser.username).toBe('testuser');
      expect(safeUser.email).toBe('test@example.com');
      expect((safeUser as any).passwordHash).toBeUndefined();
      expect((safeUser as any).mfaSecret).toBeUndefined();
    });
  });

  describe('Role Model', () => {
    test('should check permissions correctly', () => {
      const { Role } = require('../models/Role');
      
      const role = new Role({
        id: '123',
        name: 'PENTESTER',
        permissions: [
          { resource: 'scans', actions: ['READ', 'EXECUTE'] },
          { resource: 'reports', actions: ['READ'] },
        ],
      });

      expect(role.hasPermission('scans', 'READ')).toBe(true);
      expect(role.hasPermission('scans', 'EXECUTE')).toBe(true);
      expect(role.hasPermission('scans', 'WRITE')).toBe(false);
      expect(role.hasPermission('reports', 'READ')).toBe(true);
      expect(role.hasPermission('reports', 'WRITE')).toBe(false);
    });

    test('should get resource actions correctly', () => {
      const { Role } = require('../models/Role');
      
      const role = new Role({
        id: '123',
        name: 'PENTESTER',
        permissions: [
          { resource: 'scans', actions: ['READ', 'EXECUTE'] },
        ],
      });

      const actions = role.getResourceActions('scans');
      expect(actions).toContain('READ');
      expect(actions).toContain('EXECUTE');
      expect(actions.length).toBe(2);
    });
  });
});
