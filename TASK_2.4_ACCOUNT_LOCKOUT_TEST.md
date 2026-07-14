# Task 2.4: Account Lockout Property-Based Test Implementation

## Overview
Implemented property-based tests for **Property 26: Account Lockout After Failed Login Attempts** which validates **Requirement 7.5**.

## Test File
`src/__tests__/account-lockout.property.test.ts`

## Properties Tested

### 1. Account Locks After MAX_FAILED_ATTEMPTS
**Property**: Account is locked after exactly 5 consecutive failed login attempts.

**Test Strategy**:
- Generate random usernames and passwords
- Simulate MAX_FAILED_ATTEMPTS (5) failed login attempts
- Verify account is locked after the 5th attempt
- Verify locked account rejects login even with correct credentials
- Runs: 50 iterations

### 2. Failed Attempts Counter Increments Correctly
**Property**: Failed attempts counter increments by 1 for each failed login.

**Test Strategy**:
- Generate random number of failed attempts (1 to 4)
- Simulate that many failed logins
- Verify counter increments correctly for each attempt
- Runs: 50 iterations

### 3. Successful Login Resets Counter
**Property**: Successful login resets failed attempts counter to 0.

**Test Strategy**:
- Start with some failed attempts (1 to 4)
- Perform successful login
- Verify counter is reset to 0
- Runs: 50 iterations

### 4. Locked Account Rejects Correct Credentials
**Property**: Locked account cannot login even with correct password.

**Test Strategy**:
- Create account in locked state
- Attempt login with correct credentials
- Verify login is rejected with "locked" error message
- Runs: 50 iterations

### 5. Lockout is Idempotent
**Property**: Failed attempts beyond MAX_FAILED_ATTEMPTS keep account locked.

**Test Strategy**:
- Start with already locked account
- Attempt additional failed logins (1 to 10 more)
- Verify account remains locked
- Runs: 50 iterations

## Implementation Details

### Constants Used
- `MAX_FAILED_ATTEMPTS = 5` (from AuthenticationService)

### Mocking Strategy
- Mocked PostgreSQL database queries
- Simulated user repository operations
- Tracked state changes (failed attempts, lock status)

### Test Coverage
- ✅ Account lockout after max attempts
- ✅ Failed attempts counter increment
- ✅ Counter reset on successful login
- ✅ Locked account rejection
- ✅ Idempotent lockout behavior

## Validation Against Requirements

**Requirement 7.5**: "WHEN تفشل محاولة تسجيل الدخول، THEN النظام SHALL يطبق سياسة قفل الحساب بعد عدد محدد من المحاولات"

✅ **Validated**: The test suite comprehensively validates that:
1. The system tracks failed login attempts
2. The account is locked after exactly 5 failed attempts
3. Locked accounts cannot login even with correct credentials
4. The system properly manages the failed attempts counter

## Running the Tests

### Using Docker Compose (Recommended)
```bash
docker-compose -f docker-compose.test.yml run --rm test npm test -- account-lockout.property.test.ts
```

### Using npm (if Node.js is installed)
```bash
npm test -- account-lockout.property.test.ts
```

### Using Jest directly
```bash
npx jest account-lockout.property.test.ts --run
```

## Notes
- All tests use fast-check for property-based testing
- Tests are isolated and use mocked database
- No actual database connections required for these tests
- Tests follow the same pattern as existing property tests in the codebase
