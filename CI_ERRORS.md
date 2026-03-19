# CI/CD Error Notes

## Issues Addressed
- **Backend Jest leakage:** Backend pipeline tried to execute mobile tests, leading to missing React Native deps. Resolved by ignoring `<rootDir>/mobile/` in root jest.config.js.
- **React Native className props:** `SyncHistory.tsx` used web-style `className` on View/Text/icons, which broke Metro/type-checking. Replaced with StyleSheet-based styles.
- **Mobile test typings:** Jest mocks for axios/sqlite were untyped, causing TS errors; axios dependency confirmed in mobile package.json. Mocks now use `jest.Mocked` casting and explicit setup.

## Outcome
Pipelines should now isolate backend/mobile responsibilities, React Native components use correct styling primitives, and mobile test suite compiles cleanly.
