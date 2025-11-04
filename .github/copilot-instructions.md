# AI Coding Agent Instructions

These instructions orient an AI agent contributing to the VGS Collect React Native SDK (`@vgs/collect-react-native`). Focus on preserving security, public API stability, and minimal footprint for consumers.

## Core Purpose
A cross-platform (iOS/Android) React Native SDK for secure collection, validation, masking, tokenization, and submission of sensitive data (e.g., PAN, CVC, exp date) to VGS infrastructure. Main entrypoint: `src/index.tsx`.

## High-Level Architecture
- Collector core: `src/collector/VGSCollect.ts` manages field registry, validation, URL construction (vault / route / CNAME), submission, tokenization (`tokenize()`, `createAliases()`, `createCard()`), and analytics hooks.
- Inputs layer: `src/components/` provides *base* (`VGSTextInputBase`) and *specialized wrappers* (`VGSCardInput`, `VGSCVCInput`, plus compound exports under `VGSTextInput.*`). Wrappers set defaults (e.g. `fieldName`, serializers) and forward refs.
- Validation + masking: `src/utils/validators/*` (rule objects implementing a common `ValidationRule` interface). Dynamic brand-aware CVC rules updated via `VGSCollect.updateCvcFieldForBrand()`.
- Payment card brand logic: `src/utils/paymentCards/` (brand detection, length heuristics). Influences mask + rules update cascade.
- Serializers: e.g. `ExpDateSeparateSerializer` splits expiration dates into `exp_month` / `exp_year` for tokenization.
- Networking: Done via `fetch` inside `VGSCollect.submitDataToServer()`; custom headers: analytics + user-defined + JSON content type.
- Analytics & logging: `src/utils/analytics/*` (fire-and-forget, base64 payload) and `src/utils/logger/VGSCollectLogger.ts` singleton (disabled in prod by `NODE_ENV`).

## Key Data Flows
1. UI component mounts → registers field with `VGSCollect.registerField(...)` (includes getter for submission + validation rules + optional tokenization config + update callback).
2. On submit/tokenize → `validateFields()` → optional CNAME validation → build URL → send POST.
3. Tokenization collects only fields with `tokenizationConfig`; mapping preserved to reconstruct alias map.
4. Brand detection triggers `updateCvcFieldForBrand()` to push new mask + rules to all CVC fields (callback pattern updates UI state).

## Critical Conventions
- Field names MUST match configured vault route identifiers for redact/reveal. Defaults: `pan`, `cvc`, `expDate` (or serialized pieces), `cardholder`.
- Do not leak raw sensitive values to logs. Logger only logs request payload because SDK runs in integrating app; keep it JSON-stringified and ensure no accidental console additions.
- Always throw `VGSError` (with `VGSErrorCode`) for user-facing validation or configuration issues—never generic `Error`.
- Keep public exports stable: see `src/index.tsx`. Add new exports deliberately and update TypeScript types.
- Masks use placeholders: `#` digit, `@` letter, `a` lowercase, `A` uppercase, `*` alphanumeric.
- Avoid introducing synchronous blocking network waits in analytics (they are intentionally fire-and-forget).

## Build & Tooling
- Build: `npm run prepare` (bob build) outputs to `lib/{commonjs,module,typescript}`.
- Type check: `npm run typecheck`.
- Lint: Flat config not used; legacy `eslintConfig` lives in `package.json`. If adding a new flat config file, consolidate rules. Run: `npm run lint`.
- Tests: `npm test` (Jest). Ignore built `lib/` and example modules per `jest.modulePathIgnorePatterns`.
- Example app: `cd example && npm install && npm run ios` (runs Expo flow). Keep changes backward-compatible with example usage.
- Release: `npm run release` (release-it + conventional changelog). Version bumps must sync with analytics constant `VGSCOLLECT_SDK_VERSION` in `AnalyticsClient.ts`.

## Security & Safety
- Never hardcode secrets, tokens, or vault IDs. Only accept them via parameters/method args.
- Validate tenantId, environment, routeId strictly (see regex + environment handling in `validateConfig`).
- URL construction uses sanitization: preserve this; if changing `buildUrl`, keep path cleansing & validation behavior.
- `createCard()` requires externally provided JWT token; ensure validation remains explicit (`validateAccessToken`).

## Adding Validation or Input Types
1. Create rule in `src/utils/validators/` exporting via `index.ts`.
2. Update brand logic only if required (avoid coupling unrelated types to payment card brand manager).
3. Extend `VGSInputType` and update analytics mapping `getTypeAnalyticsString` when adding a new input type.
4. Provide sensible default mask + rules in component wrapper.

## Tokenization Changes
- Maintain ordered correlation between `fieldMappings` array and `response.data` for alias reconstruction. If batching logic changes, update both mapping and parser (`parseTokenizationResponse`).
- Always respect requested alias format from `tokenizationConfig.format`.

## Logging & Analytics
- Never enable logs by default; consumer must call `VGSCollectLogger.getInstance().enable()`.
- When adding analytics events, extend `AnalyticsEventType` & keep naming short (PascalCase) and update any dashboards if documented.

## Common Pitfalls / Avoid
- Forgetting to update exported version constant after publishing.
- Adding stateful singletons without reset path—prefer extending existing analytics/logger singletons.
- Introducing platform-specific (iOS/Android) code in shared TS without gating; runtime platform detection done via `Platform`.

## Quick Reference
- Main class: `src/collector/VGSCollect.ts`
- Components: `src/components/`
- Validators: `src/utils/validators/`
- Brand logic: `src/utils/paymentCards/`
- Logger: `src/utils/logger/VGSCollectLogger.ts`
- Analytics: `src/utils/analytics/`

Provide focused, minimal diffs. Ask if uncertain about public API or security-sensitive behavior before large refactors.
