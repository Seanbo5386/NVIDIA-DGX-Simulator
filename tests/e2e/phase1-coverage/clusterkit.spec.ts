import { test, expect } from '@playwright/test';
import { createHelper } from '../setup/test-helpers';

test.describe('ClusterKit Commands', () => {
  test.beforeEach(async ({ page }) => {
    const helper = await createHelper(page);
    await helper.navigateToSimulator();
  });

  test.describe('Basic clusterkit command', () => {
    test('should execute and show health status', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();

      // Verify terminal output contains expected sections
      await helper.verifyOutputContains('Overall Health Status');
      await helper.verifyOutputContains('GPU Check');
      await helper.verifyOutputContains('Network Check');
      await helper.verifyOutputContains('Storage Check');
      await helper.verifyOutputContains('Firmware Check');
      await helper.verifyOutputContains('Drivers Check');

      // Verify checkmarks for passing tests
      await helper.verifyOutputContains('✓');
    });

    test('should work across all viewports', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();

      // Snapshot for visual regression
      await helper.compareSnapshot('clusterkit-basic');
    });
  });

  test.describe('Verbose mode', () => {
    test('should show detailed component information with --verbose', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit --verbose');
      await helper.waitForCommandOutput();

      // Verify detailed output
      await helper.verifyOutputContains('GPU Details');
      await helper.verifyOutputContains('HCA Details');
      await helper.verifyOutputContains('Driver Version');
      await helper.verifyOutputContains('H100');
      await helper.verifyOutputContains('ConnectX');
    });

    test('should support -v shorthand', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit -v');
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains('GPU Details');
    });

    test('should show more content than basic mode', async ({ page }) => {
      const helper = await createHelper(page);

      // Run basic mode
      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      const basicOutput = await helper.getLastCommandOutput();

      // Clear terminal
      await helper.typeCommand('clear');

      // Run verbose mode
      await helper.typeCommand('clusterkit --verbose');
      await helper.waitForCommandOutput();
      const verboseOutput = await helper.getLastCommandOutput();

      // Verbose should have more content
      expect(verboseOutput.length).toBeGreaterThan(basicOutput.length);
    });
  });

  test.describe('Node targeting', () => {
    test('should target specific node with --node flag', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit --node dgx-01');
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains('dgx-01');
      await helper.verifyOutputContains('Health Status');
    });

    test('should work with different node names', async ({ page }) => {
      const helper = await createHelper(page);

      // Test with first node
      await helper.typeCommand('clusterkit --node dgx-00');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('dgx-00');

      // Test with another node
      await helper.clearTerminal();
      await helper.typeCommand('clusterkit --node dgx-01');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('dgx-01');
    });

    test('should handle invalid node name gracefully', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit --node invalid-node');
      await helper.waitForCommandOutput();

      // Should show error message
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/error|not found|invalid/);
    });

    test('should combine --node and --verbose', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit --node dgx-01 --verbose');
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains('dgx-01');
      await helper.verifyOutputContains('GPU Details');
    });
  });

  test.describe('Error handling', () => {
    test('should reject unknown flags', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit --invalid-flag');
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/error|unknown|invalid/);
    });

    test('should show help with --help', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit --help');
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains('Usage');
      const output = await helper.getTerminalOutput();
      expect(output).toMatch(/--verbose|-v/);
      expect(output).toMatch(/--node/);
    });
  });

  test.describe('Edge cases', () => {
    test('should handle rapid repeated execution', async ({ page }) => {
      const helper = await createHelper(page);

      for (let i = 0; i < 5; i++) {
        await helper.typeCommand('clusterkit');
        await helper.waitForCommandOutput();
      }

      // Should still work correctly
      await helper.verifyOutputContains('Health Status');
    });

    test('should work after other commands', async ({ page }) => {
      const helper = await createHelper(page);

      // Run other commands first
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();

      await helper.typeCommand('ibstat');
      await helper.waitForCommandOutput();

      // ClusterKit should still work
      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('Health Status');
    });

    test('should handle very long output without breaking', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit --verbose');
      await helper.waitForCommandOutput();

      // Terminal should still be responsive
      await helper.typeCommand('help');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('Available');
    });
  });

  test.describe('Responsive behavior', () => {
    test('should work on laptop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.typeCommand('clusterkit --verbose');
      await helper.waitForCommandOutput();

      // Verify output is readable
      await helper.verifyOutputContains('Health Status');
    });

    test('should work on large display', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains('Health Status');
    });
  });
});
