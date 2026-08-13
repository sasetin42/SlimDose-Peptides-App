# Security Policy

## Supported versions

AG Kit follows calendar versioning. Security fixes are provided for the latest published version. Users should update the CLI and toolkit before reporting an issue that has already been fixed in a newer release.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting or Security Advisory flow for this repository. Do not disclose suspected secrets, exploitable paths, or proof-of-concept payloads in a public issue.

Include:

- affected AG Kit and CLI versions,
- operating system and Node/Python versions,
- the affected agent, skill, workflow, CLI command, or release workflow,
- reproduction steps with sensitive values removed,
- expected impact and any known mitigations.

## Release security baseline

The repository expects:

- immutable commit-SHA references for GitHub Actions,
- least-privilege `GITHUB_TOKEN` permissions,
- protected `production` and `npm` environments,
- npm Trusted Publishing through OIDC rather than a long-lived npm token,
- Secure OIDC and API-token authentication for CLI and Dokploy deployments,
- dependency review, production dependency audits, toolkit validation, CLI tests, and web build checks before release.

## Local update safety

`ag-kit update` uses a managed-file manifest and merge strategy by default. Local modifications are never silently overwritten. Conflicts produce an incoming copy and JSON report, while pre-update backups support rollback.
