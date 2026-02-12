/**
 * MissionRunner — E2E helper that drives a full narrative
 * mission to completion via Playwright.
 *
 * Encapsulates every UI interaction a user performs when
 * running a scenario: welcome screen, navigation, terminal
 * typing, quiz answering, concept/observe Continue clicks,
 * and mission-completion assertion.
 */

import { type Page, expect } from "@playwright/test";
import type { Mission, MissionStep } from "./mission-data";

/** How long to wait for the step to auto-advance after validation passes. */
const STEP_ADVANCE_MS = 3_500;

/** How long to wait for lazy UI elements before failing. */
const UI_TIMEOUT = 10_000;

export class MissionRunner {
  constructor(private page: Page) {}

  // ──────────────────────────────────────────────
  //  Top-level lifecycle
  // ──────────────────────────────────────────────

  /**
   * Dismiss the welcome splash and wait for the simulator
   * view (including the terminal) to load.
   */
  async enterSimulator(): Promise<void> {
    await this.page.goto("/");

    // Wait for welcome screen
    await this.page.waitForSelector('[data-testid="welcome-screen"]', {
      timeout: UI_TIMEOUT,
    });

    // Click "Enter Virtual Datacenter"
    await this.page.click('button:has-text("Enter Virtual Datacenter")');

    // Wait for terminal to be ready
    await this.page.waitForSelector('[data-testid="terminal"]', {
      timeout: UI_TIMEOUT,
    });

    // Give terminal/xterm a moment to initialise
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to Labs & Scenarios, find the mission card by
   * title, click it, and click "Begin Mission" on the
   * NarrativeIntro screen.
   */
  async launchMission(title: string): Promise<void> {
    // Switch to Labs tab
    await this.page.click('[data-testid="nav-labs"]');
    await this.page.waitForSelector('[data-testid="labs-list"]', {
      timeout: UI_TIMEOUT,
    });

    // Find and click the mission card
    const card = this.page.locator(`text=${title}`).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    // NarrativeIntro screen — click "Begin Mission"
    const beginBtn = this.page.locator('button:has-text("Begin Mission")');
    await beginBtn.waitFor({ state: "visible", timeout: UI_TIMEOUT });
    await beginBtn.click();

    // Lab workspace should now be visible
    await this.page.waitForSelector('[data-testid="lab-workspace"]', {
      timeout: UI_TIMEOUT,
    });
  }

  // ──────────────────────────────────────────────
  //  Step handlers
  // ──────────────────────────────────────────────

  /** Click the "Continue" button shown for concept steps. */
  async completeConceptStep(): Promise<void> {
    const btn = this.page.locator('[data-testid="concept-continue-btn"]');
    await btn.waitFor({ state: "visible", timeout: UI_TIMEOUT });
    await btn.click();
  }

  /**
   * Click the "Continue" button shown for observe steps.
   * (Same UI mechanism as concept steps.)
   */
  async completeObserveStep(): Promise<void> {
    await this.completeConceptStep();
  }

  /**
   * Type a command into the xterm.js terminal.
   * Clicks the terminal first so it receives focus, then
   * types each character individually (xterm keyboard input).
   */
  async executeCommand(cmd: string): Promise<void> {
    const terminal = this.page.locator('[data-testid="terminal"]');
    await terminal.click();

    // Type character by character to trigger xterm key handlers
    for (const char of cmd) {
      await this.page.keyboard.type(char, { delay: 10 });
    }
    await this.page.keyboard.press("Enter");

    // Allow the terminal to process the command
    await this.page.waitForTimeout(800);
  }

  /**
   * Answer an inline quiz by clicking the option at the
   * given index.  The quiz renders 4 `<button>` elements
   * inside the InlineQuiz component.
   */
  async answerQuiz(correctIndex: number): Promise<void> {
    // Wait for the quiz to appear — look for the "KNOWLEDGE CHECK" heading
    await this.page.waitForSelector('text="KNOWLEDGE CHECK"', {
      timeout: UI_TIMEOUT,
    });

    // The quiz options are buttons inside the InlineQuiz component.
    // They are siblings rendered in order, so we pick by index.
    const quizButtons = this.page.locator(
      'h4:has-text("KNOWLEDGE CHECK") ~ div button',
    );
    await quizButtons.nth(correctIndex).click();

    // Give time for feedback animation
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the step to auto-advance after validation
   * passes (the app has a ~1.5s auto-advance timer).
   */
  async waitForStepAdvance(): Promise<void> {
    await this.page.waitForTimeout(STEP_ADVANCE_MS);
  }

  /**
   * Assert that the mission-complete UI is visible.
   * After the last step, the app either shows a
   * "Complete Mission" / "View Mission Summary" button or the
   * NarrativeResolution component.
   */
  async assertMissionComplete(): Promise<void> {
    // The final step should show either:
    // 1. "Complete Mission" button (before clicking)
    // 2. "View Mission Summary" button (after completing)
    // 3. NarrativeResolution text
    const completionLocator = this.page
      .locator(
        'button:has-text("Complete Mission"), button:has-text("View Mission Summary"), text="MISSION COMPLETE"',
      )
      .first();

    await expect(completionLocator).toBeVisible({ timeout: UI_TIMEOUT });
  }

  // ──────────────────────────────────────────────
  //  Compound helpers
  // ──────────────────────────────────────────────

  /**
   * Run a single step, dispatching to the correct handler
   * based on step type and quiz presence.
   */
  async runStep(step: MissionStep): Promise<void> {
    switch (step.type) {
      case "concept":
        await this.completeConceptStep();
        break;
      case "observe":
        await this.completeObserveStep();
        break;
      case "command": {
        // Pick the first expectedCommand to type.
        // If there are no expected commands, fall through
        // (shouldn't happen for command steps in practice).
        const cmd = step.expectedCommands[0];
        if (cmd) {
          await this.executeCommand(cmd);
        }
        break;
      }
    }

    // Handle quiz if this step has one
    if (step.hasQuiz && step.quizCorrectIndex !== undefined) {
      await this.answerQuiz(step.quizCorrectIndex);
    }

    // Wait for auto-advance to next step
    await this.waitForStepAdvance();
  }

  /**
   * Run every step in a mission from start to finish,
   * then assert completion.
   */
  async runFullMission(mission: Mission): Promise<void> {
    for (let i = 0; i < mission.steps.length; i++) {
      const step = mission.steps[i];
      const isLastStep = i === mission.steps.length - 1;

      await this.runStep(step);

      // On the last step, don't wait for advance — assert completion instead
      if (isLastStep) {
        await this.assertMissionComplete();
      }
    }
  }
}
