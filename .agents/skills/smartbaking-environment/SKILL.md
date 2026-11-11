---
name: smartbaking-environment
description: Set up or maintain SmartBaking Windows development dependencies, Laravel and Python services, configuration, reproducible installs, and deployment preparation.
---

# SmartBaking environment and DevOps

Read the repository's root README, `docs/team-workflow.md`, package manifests, and scripts before changing setup. Keep the current milestone explicit: local development infrastructure does not imply a deployed or complete business application.

## Dependency ownership

- Laravel/PHP dependencies belong to `apps/web/composer.json` and its lockfile.
- Frontend dependencies belong to `apps/web/package.json` and its lockfile.
- Forecasting dependencies belong to `services/forecasting/pyproject.toml` and `uv.lock`, inside the service virtual environment.
- Commit appropriate lockfiles. Avoid mixing npm/pnpm/yarn or pip/uv updates in the same environment without a concrete migration reason.

Check installed runtime versions and the manifests before installing. Prefer project-local or clearly documented runtimes to modifying the user's global PATH. Pin an intentional supported range and confirm package compatibility rather than using unqualified latest versions.

## Local operation

Use PowerShell-native scripts and literal paths on Windows. Verify the target is inside the intended workspace before destructive filesystem operations. Background helpers should be hidden, have attributable logs/process ownership, and avoid killing unrelated processes just because a port is busy.

Keep `.env` files and private tokens untracked. Provide safe `.env.example` values, distinguish public browser configuration from server secrets, and ensure service addresses match the documented startup commands. Bind local-only services to loopback by default. Use an explicit business timezone for forecast aggregation rather than relying on the host timezone.

For Python, use `uv sync` and `uv run` in `services/forecasting` once the lockfile exists. For Laravel/frontend, use the installed Composer/npm scripts; do not invent root convenience commands. For a script change, verify it from a path containing spaces, as this repository does.

Verify the services independently, then their configured integration. Check dependency installation, application/bootstrap health, database migration status against the development database, frontend build/type checks, and relevant tests. Do not run destructive database refreshes against an unverified database.

Docker, production hosting, queues, scheduled training, backups, offline synchronization, and monitoring are future configuration work unless actually supplied by the current task. Document concrete prerequisites and remaining gaps instead of claiming readiness from empty config files.
