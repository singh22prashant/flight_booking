import { flightRoute } from '../src/data/flight-data';
import { expect } from '@playwright/test';
import { test } from '../src/fixtures/test-fixtures';

const assertSearchResults = async (
  bookingFlightsPage: {
    page: import('@playwright/test').Page;
  },
  departureDate: Date,
): Promise<void> => {
  // Keep the common result-page checks in the spec so test assertions stay
  // separate from page-object interactions.
  await expect(bookingFlightsPage.page).toHaveURL(/\/flights\//);
  await expect(bookingFlightsPage.page.locator('body')).toContainText(
    flightRoute.originCode,
  );
  await expect(bookingFlightsPage.page.locator('body')).toContainText(
    flightRoute.destinationCode,
  );
  await expect(bookingFlightsPage.page.locator('body')).toContainText('IndiGo');
  await expect(bookingFlightsPage.page.locator('body')).toContainText(
    'flight options',
  );
  await expect(bookingFlightsPage.page.locator('body')).toContainText(
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(departureDate),
  );
};

test('searches DEL to BOM one way for today', async ({
  bookingFlightsPage,
}) => {
  await bookingFlightsPage.open();
  await bookingFlightsPage.selectOneWay();
  await bookingFlightsPage.selectOrigin(flightRoute.originCode);
  await bookingFlightsPage.selectDestination(flightRoute.destinationCode);
  // The page object derives the date from the calendar's highlighted today.
  const departureDate = await bookingFlightsPage.selectDepartureDate(0);
  await expect(bookingFlightsPage.origin).toContainText(flightRoute.originCode);
  await expect(bookingFlightsPage.destination).toContainText(
    flightRoute.destinationCode,
  );
  await expect(bookingFlightsPage.travelDates).toContainText(
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
      departureDate,
    ),
  );
  await bookingFlightsPage.search();
  await assertSearchResults(bookingFlightsPage, departureDate);
});

test('searches DEL to BOM one way for tomorrow', async ({
  bookingFlightsPage,
}) => {
  await bookingFlightsPage.open();
  await bookingFlightsPage.selectOneWay();
  await bookingFlightsPage.selectOrigin(flightRoute.originCode);
  await bookingFlightsPage.selectDestination(flightRoute.destinationCode);
  // Offset one day from the calendar-derived today date to avoid runner timezone drift.
  const departureDate = await bookingFlightsPage.selectDepartureDate(1);
  await expect(bookingFlightsPage.origin).toContainText(flightRoute.originCode);
  await expect(bookingFlightsPage.destination).toContainText(
    flightRoute.destinationCode,
  );
  await expect(bookingFlightsPage.travelDates).toContainText(
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
      departureDate,
    ),
  );
  await bookingFlightsPage.search();
  await assertSearchResults(bookingFlightsPage, departureDate);
});

test('sorts DEL to BOM one-way results by cheapest price', async ({
  bookingFlightsPage,
}) => {
  await bookingFlightsPage.open();
  await bookingFlightsPage.selectOneWay();
  await bookingFlightsPage.selectOrigin(flightRoute.originCode);
  await bookingFlightsPage.selectDestination(flightRoute.destinationCode);
  const departureDate = await bookingFlightsPage.selectDepartureDate(0);
  await bookingFlightsPage.search();
  await assertSearchResults(bookingFlightsPage, departureDate);
  await bookingFlightsPage.sortByCheapest();
  // Verify both the selected sort mode and the actual rendered price order.
  await expect(
    bookingFlightsPage.page.getByRole('button', { name: 'Sort by: Cheapest' }),
  ).toBeVisible();
  const prices = await bookingFlightsPage.page
    .getByText(/^INR[\d,]+$/)
    .allTextContents();
  const numericPrices = prices.map((price) => Number(price.replace(/[^\d]/g, '')));
  expect(numericPrices.length).toBeGreaterThan(1);
  expect(numericPrices).toEqual([...numericPrices].sort((a, b) => a - b));
});
