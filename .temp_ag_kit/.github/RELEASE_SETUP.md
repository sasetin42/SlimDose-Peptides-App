# Release Setup

The workflow files are configured for a secure release baseline, but the following repository settings must be enabled by a maintainer.

## Branch protection

Protect `main` and require these checks before merge:

- `Toolkit validation`
- `CLI tests and package validation`
- `Web lint, typecheck, build, and audit`
- `dependency-review`

Require pull requests, dismiss stale approvals after new commits, and block force pushes and branch deletion.

## npm Trusted Publishing

1. In npm package settings for `@vudovn/ag-kit`, configure GitHub Actions as a trusted publisher.
2. Set the repository and workflow to `.github/workflows/publish.yml`.
3. Create a GitHub Environment named `npm` and optionally require approval.
4. Remove the legacy `NPM_TOKEN` repository secret after a successful OIDC release.

The publish workflow requires `id-token: write` and does not consume a long-lived npm token.

## Production deployment

Create a GitHub Environment named `production` and store:

- `DOKPLOY_TOKEN` (Dokploy API Token, e.g., `oxhdrmbBpuleom...`)
- `DOKPLOY_URL` (Dokploy dashboard URL, e.g., `http://74.208.5.225/`)
- `DOKPLOY_APPLICATION_ID` (Dokploy application ID, e.g., `5blqIiB_TIHY2ZPzDDIK-`)

## GitHub security settings

Enable:

- private vulnerability reporting,
- Dependabot alerts and security updates,
- secret scanning and push protection when available,
- CodeQL default setup for JavaScript/TypeScript and Python.
