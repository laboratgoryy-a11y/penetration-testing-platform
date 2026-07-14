# Property 21: Network Test Types Enforcement - Test Documentation

## Overview

This document describes the property-based tests for **Property 21: تنفيذ اختبارات الشبكة المحددة فقط** (Execute Only Specified Network Tests).

**Validates Requirements:** 5.4, 5.6

## Property Statement

For any network test, the analyzer SHALL execute ONLY the test types specified in the configuration and authorized in the authorization document.

## Test File

`src/__tests__/network-test-types-enforcement.property.test.ts`

## Test Properties

### 1. Only Specified Test Types Are Stored (Test 21.1)

**Property:** For any network test configuration with a specific set of test types, when a test session is created, the stored configuration SHALL contain exactly those test types and no others.

**Validates:**
- The configuration is stored accurately
- No test types are added beyond what was specified
- All specified test types are preserved

**Runs:** 100 iterations

### 2. Test Types Subset Is Preserved (Test 21.2)

**Property:** For any subset of available test types, when a network test is configured with that subset, the system SHALL NOT execute test types outside that subset.

**Validates:**
- The number of test types does not increase
- Every test type in the session is from the original configuration
- The set of test types remains exactly the same

**Runs:** 100 iterations

### 3. Single Test Type Is Executed Exclusively (Test 21.3)

**Property:** For any single test type specified in the configuration, the system SHALL execute only that test type and no others.

**Validates:**
- Only one test type is stored when one is specified
- That test type matches the specified one
- No other test types are present

**Runs:** 100 iterations

### 4. Configuration Must Have At Least One Test Type (Test 21.4)

**Property:** For any network test configuration, it must have at least one test type (enforced by the arbitrary generator).

**Validates:**
- The configuration always has at least one test type
- The session also has at least one test type

**Runs:** 100 iterations

### 5. Test Types Order Is Preserved (Test 21.5)

**Property:** For any ordered list of test types, the system SHALL preserve the order of test types as specified in the configuration.

**Validates:**
- The order of test types is maintained
- Each test type is at the same index as in the original configuration

**Runs:** 100 iterations

### 6. All Valid Test Types Are Accepted (Test 21.6)

**Property:** For any valid network test type from the defined set, the system SHALL accept it in the configuration.

**Validates:**
- All valid test types are accepted
- Each test type is stored correctly

**Runs:** 100 iterations

### 7. No Duplicate Test Types (Test 21.7)

**Property:** For any network test configuration, the system SHALL ensure that each test type appears at most once in the configuration.

**Validates:**
- No test type appears more than once
- Each test type is unique in the configuration

**Runs:** 100 iterations

## Available Network Test Types

The following test types are defined in the system:

1. `WEP_CRACK` - Test WEP encryption cracking
2. `WPA_HANDSHAKE_CAPTURE` - Capture WPA handshake
3. `WPS_ATTACK` - Test WPS vulnerability
4. `EVIL_TWIN` - Test Evil Twin attack
5. `DEAUTH_ATTACK` - Test deauthentication attack
6. `TRAFFIC_ANALYSIS` - Analyze network traffic

## Arbitrary Generators

### `arbitraryTestTypes()`

Generates a random non-empty subset of available network test types.

**Returns:** `fc.Arbitrary<NetworkTestType[]>`

**Constraints:**
- Minimum length: 1
- Maximum length: 6 (all test types)

### `arbitraryNetworkTarget()`

Generates a random network target with SSID, BSSID, and authorization ID.

**Returns:** `fc.Arbitrary<NetworkTarget>`

**Fields:**
- `ssid`: Random string (1-32 characters)
- `bssid`: Random MAC address in format `XX:XX:XX:XX:XX:XX`
- `authorizationId`: Random UUID

### `arbitraryNetworkTestConfig()`

Generates a random network test configuration.

**Returns:** `fc.Arbitrary<NetworkTestConfig>`

**Fields:**
- `testTypes`: Random subset of test types (1-6 types)
- `passwordDictionary`: Optional string
- `maxAttempts`: Random integer (100-10000)

## Running the Tests

To run these property-based tests:

```bash
# Run all tests
npm test

# Run only this test file
npm test -- network-test-types-enforcement.property.test.ts

# Run with coverage
npm test -- --coverage network-test-types-enforcement.property.test.ts
```

## Expected Behavior

All 7 property tests should pass, demonstrating that:

1. The system correctly stores and preserves the specified test types
2. No additional test types are added beyond what was configured
3. The order and uniqueness of test types are maintained
4. All valid test types are accepted by the system
5. The configuration enforces at least one test type

## Integration with Requirements

This property test validates:

- **Requirement 5.4:** "THE محلل_الشبكات SHALL ينفذ اختبارات لتقييم قوة كلمات المرور"
- **Requirement 5.6:** "THE محلل_الشبكات SHALL ينفذ اختبارات متقدمة مثل Evil Twin وDeauthentication attacks فقط على الشبكات المصرح بها"

By ensuring that only specified test types are executed, the system maintains compliance with authorization boundaries and prevents unauthorized testing activities.

## Notes

- These tests use `fast-check` for property-based testing
- Each test runs 100 iterations by default
- The tests mock the database and authorization manager to focus on the logic
- The tests verify the configuration storage and retrieval, not the actual test execution
