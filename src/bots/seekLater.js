import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.seek.com.au/');
  await page.getByRole('combobox', { name: 'What' }).click();
  await page.getByRole('combobox', { name: 'What' }).fill('java');
  await page.getByRole('combobox', { name: 'Where' }).click();
  await page.getByRole('combobox', { name: 'Where' }).fill('sydney');
  await page.getByRole('button', { name: 'Submit search' }).click();
  await page.locator('#jobcard-1').getByTestId('job-list-item-link-overlay').click();
  await page.locator('#jobcard-2').getByTestId('job-list-item-link-overlay').click();
  await page.getByRole('article', { name: 'Senior Java Developer (Full' }).getByTestId('job-list-item-link-overlay').click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Apply for Senior Java' }).click();
  const page1 = await page1Promise;
  await page1.getByRole('button', { name: 'Choose documents' }).click();
  await page1.getByRole('listitem').filter({ hasText: 'Answer employer questions' }).click();
  await page1.getByRole('listitem').filter({ hasText: 'Update SEEK Profile' }).click();
  await page1.getByRole('listitem').filter({ hasText: 'Review and submit' }).click();
  await page1.locator('label').filter({ hasText: 'Upload a resumé' }).click();
  await page1.locator('label').filter({ hasText: 'Select a resumé' }).click();
  await page1.getByTestId('select-input').selectOption('c9866ead-e1c9-4882-8058-e6de85cde638');
  await page1.locator('label').filter({ hasText: 'Don\'t include a resumé' }).click();
  await page1.locator('label').filter({ hasText: 'Upload a cover letter' }).click();
  await page1.locator('label').filter({ hasText: 'Write a cover letter' }).click();
  await page1.locator('label').filter({ hasText: 'Don\'t include a cover letter' }).click();
  await page1.getByTestId('continue-button').click();
});
