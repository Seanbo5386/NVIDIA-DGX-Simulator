# UX, Documentation & Packaging Audit

**Date:** 2026-02-05
**Auditor:** Task 7 (Automated Audit)
**Branch:** feature/cli-command-updates
**Scope:** User experience flow, navigation, terminal UX, accessibility, error handling, documentation, build configuration, and responsive design.

---

## Table of Contents

1. [UX Flow: User Journey from App Load](#1-ux-flow-user-journey-from-app-load)
2. [Navigation: Tab and View Organization](#2-navigation-tab-and-view-organization)
3. [Terminal UX: Completion, Suggestions, Help](#3-terminal-ux-completion-suggestions-help)
4. [Accessibility](#4-accessibility)
5. [Error Handling](#5-error-handling)
6. [UI Redundancy](#6-ui-redundancy)
7. [Documentation: README](#7-documentation-readme)
8. [CONTRIBUTING.md](#8-contributingmd)
9. [Build from Clone](#9-build-from-clone)
10. [Responsive Design](#10-responsive-design)
11. [Theme Support](#11-theme-support)
12. [Terminal Features: Tabs, Split Pane, Keyboard Shortcuts](#12-terminal-features-tabs-split-pane-keyboard-shortcuts)
13. [Summary of Findings](#13-summary-of-findings)

---

## 1. UX Flow: User Journey from App Load

### Files Examined

- `src/App.tsx`
- `src/components/WelcomeScreen.tsx`
- `src/components/SimulatorView.tsx`
- `src/components/Dashboard.tsx`

### What Happens on Load

1. **WelcomeScreen modal** appears as a full-screen overlay (`z-50`, fixed, with backdrop blur). It is always shown on first load (`showWelcome` defaults to `true`). There is no "Don't show again" checkbox or localStorage persistence -- the welcome screen appears every single time the application loads.

2. The WelcomeScreen displays:
   - An NVIDIA-branded logo with a pulsing green "N" icon
   - Title: "AI Infrastructure Simulator"
   - Subtitle text about the NCP-AII certification
   - Four feature cards (CLI Simulation, Fault Injection Labs, Real-time Telemetry, Guided Scenarios)
   - A single CTA button: "Enter Virtual Datacenter"

3. **On clicking "Enter Virtual Datacenter"**, the welcome screen fades out (500ms animation), and the user sees the main application with the Simulator tab active by default.

4. The Simulator view (`SimulatorView.tsx`) renders a split pane with Dashboard on the left and Terminal on the right.

### Clicks to Reach a Lab

- **From app load to starting a lab: 3 clicks minimum**
  1. Click "Enter Virtual Datacenter" (welcome screen)
  2. Click "Labs & Scenarios" tab (navigation bar)
  3. Click "Start Labs" on any domain card

- **From app load to practice exam: 3 clicks**
  1. Dismiss welcome screen
  2. Click "Labs & Scenarios" tab
  3. Click "Begin Practice Exam"

### Issues Found

| ID    | Severity | Finding                                                                                                                                                                                                          |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-01 | Medium   | Welcome screen shows every page load. No localStorage persistence or "Don't show again" option. Returning users face friction.                                                                                   |
| UX-02 | Low      | Welcome screen close animation uses a 500ms `setTimeout` before calling `onClose`. During this delay the screen is non-interactive but still blocking.                                                           |
| UX-03 | Info     | The default landing view is "simulator" (Dashboard + Terminal). New users may be confused by the empty terminal without lab context. A brief onboarding hint or "Type `help` to get started" message would help. |

---

## 2. Navigation: Tab and View Organization

### Files Examined

- `src/App.tsx` (primary navigation)
- `src/components/Dashboard.tsx` (sub-tabs)

### Top-Level Navigation

The app has 4 primary tabs in the `<nav>` bar:

| Tab              | Icon         | Content                                                                                   |
| ---------------- | ------------ | ----------------------------------------------------------------------------------------- |
| Simulator        | Monitor      | Split pane: Dashboard (left) + Terminal (right)                                           |
| Labs & Scenarios | FlaskConical | Grid of 5 domain cards + Practice Exam + Exam Gauntlet + Learning Paths + Study Dashboard |
| Reference        | BookOpen     | Task-category-based command reference with search                                         |
| State Management | Database     | Cluster state save/restore, export/import                                                 |

### Sub-Navigation within Views

**Dashboard** (inside Simulator) has 4 sub-tabs:

- Overview (GPU cards, node details)
- Historical Metrics
- NVLink Topology (D3.js)
- InfiniBand Fabric (D3.js)

**Labs & Scenarios** has a flat grid of 8-9 cards. No sub-tabs, but clicking cards opens modals/overlays:

- Domain 1-5 lab cards open `LabWorkspace` as a side-panel overlay
- Practice Exam opens `ExamWorkspace` as a full-screen modal
- Exam Gauntlet opens `ExamGauntlet` as a full-screen modal
- Learning Paths opens `LearningPaths` as a full-screen modal
- Study Dashboard opens `StudyDashboard` as a full-screen modal

### Issues Found

| ID     | Severity | Finding                                                                                                                                                                                                                                                    |
| ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NAV-01 | Medium   | The "Labs & Scenarios" tab is overloaded. It contains domain labs, practice exams, exam gauntlet, learning paths, and study dashboard -- all as sibling cards in a flat grid. This is 8+ cards with very different purposes (learning, testing, tracking). |
| NAV-02 | Low      | The `LabWorkspace` overlay uses a fixed `ml-[600px]` left margin that pushes the header, nav, main, and footer to the right. This is a hardcoded pixel value that does not respond to window size gracefully.                                              |
| NAV-03 | Low      | Navigation tabs lack `role="tablist"` and `role="tab"` ARIA attributes. They use `<button>` elements with `border-b-2` visual indicators but no semantic tab pattern.                                                                                      |
| NAV-04 | Info     | The review notification badge on the "Labs & Scenarios" tab is a `<button>` nested inside another `<button>` (the tab button). Nested interactive elements are problematic for accessibility.                                                              |

---

## 3. Terminal UX: Completion, Suggestions, Help

### Files Examined

- `src/utils/tabCompletion.ts`
- `src/utils/commandSuggestions.ts`
- `src/utils/terminalKeyboardHandler.ts`
- `src/utils/syntaxHighlighter.ts`
- `src/utils/interactiveShellHandler.ts`

### Tab Completion

The tab completion system is well-implemented:

- **Single match**: Auto-completes the command/subcommand with a trailing space.
- **Multiple matches with common prefix**: Completes up to the common prefix.
- **Double-tab**: Shows all matching completions formatted in columns (max 80-char width).
- **Completable entities**: Command names (50+), subcommands, flags, simulated file paths (`SIMULATED_PATHS`), and systemctl service names.
- **Bell character** (`\x07`) on no match or ambiguous match without partial completion.

### Command Suggestions

- **"Did you mean?"**: Uses Levenshtein distance with a 0.6 similarity threshold. Returns up to 3 suggestions for misspelled commands with ANSI color formatting.
- **Contextual suggestions**: `getContextualSuggestions()` matches commands against step objectives by keyword relevance scoring.
- **`explain <command>`**: Formats rich help with categories, difficulty, syntax, common flags, examples, "when to use", related commands, and common mistakes.

### `--help` Support

Grep results show `--help` handling exists across multiple simulators (nvidiaSmi, ipmitool, pciTools, container, basicSystem, bcm, mellanox, nvsm, nvlinkAudit, cmsh). A `BaseSimulator` class provides a common `--help` pattern. This appears well-covered for most simulated commands.

### Syntax Highlighting

- Full ANSI-code-based syntax highlighter for terminal output.
- Highlights: commands (cyan), flags (yellow), paths (blue), strings (green), status keywords (green/yellow/red), GPU IDs, PCI addresses, temperatures, power values, memory sizes, IP addresses, UUIDs, hex values.
- Specialized highlighters for nvidia-smi, dcgmi, and InfiniBand output.
- Configurable via `SyntaxHighlightConfig` with presets: `DEFAULT_HIGHLIGHT_CONFIG`, `MINIMAL_HIGHLIGHT_CONFIG`, `NO_HIGHLIGHT_CONFIG`.

### Keyboard Shortcuts

The `terminalKeyboardHandler.ts` implements:

| Shortcut  | Action                                            |
| --------- | ------------------------------------------------- |
| Enter     | Execute command                                   |
| Backspace | Delete character                                  |
| Ctrl+C    | Cancel input                                      |
| Ctrl+L    | Clear screen                                      |
| Ctrl+R    | Reverse history search                            |
| Ctrl+U    | Clear line                                        |
| Ctrl+W    | Delete word                                       |
| Up/Down   | History navigation                                |
| Tab       | Autocomplete                                      |
| Ctrl+A    | Move to beginning (not implemented -- plays bell) |
| Ctrl+E    | Move to end (not implemented -- plays bell)       |

### Issues Found

| ID      | Severity | Finding                                                                                                                                                                                                                                           |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TERM-01 | Medium   | Ctrl+A and Ctrl+E (move cursor to beginning/end of line) are not implemented. They just play a bell sound. These are basic readline shortcuts that experienced terminal users expect.                                                             |
| TERM-02 | Low      | The README lists "Command history search (Ctrl+R)" as "In Progress", but the `terminalKeyboardHandler.ts` has a full implementation of reverse-i-search. Documentation is stale.                                                                  |
| TERM-03 | Low      | Tab completion uses a module-level `lastTabTime` and `lastCompletionResult` variable, creating global mutable state. If multiple terminal instances exist (tabs/splits), they share this state, which could cause incorrect double-tab detection. |
| TERM-04 | Info     | `SIMULATED_PATHS` covers limited directories. Users exploring paths beyond the predefined set (e.g., `/sys/class/infiniband/`) get no completions. This may confuse users expecting a more complete filesystem.                                   |
| TERM-05 | Info     | Keyboard shortcuts are not documented anywhere in the UI. No "help" overlay or cheat sheet is accessible within the terminal. The `help` command shows available commands but not keyboard shortcuts.                                             |

---

## 4. Accessibility

### Files Examined

- All component files listed in audit checklist
- `src/hooks/useFocusTrap.ts`
- `src/App.tsx`

### Positive Findings

1. **Skip link**: `App.tsx` includes a skip-to-main-content link (`<a href="#main-content" className="sr-only focus:not-sr-only ...">`) that becomes visible on focus. The `main` element has `id="main-content"`.

2. **Focus trap for modals**: `WelcomeScreen` uses `useFocusTrap` hook that stores previously focused element, traps Tab/Shift+Tab, handles Escape, and restores focus on cleanup. This follows WCAG 2.1.2.

3. **ARIA attributes in Dashboard**: `Dashboard.tsx` has 20 `aria` attribute instances including:
   - `role="status"` on health indicators with `aria-label` text
   - `aria-hidden="true"` on decorative icons and symbols
   - `role="tablist"` and `role="tab"` on the NodeSelector with `aria-selected` and roving `tabIndex`
   - Arrow key navigation (Up/Down/Left/Right/Home/End) on node buttons
   - Text alternatives for color-coded temperature indicators (symbol + text label)

4. **Separator ARIA**: SimulatorView's resize handle has `role="separator"`, `aria-orientation="vertical"`, `aria-label="Resize panels"`, and `tabIndex={0}`.

5. **SplitPane and TerminalTabs**: Both have `aria-label` attributes on buttons ("Split pane horizontally", "Close pane", "Close {tabName}", "Add new terminal tab").

### Issues Found

| ID      | Severity | Finding                                                                                                                                                                                                                                                                                        |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A11Y-01 | High     | `StudyDashboard.tsx` uses inline `style` objects exclusively (no Tailwind) for all styling. No ARIA attributes whatsoever. No `role`, no `aria-label`, no `aria-live` for dynamic content. The tab bar is implemented with plain `<button>` elements without `role="tablist"` or `role="tab"`. |
| A11Y-02 | High     | `PracticalExams.tsx` uses inline `style` objects exclusively. Zero ARIA attributes. Exam cards use `<div onClick>` instead of `<button>`. Timer warnings are visual-only (red color change) with no screen reader notification.                                                                |
| A11Y-03 | High     | `ExamWorkspace.tsx` has zero ARIA attributes on the exam question interface. The question navigation grid uses color-only indicators (green=current, blue=answered, gray=not answered) without text alternatives.                                                                              |
| A11Y-04 | Medium   | `StudyModes.tsx` flashcard interface lacks ARIA attributes. The flip animation relies on click-to-reveal without keyboard alternative beyond clicking. Cards use `<div onClick>` without `role="button"`.                                                                                      |
| A11Y-05 | Medium   | `ErrorBoundary.tsx` uses a light theme (white background, gray text) in a dark-themed application. The visual disconnect is jarring and suggests the error boundary was not adapted to match the application theme.                                                                            |
| A11Y-06 | Medium   | Navigation tabs in `App.tsx` use `<button>` elements with visual-only active indicators (`border-b-2 border-nvidia-green`). No `role="tablist"`, `role="tab"`, or `aria-selected` attributes.                                                                                                  |
| A11Y-07 | Medium   | The nested button in `App.tsx` line 265 (review notification badge inside the Labs tab button) creates an invalid HTML structure. Nested interactive elements cause unpredictable behavior for assistive technology.                                                                           |
| A11Y-08 | Low      | `DomainNavigation.tsx` uses only color to indicate domain progress. The progress bar has no text alternative or percentage readout for screen readers.                                                                                                                                         |
| A11Y-09 | Low      | `ThemeSelector.tsx` has only one `aria-label="Close"` on the close button. Theme selection buttons lack any accessible description of what each theme looks like beyond the visual swatch.                                                                                                     |
| A11Y-10 | Low      | Only 2 instances of `sr-only` class exist in the entire codebase (skip link in App.tsx and a heading in ReferenceTab.tsx). Screen-reader-only text is severely underutilized.                                                                                                                  |

### Accessibility Summary

Components fall into two distinct groups:

- **Well-done**: Dashboard, WelcomeScreen, SimulatorView, SplitPane, TerminalTabs, ProgressRing -- these have proper ARIA attributes and keyboard support.
- **No accessibility support**: StudyDashboard, PracticalExams, ExamWorkspace, StudyModes -- these have zero ARIA attributes and use inline styles. They appear to be built with a different approach (possibly earlier or by different contributors).

---

## 5. Error Handling

### Files Examined

- `src/components/ErrorBoundary.tsx`
- `src/utils/commandSuggestions.ts`

### ErrorBoundary

- Implements `getDerivedStateFromError` and `componentDidCatch` (standard React error boundary pattern).
- Logs errors to console in `componentDidCatch`.
- In development mode (`import.meta.env.DEV`), shows the error message in a red-bordered box.
- In production, shows a generic "Something went wrong" message.
- Provides a "Try Again" button that resets the error state.
- **No error reporting service integration** (no Sentry, no analytics).

### Terminal Error Handling

- `commandSuggestions.ts` provides `getEnhancedErrorFeedback()` that matches error patterns (14 patterns covering: command not found, permission denied, device not found, MST driver, invalid options, missing arguments, GPU/XID errors, ECC errors, thermal issues, NVLink errors, InfiniBand issues, Slurm errors, container issues, OOM).
- Each pattern provides: explanation, suggestion, optional documentation link, and related commands.
- `getDidYouMeanMessage()` provides fuzzy-match suggestions for unknown commands.
- `validateCommandSyntax()` checks for known commands and suggests alternatives.

### Issues Found

| ID     | Severity | Finding                                                                                                                                                                                                                         |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ERR-01 | Medium   | `ErrorBoundary.tsx` uses a light color scheme (`bg-gray-50`, `bg-white`, `text-gray-900`) that clashes with the application's dark theme. If an error is caught, the user sees a jarring white screen.                          |
| ERR-02 | Low      | Error boundary only wraps at one level (presumably in `main.tsx`). There are no granular error boundaries for individual features (Dashboard, Terminal, Labs). A crash in the topology graph takes down the entire application. |
| ERR-03 | Low      | `StudyDashboard` uses `alert()` for import success/failure messages and `confirm()` for reset confirmation. These are blocking native dialogs that do not match the application's design language.                              |
| ERR-04 | Low      | `PracticalExams` uses `alert('Failed to start exam')` in the catch block. No useful error information is provided to the user.                                                                                                  |
| ERR-05 | Info     | Terminal error feedback is comprehensive (14 patterns with explanations and suggestions). This is a strong feature of the codebase.                                                                                             |

---

## 6. UI Redundancy

### Files Examined

- `src/App.tsx` (all view routing)
- All component files in the audit checklist

### Multiple Paths to Similar Features

The audit identifies features that can be accessed through multiple overlapping paths:

**Practice Exam (at least 3 paths):**

1. Labs & Scenarios tab -> "Begin Practice Exam" card
2. Labs & Scenarios tab -> Study Dashboard card -> "Full Practice Exam" button
3. Labs & Scenarios tab -> Study Dashboard card -> "Quick Quiz" button (different mode, same underlying component)

**Study Progress (at least 3 paths):**

1. Labs & Scenarios tab -> Study Dashboard card -> opens `StudyDashboard` modal
2. Labs & Scenarios tab -> Learning Paths card -> opens `LearningPaths` modal (which has its own progress tracking via `useLearningProgressStore`)
3. Footer shows running/paused status (minimal progress indicator)

**Learning/Study Modes (at least 3 overlapping systems):**

1. `StudyModes.tsx` -- 5 study modes (Domain Deep-Dive, Timed Practice, Review Mistakes, Flashcard, Random Challenge) using `useLearningStore`
2. `LearningPaths.tsx` -- Learn/Practice/Test tab interface using `useLearningProgressStore`
3. `StudyDashboard.tsx` -- Overview, domains, history, settings tabs using `studyProgressTracker` utility

**Command Reference (at least 2 paths):**

1. Reference tab -> task-based category grid with command details
2. Terminal `explain <command>` -- different data source (`commandMetadata`)
3. Terminal `help` -- yet another format listing commands by category

### Issues Found

| ID     | Severity | Finding                                                                                                                                                                                                                                                                                                                                                        |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED-01 | High     | Three separate progress/study tracking systems coexist: `StudyDashboard` (uses `studyProgressTracker` utility + `learningStore`), `LearningPaths` (uses `learningProgressStore`), and `StudyModes` (uses `learningStore`). These track overlapping data (exam attempts, domain scores, study time) with different stores and utilities, risking inconsistency. |
| RED-02 | Medium   | Two different styling paradigms exist: `StudyDashboard` and `PracticalExams` use inline `style` objects with a `styles` record, while all other components use Tailwind CSS classes. This creates visual inconsistency (slightly different grays, spacing, fonts) and maintenance burden.                                                                      |
| RED-03 | Medium   | The Labs & Scenarios page presents 8+ cards in a flat grid without grouping or hierarchy. Users must scan all cards to find what they want. No categorization between "Practice" (labs, exams) and "Track" (dashboards, progress).                                                                                                                             |
| RED-04 | Low      | `DomainNavigation.tsx` exists as a component but is not imported or used in `App.tsx`. It appears to be dead code or a component designed for integration that never happened.                                                                                                                                                                                 |

---

## 7. Documentation: README

### File Examined

- `README.md` (476 lines)

### Coverage Assessment

| Topic               | Covered? | Quality                                                   |
| ------------------- | -------- | --------------------------------------------------------- |
| Project overview    | Yes      | Good. Clear description of what the simulator does.       |
| Quick start         | Yes      | Good. Prerequisites, clone/install/dev commands included. |
| Production build    | Yes      | `npm run build` and `npm run preview` documented.         |
| Usage guide         | Yes      | Basic (Dashboard, Terminal, Labs, Documentation).         |
| First commands      | Yes      | 7 example commands with comments.                         |
| Available commands  | Yes      | Comprehensive tables for GPU, DCGM, BMC, InfiniBand.      |
| Lab scenarios       | Yes      | All 5 domains with specific lab names (64 labs).          |
| Architecture        | Yes      | Tech stack, project structure, hardware models.           |
| Testing             | Yes      | Unit tests, E2E tests, all test commands.                 |
| Contributing        | Minimal  | 5-step fork/branch/commit/push/PR -- very generic.        |
| XID Error Reference | Yes      | 6 common XID errors with descriptions and actions.        |
| Roadmap             | Yes      | Completed items, in-progress, future.                     |

### Issues Found

| ID     | Severity | Finding                                                                                                                                                                      |
| ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC-01 | Medium   | README roadmap lists "Command history search (Ctrl+R)" as "In Progress" but it is fully implemented in `terminalKeyboardHandler.ts`. Stale roadmap creates wrong impression. |
| DOC-02 | Medium   | No mention of keyboard shortcuts (Ctrl+L, Ctrl+U, Ctrl+W, Ctrl+R, Ctrl+\\). Users have no way to discover these features except by trying them.                              |
| DOC-03 | Low      | The `git clone <your-repo-url>` placeholder suggests the README was not updated with the actual repository URL.                                                              |
| DOC-04 | Low      | No mention of the theme selector feature, terminal tabs, or split pane functionality. These are significant features invisible to users reading the README.                  |
| DOC-05 | Low      | The `cd dc-sim-011126` in the Quick Start suggests the repo should be cloned as `dc-sim-011126`, but the actual directory name depends on the clone URL.                     |
| DOC-06 | Info     | README uses emoji headers extensively. While common in open-source, this is a style choice that may not render consistently in all markdown viewers.                         |

---

## 8. CONTRIBUTING.md

### Finding

**CONTRIBUTING.md does not exist.** The README contains a minimal 5-step contributing section:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

### Issues Found

| ID         | Severity | Finding                                                                                                                                                                                                                                                              |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CONTRIB-01 | Medium   | No CONTRIBUTING.md file. The README's contributing section lacks: coding standards, component naming conventions, testing requirements, PR template expectations, which stores to use for new features, Tailwind vs inline style policy, accessibility requirements. |
| CONTRIB-02 | Low      | No code of conduct or issue template files.                                                                                                                                                                                                                          |

---

## 9. Build from Clone

### Files Examined

- `package.json`
- `vite.config.ts`
- `index.html`
- `tailwind.config.js`

### Build Configuration Assessment

**package.json:**

- `"type": "module"` -- correct for Vite ESM.
- Scripts: `dev`, `build`, `preview`, `lint`, `test`, `test:run`, `test:ui`, `test:coverage`, `test:e2e` and variants.
- Build command: `tsc && vite build` (TypeScript check before build).
- Has `husky` and `lint-staged` with `prettier` and `eslint --fix` on pre-commit.
- Node.js version requirement stated in README as "18+" but not enforced in `package.json` (no `engines` field).

**vite.config.ts:**

- `@` path alias resolves to `./src`.
- Port 5173 (Vite default), `strictPort: false` (will find next available port if occupied).
- Simple configuration, no issues.

**index.html:**

- `lang="en"` attribute set (good for accessibility).
- Viewport meta tag present.
- External Google Fonts dependency (JetBrains Mono) -- requires internet connectivity.
- References `/nvidia-icon.svg` favicon.

**tailwind.config.js:**

- Scans `index.html` and `src/**/*.{js,ts,jsx,tsx}`.
- Extends colors with `nvidia` namespace.
- Custom `fontFamily.mono` with JetBrains Mono.

### Can Someone Do `git clone && npm install && npm run dev`?

**Likely yes**, with caveats:

- Node.js 18+ required (stated in README)
- The `@rollup/rollup-win32-x64-msvc` dependency in `package.json` is platform-specific (Windows). On macOS/Linux, this may cause warnings but should not block installation since it is a Rollup optional dependency.
- `husky` `prepare` script runs on `npm install` to set up git hooks.

### Issues Found

| ID       | Severity | Finding                                                                                                                                                                                                                                                     |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUILD-01 | Medium   | `@rollup/rollup-win32-x64-msvc` is listed as a direct dependency (not devDependency). This is a Windows-specific native binary. It should be a devDependency or handled via Rollup's optional dependency resolution. Cross-platform users may see warnings. |
| BUILD-02 | Low      | No `engines` field in `package.json` to enforce Node.js version requirement. `npm install` will succeed on Node.js 16 but the build may fail.                                                                                                               |
| BUILD-03 | Low      | Google Fonts (`fonts.googleapis.com`) dependency in `index.html` means the application requires internet access on first load for the JetBrains Mono font. Offline usage will fall back to `Consolas`, `Monaco`, `Courier New`.                             |
| BUILD-04 | Info     | No `.nvmrc` or `.node-version` file for automatic Node.js version selection.                                                                                                                                                                                |

---

## 10. Responsive Design

### Files Examined

- `src/components/SimulatorView.tsx`
- `src/components/Dashboard.tsx`
- `src/App.tsx`

### Responsive Breakpoints

**SimulatorView:**

- Mobile breakpoint: `768px` (`MOBILE_BREAKPOINT`).
- Below 768px: switches from split pane to a tabbed interface (Dashboard tab / Terminal tab).
- Touch support: `onTouchStart` and `onTouchMove` handlers on the split divider.
- `minWidth: '400px'` on the desktop layout container.

**Dashboard:**

- Grid columns adapt: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for GPU cards.
- `md:grid-cols-4` for node details and cluster health summary.

**App.tsx Labs grid:**

- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for domain cards.

**StudyDashboard and PracticalExams:**

- Use inline styles with some grid declarations but no responsive breakpoints. `gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'` in StudyDashboard provides some responsiveness but `twoColumn: { gridTemplateColumns: '1fr 1fr' }` is always two columns regardless of screen size.

### Issues Found

| ID      | Severity | Finding                                                                                                                                                                                        |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RESP-01 | Medium   | `StudyDashboard` and `PracticalExams` use inline styles without responsive breakpoints. On mobile devices, the two-column layout (`1fr 1fr`) for weak/strong areas will be too narrow to read. |
| RESP-02 | Medium   | The `LabWorkspace` overlay uses a fixed `ml-[600px]` left margin. On screens narrower than ~1200px, this leaves insufficient space for the main content (header, nav, terminal).               |
| RESP-03 | Low      | `ExamWorkspace` and `StudyModes` modals use `h-[90vh]` and `h-[80vh]` respectively but do not account for mobile viewport height (where virtual keyboards reduce available height).            |
| RESP-04 | Low      | The mobile tab bar in `SimulatorView` (Dashboard/Terminal toggle) has no indication to the user that they can switch views. It looks like a simple header bar.                                 |
| RESP-05 | Info     | The `StudyModes` stats summary uses `grid-cols-4` without a responsive prefix, so on narrow screens the four stat cards will be very small.                                                    |

---

## 11. Theme Support

### Files Examined

- `src/components/ThemeSelector.tsx`
- `src/utils/terminalThemes.ts`

### Theme System

**10 themes available** (from `ThemeId` type):

1. `nvidia` (default) -- Green on black
2. `dark`
3. `light`
4. `solarized-dark`
5. `solarized-light`
6. `monokai`
7. `dracula`
8. `nord`
9. `gruvbox-dark`
10. `one-dark`

**ThemeSelector component features:**

- **Compact mode**: Dropdown `<select>` with optgroups (Dark/Light).
- **Full mode**: Grid of theme buttons with color swatches, filter tabs (All/Dark/Light), live preview panel showing nvidia-smi-like output.
- Persistence: `saveThemePreference()` / `loadThemePreference()` (presumably localStorage).
- Labeled `<select>` with `htmlFor` in compact mode.

### Issues Found

| ID       | Severity | Finding                                                                                                                                                                                                                                                                                                                   |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| THEME-01 | Medium   | The ThemeSelector component exists but is not accessible from the main UI. It is not imported or rendered in `App.tsx`. There is no settings menu, gear icon, or other entry point for users to discover or change themes. The component may only be used within the terminal settings or through an undiscoverable path. |
| THEME-02 | Low      | Themes only apply to the terminal (xterm.js `ITheme`). The application shell (header, nav, dashboard, modals) is always dark gray. There is no global light/dark mode toggle for the full application.                                                                                                                    |
| THEME-03 | Low      | The `ErrorBoundary` uses hardcoded light theme colors (`bg-gray-50`, `bg-white`) that will clash with all terminal themes and the dark application shell.                                                                                                                                                                 |

---

## 12. Terminal Features: Tabs, Split Pane, Keyboard Shortcuts

### Files Examined

- `src/components/TerminalTabs.tsx`
- `src/components/SplitPane.tsx`
- `src/utils/terminalKeyboardHandler.ts`

### Terminal Tabs

- Tab bar with shell mode indicator ($, >, %).
- Double-click to rename tabs.
- Right-click context menu: Rename, Duplicate, Move Left, Move Right, Close.
- Tab number hint (1-9) for keyboard shortcut reference.
- Add tab button with count indicator.
- Max tabs enforced via `canAddTab()`.

### Split Pane

- Horizontal and vertical splitting.
- Max pane count enforced via `canAddPane()`.
- Active pane highlighted with green ring.
- Controls appear on hover: split horizontal, split vertical, close.
- Pane count indicator ("N/M panes").
- Drag-to-resize divider (`SplitDivider` component).

### Keyboard Shortcuts (SimulatorView)

- `Ctrl+\`: Reset split ratio to 50/50 and uncollapse both panels.
- Panel collapse/expand buttons on the resize handle bar.
- Reset button to restore default layout.

### Discoverability Assessment

| Feature             | Discoverable? | How?                                                                                                  |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| Tab completion      | No            | Must know to press Tab                                                                                |
| History navigation  | No            | Must know Up/Down arrows                                                                              |
| Ctrl+R search       | No            | Not documented anywhere                                                                               |
| Ctrl+L clear        | No            | Not documented                                                                                        |
| Ctrl+U clear line   | No            | Not documented                                                                                        |
| Ctrl+W delete word  | No            | Not documented                                                                                        |
| Ctrl+\\ reset split | No            | Tooltip on reset button only                                                                          |
| Terminal tabs       | Partial       | Add button visible, but tab switching shortcuts are only hinted by the small number next to tab names |
| Split pane          | Partial       | Controls appear on hover, but splitting concept is not explained                                      |
| Theme selector      | No            | No visible entry point                                                                                |
| `explain` command   | Partial       | Mentioned in README and in step completion feedback                                                   |
| `hint` command      | Partial       | Mentioned in README                                                                                   |

### Issues Found

| ID      | Severity | Finding                                                                                                                                                                                                                                                          |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FEAT-01 | Medium   | Terminal features (tabs, splits, keyboard shortcuts) are not documented in the UI. No onboarding tooltip, no help overlay, no keyboard shortcut reference accessible from the application.                                                                       |
| FEAT-02 | Medium   | The `TerminalTabs` and `SplitPane` components exist but their integration point is unclear from the audit. They are not directly used in `SimulatorView.tsx` or `App.tsx`. They may be part of an advanced terminal mode that is not wired up in the current UI. |
| FEAT-03 | Low      | Tab keyboard shortcuts (e.g., Ctrl+1 through Ctrl+9 to switch tabs) are hinted by the tab number indicator but the actual keyboard handler does not implement these shortcuts.                                                                                   |

---

## 13. Summary of Findings

### Statistics

| Category          | High  | Medium | Low    | Info  |
| ----------------- | ----- | ------ | ------ | ----- |
| UX Flow           | 0     | 1      | 1      | 1     |
| Navigation        | 0     | 1      | 2      | 1     |
| Terminal UX       | 0     | 1      | 2      | 2     |
| Accessibility     | 3     | 4      | 3      | 0     |
| Error Handling    | 0     | 1      | 3      | 1     |
| UI Redundancy     | 1     | 2      | 1      | 0     |
| Documentation     | 0     | 2      | 3      | 1     |
| CONTRIBUTING      | 0     | 1      | 1      | 0     |
| Build             | 0     | 1      | 2      | 1     |
| Responsive        | 0     | 2      | 2      | 1     |
| Theme Support     | 0     | 1      | 2      | 0     |
| Terminal Features | 0     | 2      | 1      | 0     |
| **TOTAL**         | **4** | **19** | **23** | **8** |

### Top Priority Recommendations

1. **Accessibility (HIGH):** Three components (`StudyDashboard`, `PracticalExams`, `ExamWorkspace`) have zero accessibility support. These are user-facing exam and study features that should be accessible. Add ARIA attributes, keyboard navigation, and text alternatives for color-only indicators.

2. **UI Redundancy (HIGH):** Three separate progress-tracking systems with different stores create data inconsistency risk. Consolidate to a single store or establish clear data flow between them.

3. **Discoverability (MEDIUM):** Terminal features (keyboard shortcuts, tabs, splits, themes) and their documentation are essentially hidden. Add a keyboard shortcut reference accessible via `?` or a help button.

4. **Styling Consistency (MEDIUM):** Two components use inline `style` objects while 30+ components use Tailwind CSS. Migrate `StudyDashboard` and `PracticalExams` to Tailwind for consistency and responsive breakpoints.

5. **Welcome Screen Persistence (MEDIUM):** Add localStorage flag to skip the welcome screen for returning users.

6. **ErrorBoundary Theme (MEDIUM):** Update error boundary to use dark theme matching the application shell.

7. **Documentation Freshness (MEDIUM):** Update README roadmap (Ctrl+R is implemented), document keyboard shortcuts, and add actual repository URL to clone instructions.

8. **Missing CONTRIBUTING.md (MEDIUM):** Create a proper contributing guide covering coding standards, testing requirements, which state management stores to use, and accessibility expectations.

### Strengths

- **Terminal UX core is excellent**: Tab completion, history, syntax highlighting, "did you mean?", contextual hints, and rich `explain` help are all well-implemented.
- **Dashboard accessibility is strong**: Proper ARIA roles, keyboard navigation, text alternatives for color indicators, and semantic markup in the main Dashboard component.
- **SimulatorView responsive design is solid**: Mobile breakpoint with tabbed interface, touch support, persisted split ratio, and collapsible panels.
- **Error feedback in terminal is comprehensive**: 14 error patterns with explanations, suggestions, and documentation links.
- **WelcomeScreen has proper focus management**: Focus trap, escape key handling, and animated transitions.
- **Build tooling is modern and complete**: Vite, TypeScript, ESLint, Prettier, Husky, lint-staged, Vitest, Playwright -- a mature development pipeline.
