# CI/CD Pipeline Documentation

## Overview

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Penetration Testing Platform. The pipeline is implemented using GitHub Actions and provides automated testing, security scanning, and deployment capabilities.

## Pipeline Architecture

### Workflows

The CI/CD pipeline consists of several workflows:

1. **CI (Continuous Integration)** - `.github/workflows/ci.yml`
2. **CD (Continuous Deployment)** - `.github/workflows/cd.yml`
3. **Code Quality** - `.github/workflows/code-quality.yml`
4. **Performance Testing** - `.github/workflows/performance.yml`
5. **Release Management** - `.github/workflows/release.yml`
6. **Dependency Updates** - `.github/workflows/dependency-update.yml`

## Continuous Integration (CI)

### Triggers

- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop` branches

### Jobs

#### 1. Lint
- Runs ESLint on TypeScript code
- Checks code formatting with Prettier
- Fails if linting errors are found

#### 2. Test
- Runs unit tests with Jest
- Generates code coverage reports
- Uploads coverage to Codecov
- Requires PostgreSQL and Redis services

#### 3. Build
- Compiles TypeScript to JavaScript
- Validates that the build succeeds
- Archives build artifacts

#### 4. Security Scan
- Runs `npm audit` for dependency vulnerabilities
- Performs Snyk security scanning
- Runs Trivy vulnerability scanner
- Uploads results to GitHub Security

#### 5. Docker Build
- Builds Docker image
- Caches layers for faster builds
- Uploads image as artifact

#### 6. Integration Tests
- Loads Docker image
- Runs integration tests in Docker Compose environment
- Validates end-to-end functionality

## Continuous Deployment (CD)

### Staging Deployment

**Trigger:** Push to `main` branch or manual dispatch

**Steps:**
1. Build application
2. Build and push Docker image with `staging` tag
3. SSH to staging server
4. Pull latest image
5. Run database migrations
6. Restart services
7. Run smoke tests
8. Send Slack notification

**Environment:** `staging`
**URL:** https://staging.pentest-platform.example.com

### Production Deployment

**Trigger:** Push tag matching `v*.*.*` or manual dispatch

**Steps:**
1. Run all tests
2. Build application
3. Create database backup
4. Build and push Docker image with version tag
5. SSH to production server
6. Pull latest image
7. Run database migrations
8. Restart services
9. Run smoke tests
10. Create GitHub release
11. Send Slack notification
12. Rollback on failure

**Environment:** `production`
**URL:** https://pentest-platform.example.com

## Code Quality

### SonarCloud Analysis
- Analyzes code quality and security
- Tracks code coverage
- Identifies code smells and bugs
- Runs on push and pull requests

### CodeQL Analysis
- Performs semantic code analysis
- Detects security vulnerabilities
- Runs security and quality queries
- Uploads results to GitHub Security

### Complexity Check
- Analyzes code complexity
- Generates complexity reports
- Helps identify refactoring opportunities

### Type Coverage
- Checks TypeScript type coverage
- Ensures at least 95% type coverage
- Validates type safety

## Performance Testing

### Load Testing
- Uses k6 for load testing
- Tests API endpoints under load
- Measures response times and throughput
- Comments results on pull requests

### Benchmark Tests
- Runs performance benchmarks
- Tracks performance over time
- Stores results for comparison

## Release Management

### Creating a Release

**Automatic:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Manual:**
- Go to Actions → Release Management
- Click "Run workflow"
- Enter version number

### Release Process
1. Run all tests
2. Build application
3. Generate changelog
4. Create GitHub release
5. Build and push Docker images
6. Update documentation
7. Notify team via Slack

## Dependency Management

### Dependabot
- Automatically checks for dependency updates
- Creates pull requests for updates
- Runs weekly on Monday, Tuesday, Wednesday
- Handles npm, Docker, and GitHub Actions dependencies

### Automated Updates
- Runs weekly on Monday at 9:00 AM UTC
- Updates dependencies to latest compatible versions
- Runs tests to verify updates
- Creates pull request if updates available

## Required Secrets

Configure the following secrets in GitHub repository settings:

### Docker Registry
- `DOCKER_REGISTRY` - Docker registry URL
- `DOCKER_USERNAME` - Docker registry username
- `DOCKER_PASSWORD` - Docker registry password

### Staging Environment
- `STAGING_HOST` - Staging server hostname
- `STAGING_USER` - SSH username
- `STAGING_SSH_KEY` - SSH private key

### Production Environment
- `PROD_HOST` - Production server hostname
- `PROD_USER` - SSH username
- `PROD_SSH_KEY` - SSH private key

### Security Scanning
- `SNYK_TOKEN` - Snyk API token
- `SONAR_TOKEN` - SonarCloud token

### Notifications
- `SLACK_WEBHOOK` - Slack webhook URL

### Optional
- `NPM_TOKEN` - npm registry token (if publishing)
- `CODECOV_TOKEN` - Codecov token (optional)

## Environment Variables

### CI Environment
```bash
DATABASE_URL=postgresql://testuser:testpass@localhost:5432/pentest_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-key-for-ci
ENCRYPTION_KEY=test-encryption-key-32-chars!!
NODE_ENV=test
```

## Deployment Scripts

### Backup Database
```bash
./scripts/backup-database.sh
```
- Creates PostgreSQL backup
- Compresses backup file
- Removes old backups (30+ days)
- Stores in `/opt/backups/pentest-platform`

### Rollback
```bash
./scripts/rollback.sh
```
- Stops current containers
- Restores database from latest backup
- Reverts to previous Docker image
- Restarts services
- Performs health check

## Monitoring and Notifications

### Slack Notifications
- Deployment status (success/failure)
- Release announcements
- Security alerts

### GitHub Notifications
- Pull request comments with test results
- Security vulnerability alerts
- Dependency update notifications

## Best Practices

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Urgent fixes

### Commit Messages
Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `chore:` - Maintenance
- `ci:` - CI/CD changes
- `perf:` - Performance improvements
- `refactor:` - Code refactoring

### Pull Requests
- All tests must pass
- Code coverage must not decrease
- Security scans must pass
- At least one approval required
- Squash and merge to main

### Versioning
Follow Semantic Versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- `1.0.0` - Initial release
- `1.1.0` - New features
- `1.1.1` - Bug fixes

## Troubleshooting

### Build Failures
1. Check build logs in GitHub Actions
2. Verify all dependencies are installed
3. Ensure TypeScript compiles without errors
4. Check for linting errors

### Test Failures
1. Review test logs
2. Check database connection
3. Verify environment variables
4. Run tests locally to reproduce

### Deployment Failures
1. Check deployment logs
2. Verify server connectivity
3. Check Docker image availability
4. Review rollback logs if automatic rollback occurred

### Security Scan Failures
1. Review vulnerability details
2. Update affected dependencies
3. Apply security patches
4. Re-run security scans

## Maintenance

### Weekly Tasks
- Review Dependabot pull requests
- Check security scan results
- Monitor performance metrics
- Review code quality reports

### Monthly Tasks
- Review and update CI/CD workflows
- Audit secrets and credentials
- Review backup retention policy
- Update documentation

### Quarterly Tasks
- Review and optimize pipeline performance
- Update deployment strategies
- Conduct security audit
- Review and update monitoring

## Support

For issues or questions about the CI/CD pipeline:
1. Check this documentation
2. Review GitHub Actions logs
3. Contact DevOps team
4. Create an issue in the repository

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Jest Documentation](https://jestjs.io/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Snyk Documentation](https://docs.snyk.io/)
