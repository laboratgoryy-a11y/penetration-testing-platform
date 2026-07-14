# Penetration Testing Platform API

## Overview

This is the REST API for the Penetration Testing Platform. The API provides endpoints for:

- Authentication and authorization
- Authorization document management
- Web application vulnerability scanning
- Phishing campaign management
- Network security testing
- Report generation
- Audit log access

## API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

Example: `http://localhost:3000/api-docs`

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

### Getting a Token

1. Login with username and password:
```bash
POST /api/v1/auth/login
{
  "username": "your-username",
  "password": "your-password"
}
```

2. Use the returned access token in subsequent requests

## Rate Limiting

The API implements rate limiting to prevent abuse:

- General API: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Scan operations: 10 requests per hour

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `AUTHORIZATION_ERROR` (403): Authorization document required
- `RATE_LIMIT_EXCEEDED` (429): Too many requests

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/mfa/enable` - Enable MFA
- `POST /api/v1/auth/mfa/verify` - Verify MFA token

### Authorizations

- `POST /api/v1/authorizations` - Upload authorization
- `GET /api/v1/authorizations` - List authorizations
- `GET /api/v1/authorizations/:id` - Get authorization
- `DELETE /api/v1/authorizations/:id` - Revoke authorization
- `POST /api/v1/authorizations/:id/validate` - Validate authorization
- `POST /api/v1/authorizations/:id/revoke` - Revoke authorization

### Web Scans

- `POST /api/v1/scans/web` - Start web scan
- `GET /api/v1/scans/web` - List web scans
- `GET /api/v1/scans/web/:id` - Get scan details
- `GET /api/v1/scans/web/:id/status` - Get scan status
- `POST /api/v1/scans/web/:id/stop` - Stop scan
- `GET /api/v1/scans/web/:id/results` - Get scan results
- `GET /api/v1/scans/web/:id/report` - Download report

### Phishing Campaigns

- `POST /api/v1/phishing/campaigns` - Create campaign
- `GET /api/v1/phishing/campaigns` - List campaigns
- `GET /api/v1/phishing/campaigns/:id` - Get campaign
- `PUT /api/v1/phishing/campaigns/:id` - Update campaign
- `DELETE /api/v1/phishing/campaigns/:id` - Delete campaign
- `POST /api/v1/phishing/campaigns/:id/launch` - Launch campaign
- `POST /api/v1/phishing/campaigns/:id/complete` - Complete campaign
- `GET /api/v1/phishing/campaigns/:id/results` - Get results
- `GET /api/v1/phishing/campaigns/:id/report` - Download report

### Network Testing

- `POST /api/v1/network/discover` - Discover access points
- `POST /api/v1/network/tests` - Start network test
- `GET /api/v1/network/tests` - List tests
- `GET /api/v1/network/tests/:id` - Get test details
- `GET /api/v1/network/tests/:id/status` - Get test status
- `POST /api/v1/network/tests/:id/stop` - Stop test
- `GET /api/v1/network/tests/:id/results` - Get results
- `GET /api/v1/network/tests/:id/report` - Download report

### Reports & Audit

- `GET /api/v1/reports` - List reports
- `GET /api/v1/reports/:id` - Get report
- `POST /api/v1/reports/compliance` - Generate compliance report
- `GET /api/v1/audit/logs` - Get audit logs (auditor/admin only)
- `GET /api/v1/audit/logs/export` - Export audit logs

## Example Usage

### Starting a Web Scan

```bash
curl -X POST http://localhost:3000/api/v1/scans/web \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "target": {
      "url": "https://example.com",
      "authorizationId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "config": {
      "vulnerabilityTypes": ["SQL_INJECTION", "XSS", "CSRF"],
      "maxDepth": 3,
      "maxRequests": 1000,
      "respectRobotsTxt": true
    }
  }'
```

### Creating a Phishing Campaign

```bash
curl -X POST http://localhost:3000/api/v1/phishing/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 Security Awareness Test",
    "authorizationId": "550e8400-e29b-41d4-a716-446655440000",
    "targets": [
      {
        "email": "employee@company.com",
        "name": "Employee Name",
        "department": "IT"
      }
    ],
    "emailTemplate": {
      "subject": "Urgent: Password Reset Required",
      "body": "Please click here to reset your password...",
      "senderName": "IT Support",
      "senderEmail": "support@company.com",
      "trackingEnabled": true,
      "disclaimer": "This is a security awareness test..."
    },
    "landingPage": {
      "pageType": "CREDENTIAL_HARVEST",
      "captureFields": ["username", "password"]
    },
    "schedule": {
      "startDate": "2024-01-20T09:00:00Z",
      "endDate": "2024-01-27T17:00:00Z",
      "sendingPattern": "STAGGERED"
    }
  }'
```

## Security Considerations

1. **Always use HTTPS in production**
2. **Store JWT secrets securely** (use environment variables)
3. **Implement token blacklisting** for logout (use Redis)
4. **Enable MFA** for privileged accounts
5. **Monitor rate limits** and adjust as needed
6. **Review audit logs** regularly
7. **Rotate API keys** periodically

## Legal Disclaimer

⚠️ **IMPORTANT**: This platform is designed exclusively for legal and ethical use in authorized penetration testing. You must obtain explicit written authorization before conducting any tests. Unauthorized use of these tools is illegal and subject to criminal prosecution.
