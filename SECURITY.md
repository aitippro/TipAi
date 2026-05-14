# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

TipAi is a local-first desktop app. Security vulnerabilities may impact:

- **Data confidentiality**: Local SQLite database encryption (AES-256-GCM)
- **API key storage**: On-device keychain / encrypted storage
- **Prompt injection**: AI prompt engineering workflows

**Please do NOT file public issues for security vulnerabilities.**

Report vulnerabilities to: [GitHub Security Advisories](https://github.com/aitippro/TipAi/security/advisories/new)

We aim to respond within 48 hours and resolve critical issues within 7 days.

## Security Design

- **Zero network by default**: No HTTP server, no open ports. tRPC + Hono run in-process.
- **Local encryption**: AES-256-GCM with PBKDF2-SHA256 (600k iterations)
- **No telemetry**: No usage data collection, no analytics
- **API keys**: Stored in OS keychain, never in plaintext on disk

## Pre-commit Hook

This repository includes a pre-commit hook that scans for:
- API keys and tokens (GitHub, AWS, OpenAI, Anthropic, Slack patterns)
- Private keys (RSA, DSA, EC, OpenSSH, PGP)
- Hardcoded passwords

The hook blocks commits containing sensitive data. See `.git/hooks/pre-commit`.
