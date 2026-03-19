# PR Descriptions (copy/paste as needed)

## Security Hardening PR (feature/security-hardening)
- Replaced hardcoded secrets with .env-driven config for JWT and payments; added env examples to keep secrets out of the repo.
- Patched the fuel meter interval leak by clearing timers on unmount/stop, preventing runaway updates.
- Hardened background sync/payout flows with defensive try/catch paths so offline retries dont crash the app.
- Ready for production deployment.

## Unit Testing PR (codex/feature-unit-tests)
- Added Jest + ts-jest harness and supertest foundation for backend; HMAC-SHA256 signature checks now fully covered and passing.
- Implemented idempotency tests mirroring offline sync retries to ensure duplicate UUIDs are safely ignored.
- Mobile sync worker test confirms pending events are drained when connectivity is healthy; suite runs green.
