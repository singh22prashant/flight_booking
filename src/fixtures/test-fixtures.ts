import { test as base } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BookingFlightsPage } from '../pages/booking-flights.page';

type Fixtures = {
  bookingFlightsPage: BookingFlightsPage;
};

export const test = base.extend<Fixtures>({
  bookingFlightsPage: async ({ page }, use) => {
    // The live autocomplete and flight APIs are blocked or unstable in tests.
    const flightResults = readFileSync(
      resolve(__dirname, '../data/mock-flight-results.json'),
      'utf8',
    );
    const cheapestFlightResults = readFileSync(
      resolve(__dirname, '../data/mock-flight-results-cheapest.json'),
      'utf8',
    );

    await page.route('https://flights.booking.com/api/autocomplete/**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const query = requestUrl.searchParams.get('q')?.toUpperCase();

      if (query !== 'BOM' && query !== 'DEL') {
        await route.continue();
        return;
      }

      // Return only the airports used by this suite; unrelated queries stay live.
      const airport = query === 'DEL'
        ? {
            code: 'DEL',
            name: 'Delhi International Airport',
            city: 'New Delhi',
          }
        : {
            code: 'BOM',
            name: 'Mumbai',
            city: 'Mumbai',
          };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            ...airport,
            country: 'India',
            type: 'AIRPORT',
          },
        ]),
      });
    });

    await page.route('https://flights.booking.com/api/flights/**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const departureDate = requestUrl.searchParams.get('depart');
      // Match the response fixture to the UI's selected sort mode.
      const source =
        requestUrl.searchParams.get('sort') === 'CHEAPEST'
          ? cheapestFlightResults
          : flightResults;
      const responseBody = departureDate
        // The captured fixture uses one sample date; preserve the test's dynamic date.
        ? source.replaceAll('2026-10-24', departureDate)
        : source;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: responseBody,
      });
    });

    await use(new BookingFlightsPage(page));
  },
});
