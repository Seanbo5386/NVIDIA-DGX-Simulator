# Diagnostics Baseline Report

**Date:** 2026-02-05
**Branch:** feature/cli-command-updates
**Latest Commit:** f0ed948 -- fix: resolve lint warnings and unused imports (Task 16)

---

## 1. Test Suite (npm run test:run)

**Result: ALL PASSING**

| Metric            | Value        |
| ----------------- | ------------ |
| Test Files        | 86 passed    |
| Test Files Failed | 0            |
| Total Tests       | 2,106 passed |
| Tests Failed      | 0            |
| Duration          | 27.07s       |

**Breakdown by duration phase:**

- Transform: 9.84s
- Setup: 149.09s
- Collect: 59.88s
- Tests: 48.57s
- Environment: 378.60s
- Prepare: 52.76s

**Stderr warnings (non-fatal):**

- examEngine.test.ts: Not enough questions for domain warnings (expected behavior when test data is smaller than production quotas)
- studyModeEngine.test.ts: Same Not enough questions warnings
- PracticalExams.test.tsx: React warning about mixing shorthand and non-shorthand CSS properties (borderColor vs border) in PracticalExams.tsx:20

---

## 2. Linter (npm run lint)

**Result: CLEAN -- 0 errors, 0 warnings**

The ESLint run completed with no output (exit code 0). The --max-warnings 0 flag was enforced successfully.

---

## 3. Production Build (npm run build)

**Result: SUCCESS (with warnings)**

### Bundle Sizes

| Asset                          | Size (raw)      | Size (gzip)   |
| ------------------------------ | --------------- | ------------- |
| dist/index.html                | 0.80 kB         | 0.45 kB       |
| dist/assets/index-DKPHZgrk.css | 60.00 kB        | 11.02 kB      |
| dist/assets/index-2fVZ8CnR.js  | 7.43 kB         | 2.56 kB       |
| dist/assets/index-DvAqKEeK.js  | 3,747.04 kB     | 944.69 kB     |
| **Total**                      | **3,815.27 kB** | **958.72 kB** |

### Build Warnings

1. **CSS syntax warning:** Expected identifier but found - at stdin:3365:2 -- likely a TailwindCSS or CSS-in-JS artifact
2. **Dynamic import conflict:** src/store/stateManager.ts is dynamically imported by src/utils/scenarioLoader.ts but also statically imported by src/components/StateManagementPanel.tsx, preventing chunk splitting
3. **Chunk size warning:** Main JS chunk (index-DvAqKEeK.js) is 3,747.04 kB -- far exceeds the 500 kB recommended limit. Vite recommends dynamic imports or manual chunk configuration.

### Build Duration

- 6.46s
- 2,870 modules transformed

---

## 4. any Type Usage

### Explicit any annotations (: any)

| Scope             | Occurrences |
| ----------------- | ----------- |
| Production source | 5           |
| Test files        | 3           |
| **Total**         | **8**       |

### Type assertions (as any)

| Scope             | Occurrences |
| ----------------- | ----------- |
| Production source | 1           |
| Test files        | 21          |
| **Total**         | **22**      |

### Combined any usage: 30 total (6 in production, 24 in tests)

### Exact locations in production source:

| File                                 | Line | Usage                                   |
| ------------------------------------ | ---- | --------------------------------------- |
| src/store/stateManager.ts            | 28   | updates: any;                           |
| src/store/stateManager.ts            | 174  | compareSnapshots(...): any return type  |
| src/store/stateManager.ts            | 229  | compareNodes(...): any return type      |
| src/store/stateManager.ts            | 231  | const changes: any[]                    |
| src/types/scenarios.ts               | 137  | stateCheck?: (context: any) => boolean; |
| src/cli/CommandDefinitionRegistry.ts | n/a  | (this.loader as any).definitions        |

---

## 5. Codebase Size

### File Counts

| Category                             | Count   |
| ------------------------------------ | ------- |
| Source files (.ts/.tsx, excl. tests) | 148     |
| Test files                           | 89      |
| **Total TypeScript files**           | **237** |

### Lines of Code

| Category               | Lines      |
| ---------------------- | ---------- |
| Production source code | 66,560     |
| Test code              | 28,925     |
| **Total lines**        | **95,485** |

### Test-to-Source Ratio

- **Lines:** 28,925 / 66,560 = 0.43 (43% test coverage by volume)
- **Files:** 89 / 148 = 0.60 (60% test file ratio)

---

## 6. TypeScript Strict Mode

**Result: ENABLED**

tsconfig.json compilerOptions:

- target: ES2020
- strict: true
- noUnusedLocals: true
- noUnusedParameters: true
- noFallthroughCasesInSwitch: true
- module: ESNext
- moduleResolution: bundler
- jsx: react-jsx
- isolatedModules: true
- noEmit: true
- resolveJsonModule: true

**Strict mode sub-flags (all enabled via strict: true):**

- strictNullChecks
- strictFunctionTypes
- strictBindCallApply
- strictPropertyInitialization
- noImplicitAny
- noImplicitThis
- alwaysStrict
- useUnknownInCatchVariables

**Additional strictness flags explicitly enabled:**

- noUnusedLocals: true
- noUnusedParameters: true
- noFallthroughCasesInSwitch: true

---

## Summary

| Diagnostic             | Status                      | Notes                                                       |
| ---------------------- | --------------------------- | ----------------------------------------------------------- |
| Tests                  | PASS (2,106/2,106)          | 86 test files, all green                                    |
| Lint                   | PASS (0 warnings, 0 errors) | Clean                                                       |
| Build                  | PASS (with warnings)        | Main JS chunk is 3,747 kB (oversized)                       |
| any types (prod)       | 6 occurrences               | Concentrated in stateManager.ts (4) and two others (1 each) |
| TypeScript strict mode | Enabled                     | Full strict + extra checks                                  |
| Codebase size          | 237 files, 95,485 LOC       | 148 source + 89 test files                                  |
