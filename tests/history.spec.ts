import { expect, test } from '@playwright/test'
import { clickAndWaitForResponse, requests } from './support'

test.beforeEach(async ({ page }) => {
  await page.goto('/history/1')
})

test('it will not encrypt history by default', async ({ page }) => {
  const historyState1 = await page.evaluate(() => window.history.state)
  await expect(historyState1.page.component).toBe('History/Page')
  await expect(historyState1.page.props.pageNumber).toBe('1')
  await expect(historyState1.timestamp).toBeGreaterThan(0)
  await expect(page.getByText('This is page 1')).toBeVisible()

  await clickAndWaitForResponse(page, 'Page 2', '/history/2')
  const historyState2 = await page.evaluate(() => window.history.state)
  await expect(historyState2.page.component).toBe('History/Page')
  await expect(historyState2.page.props.pageNumber).toBe('2')
  await expect(page.getByText('This is page 2')).toBeVisible()
  await expect(historyState2.timestamp).toBeGreaterThan(0)

  requests.listen(page)

  await page.goBack()
  await page.waitForURL('/history/1')
  await expect(page.getByText('This is page 1')).toBeVisible()
  await expect(requests.requests).toHaveLength(0)

  await page.goForward()
  await page.waitForURL('/history/2')
  await expect(page.getByText('This is page 2')).toBeVisible()
  await expect(requests.requests).toHaveLength(0)
})

test('it can encrypt history', async ({ page }) => {
  await clickAndWaitForResponse(page, 'Page 3', '/history/3')
  const historyState3 = await page.evaluate(() => window.history.state)
  // When history is encrypted, the page is an ArrayBuffer,
  // but Playwright doesn't transfer it as such over the wire (page.evaluate),
  // so if the object is "empty" and the page check below works, it's working.
  await expect(historyState3.page).toEqual({})
  await expect(historyState3.timestamp).toBeGreaterThan(0)

  requests.listen(page)

  await page.goBack()
  await page.waitForURL('/history/1')
  await expect(page.getByText('This is page 1')).toBeVisible()
  await expect(requests.requests).toHaveLength(0)

  // Double check that this history state did not get encrypted
  const historyState1 = await page.evaluate(() => window.history.state)
  await expect(historyState1.page.component).toBe('History/Page')
  await expect(historyState1.page.props.pageNumber).toBe('1')
  await expect(historyState1.timestamp).toBeGreaterThan(0)

  await page.goForward()
  await page.waitForURL('/history/3')
  const historyState3Check = await page.evaluate(() => window.history.state)
  await expect(historyState3Check.page).toEqual({})
  await expect(page.getByText('This is page 3')).toBeVisible()
  await expect(requests.requests).toHaveLength(0)
})

test('history can be cleared via router', async ({ page }) => {
  await clickAndWaitForResponse(page, 'Page 3', '/history/3')

  await page.goBack()
  await page.waitForURL('/history/1')

  await page.getByRole('button', { name: 'Clear History' }).click()

  requests.listen(page)

  await page.goForward()
  await page.waitForURL('/history/3')
  await expect(page.getByText('This is page 3')).toBeVisible()
  await expect(requests.requests).toHaveLength(1)

  await page.goBack()
  await page.waitForURL('/history/1')
  // Should be the same, non-encrypted history state doesn't get cleared
  await expect(requests.requests).toHaveLength(1)

  await page.goForward()
  await page.waitForURL('/history/3')
  await expect(requests.requests).toHaveLength(1)
})

test('history can be cleared via props', async ({ page }) => {
  await clickAndWaitForResponse(page, 'Page 3', '/history/3')
  await clickAndWaitForResponse(page, 'Page 4', '/history/4')

  requests.listen(page)

  await page.goBack()
  await page.waitForURL('/history/3')
  await expect(page.getByText('This is page 3')).toBeVisible()
  await expect(requests.requests).toHaveLength(1)

  await page.goBack()
  await page.waitForURL('/history/1')
  // Should be the same, non-encrypted history state doesn't get cleared
  await expect(requests.requests).toHaveLength(1)

  await page.goForward()
  await page.waitForURL('/history/3')
  await expect(requests.requests).toHaveLength(1)
})