import { test, expect } from '@playwright/test';

test.describe('ChangeProof Workbench E2E Flow', () => {
  test('primary reviewer flow: sample analysis, inspect findings, record decision, and export', async ({
    page,
  }) => {
    // 1. Open dashboard
    await page.goto('/');
    await expect(page.locator('.brand-title')).toHaveText('ChangeProof');

    // 2. Run bundled sample analysis
    const runSampleBtn = page.locator('#btn-run-sample');
    await expect(runSampleBtn).toBeVisible();
    await runSampleBtn.click();
    await expect(runSampleBtn).not.toContainText('Analyzing');
    await expect(runSampleBtn).toBeEnabled();

    // 3. Confirm summary counts on overview
    await expect(page.locator('#stat-card-requirements .stat-value')).toHaveText('5');
    await expect(page.locator('#stat-card-artifacts .stat-value')).toHaveText('5');
    await expect(page.locator('#stat-card-tests .stat-value')).toHaveText('12');
    await expect(page.locator('#stat-card-links .stat-value')).toHaveText('48');

    // Check tabs navigation
    const traceabilityTabBtn = page.locator('#tab-btn-traceability');
    await traceabilityTabBtn.click();
    await expect(page.locator('#traceability-table')).toBeVisible();
    await expect(page.locator('#row-REQ-001')).toBeVisible();

    // 4. Open findings view
    const findingsTabBtn = page.locator('#tab-btn-findings');
    await findingsTabBtn.click();
    await expect(page.locator('#findings-filter-bar')).toBeVisible();

    // Filter findings
    const severityFilter = page.locator('#filter-severity');
    await severityFilter.selectOption('high');
    await expect(page.locator('#finding-card-finding-000004')).toBeVisible();

    // 5. Open finding drawer
    const openDrawerBtn = page.locator('#btn-open-drawer-finding-000004');
    await openDrawerBtn.click();
    await expect(page.locator('#evidence-drawer')).toBeVisible();
    await expect(page.locator('#evidence-drawer')).toContainText('TEST_GAP_ON_CHANGED_SYMBOL');

    // 6. Record a human decision
    await page.locator('input[value="deferred"]').check();
    await page.locator('#input-decided-by').fill('qa-lead@changeproof.local');
    await page
      .locator('#input-decision-rationale')
      .fill('Deferred until sprint 42 batch ingestion test is written.');

    const submitBtn = page.locator('#btn-submit-decision');
    await submitBtn.click();

    // Confirm decision persistence in UI
    await expect(page.locator('#evidence-drawer')).toContainText('Decision saved successfully');

    // Close drawer
    await page.locator('#btn-close-drawer').click();
    await expect(page.locator('#evidence-drawer')).not.toBeVisible();

    // Decision badge should now be visible on the card
    await expect(page.locator('#finding-card-finding-000004')).toContainText('Decision: deferred');

    // 7. Trigger export
    const exportBtn = page.locator('#btn-export-menu');
    await exportBtn.click();
    await expect(page.locator('#export-modal')).toBeVisible();
    await expect(page.locator('#btn-download-export')).toBeVisible();

    // Switch to JSON format
    await page.locator('#btn-format-json').click();
    await expect(page.locator('#export-modal')).toContainText('schemaVersion');

    // Close export modal
    await page.locator('#btn-close-export').click();
    await expect(page.locator('#export-modal')).not.toBeVisible();
  });

  test('multi-scenario selector: switch between Auth and Payments scenarios and run analysis', async ({
    page,
  }) => {
    await page.goto('/');

    const scenarioSelect = page.locator('#select-scenario');
    await expect(scenarioSelect).toBeVisible();

    // 1. Select Auth scenario (page stays blank until Run Analysis is clicked)
    await scenarioSelect.selectOption('auth');
    await expect(page.locator('#empty-scenario-state')).toBeVisible();

    // Click Run Analysis to populate Auth
    await page.locator('#btn-run-sample').click();
    await expect(page.locator('#btn-run-sample')).toBeEnabled();

    // Verify Auth analysis loaded
    await expect(page.locator('#app-header')).toContainText('Auth & Session Service');
    await expect(page.locator('#stat-card-requirements .stat-value')).toHaveText('5');
    await expect(page.locator('#stat-card-artifacts .stat-value')).toHaveText('3');

    // Check findings tab for Auth findings
    await page.locator('#tab-btn-findings').click();
    await expect(page.locator('#findings-tab-view')).toContainText('CONFIG_OR_SCHEMA_CHANGED');

    // 2. Select Payments scenario (page stays blank until Run Analysis is clicked)
    await scenarioSelect.selectOption('payments');
    await expect(page.locator('#empty-scenario-state')).toBeVisible();

    // Click Run Analysis to populate Payments
    await page.locator('#btn-run-sample').click();
    await expect(page.locator('#btn-run-sample')).toBeEnabled();

    // Verify Payments analysis loaded
    await expect(page.locator('#app-header')).toContainText('Payment Gateway & Webhooks');
    await expect(page.locator('#findings-tab-view')).toContainText('CODE_WITHOUT_REQ');

    // 3. Traceability matrix should display REQ-201
    await page.locator('#tab-btn-traceability').click();
    await expect(page.locator('#row-REQ-201')).toBeVisible();
  });
});
