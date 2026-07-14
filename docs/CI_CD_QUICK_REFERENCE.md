# CI/CD Quick Reference Guide

## Quick Commands

### Trigger Workflows Manually

```bash
# Trigger deployment to staging
gh workflow run cd.yml -f environment=staging

# Trigger deployment to production
gh workflow run cd.yml -f environment=production

# Trigger release
gh workflow run release.yml -f version=1.0.0

# Trigger dependency updates
gh workflow run dependency-update.yml
```

### Create a Release

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# This will automatically:
# 1. Run all tests
# 2. Build the application
# 3. Create GitHub release
# 4. Deploy to production
# 5. Send notifications
```

### Check Workflow Status

```bash
# List all workflows
gh workflow list

# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Watch a running workflow
gh run watch
```

## Common Scenarios

### Scenario 1: Deploy to Staging

**Automatic:**
```bash
git checkout develop
git merge feature/my-feature
git push origin develop
git checkout main
git merge develop
git push origin main
```

**Manual:**
```bash
gh workflow run cd.yml -f environment=staging
```

### Scenario 2: Deploy to Production

**Automatic (Recommended):**
```bash
# Create a release tag
git tag v1.0.0
git push origin v1.0.0
```

**Manual:**
```bash
gh workflow run cd.yml -f environment=production
```

### Scenario 3: Rollback Production

```bash
# SSH to production server
ssh user@prod-server

# Run rollback script
cd /opt/pentest-platform
./scripts/rollback.sh
```

### Scenario 4: Fix Failing Tests

```bash
# Run tests locally
npm test

# Run specific test
npm test -- path/to/test.test.ts

# Run with coverage
npm run test:coverage

# Fix and push
git add .
git commit -m "fix: resolve failing tests"
git push
```

### Scenario 5: Update Dependencies

**Automatic (Recommended):**
- Dependabot creates PRs automatically
- Review and merge the PR

**Manual:**
```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm update package-name

# Run tests
npm test

# Commit and push
git add package.json package-lock.json
git commit -m "chore: update dependencies"
git push
```

## Environment Variables

### Required for CI/CD

```bash
# GitHub Secrets (set in repository settings)
DOCKER_REGISTRY=registry.example.com
DOCKER_USERNAME=username
DOCKER_PASSWORD=password
STAGING_HOST=staging.example.com
STAGING_USER=deploy
STAGING_SSH_KEY=<private-key>
PROD_HOST=prod.example.com
PROD_USER=deploy
PROD_SSH_KEY=<private-key>
SNYK_TOKEN=<snyk-token>
SONAR_TOKEN=<sonar-token>
SLACK_WEBHOOK=<webhook-url>
```

### Set Secrets via CLI

```bash
# Set a secret
gh secret set SECRET_NAME

# Set from file
gh secret set SSH_KEY < ~/.ssh/id_rsa

# List secrets
gh secret list

# Delete a secret
gh secret delete SECRET_NAME
```

## Workflow Files

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `.github/workflows/ci.yml` | Push, PR | Run tests, build, security scans |
| CD | `.github/workflows/cd.yml` | Push to main, tags | Deploy to staging/production |
| Code Quality | `.github/workflows/code-quality.yml` | Push, PR, schedule | Code analysis, quality checks |
| Performance | `.github/workflows/performance.yml` | Push, schedule | Load testing, benchmarks |
| Release | `.github/workflows/release.yml` | Tags | Create releases, publish |
| Dependencies | `.github/workflows/dependency-update.yml` | Schedule | Update dependencies |

## Monitoring

### View Logs

```bash
# View workflow logs
gh run view <run-id> --log

# View specific job logs
gh run view <run-id> --log --job=<job-id>

# Download logs
gh run download <run-id>
```

### Check Deployment Status

```bash
# Staging
curl https://staging.pentest-platform.example.com/health

# Production
curl https://pentest-platform.example.com/health
```

### View Metrics

- **Code Coverage:** https://codecov.io/gh/your-org/pentest-platform
- **Code Quality:** https://sonarcloud.io/dashboard?id=pentest-platform
- **Security:** GitHub Security tab

## Troubleshooting

### Build Fails

1. Check the error in GitHub Actions logs
2. Run build locally: `npm run build`
3. Fix TypeScript errors
4. Push fix

### Tests Fail

1. Run tests locally: `npm test`
2. Check test logs in GitHub Actions
3. Fix failing tests
4. Push fix

### Deployment Fails

1. Check deployment logs in GitHub Actions
2. SSH to server and check logs: `docker-compose logs`
3. Check if services are running: `docker-compose ps`
4. Rollback if needed: `./scripts/rollback.sh`

### Security Scan Fails

1. Check vulnerability details in GitHub Security
2. Update vulnerable dependencies: `npm update`
3. Apply security patches
4. Push fix

## Best Practices

### Commit Messages

```bash
# Good commit messages
git commit -m "feat: add user authentication"
git commit -m "fix: resolve database connection issue"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for auth service"
git commit -m "chore: update dependencies"
git commit -m "ci: improve build performance"
```

### Branch Strategy

```
main (production)
  ↑
develop (integration)
  ↑
feature/my-feature (development)
```

### Pull Request Checklist

- [ ] All tests pass
- [ ] Code coverage maintained or improved
- [ ] Security scans pass
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR description is clear
- [ ] At least one approval

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped in package.json
- [ ] Tag created and pushed
- [ ] Release notes prepared

## Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Docker Documentation](https://docs.docker.com/)
- [Full CI/CD Documentation](./CI_CD_PIPELINE.md)

## Support

For help with CI/CD:
1. Check this guide
2. Review [full documentation](./CI_CD_PIPELINE.md)
3. Check GitHub Actions logs
4. Contact DevOps team
5. Create an issue
