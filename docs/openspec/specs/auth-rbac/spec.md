# Auth RBAC Specification

**Status**: `ACCEPTED`

## Overview
The Auth RBAC domain defines user authentication, role-based authorization, and security middleware policies.

## Requirements

### Requirement: Role-Based Endpoint Protection
The system MUST enforce role-based access control across all administrative and media management API endpoints.

#### Scenario: Authenticate and Authorize API Access
<!-- tests: auth-api-endpoints.test.js, auth-middleware.test.js -->
Given a protected administrative endpoint,
When an incoming request presents valid authentication credentials,
Then the access control guard verifies permissions before granting access.

### Requirement: Guest Access Guarding
The security layer SHALL restrict unauthenticated guests to read-only preview actions and prevent privilege escalation.

#### Scenario: Guest Request Restriction
<!-- tests: engine.test.js -->
When a guest client attempts to trigger privileged actions,
Then the request is rejected with HTTP 403 Forbidden.
