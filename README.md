# Flight Booking Playwright Tests

Playwright end-to-end tests for a one-way flight search from Delhi (`DEL`) to Mumbai (`BOM`).

## Prerequisites

- Node.js 18 or newer
- npm

## Install

```bash
npm ci
npx playwright install
```

## Run the tests

Run the suite in headless Chromium:

```bash
npm test
```

Run the suite with a visible browser:

```bash
npm run test:headed
```

Open the HTML report:

```bash
npm run report
```

## Test coverage

The suite contains three scenarios:

1. Search one-way flights for today's date.
2. Search one-way flights for tomorrow's date.
3. Sort the results by **Cheapest** and verify prices are ordered from lowest to highest.

The tests explicitly select:

- One-way trip type
- Origin airport `DEL`
- Destination airport `BOM`
- A dynamic departure date

## Test design

- `tests/search-flights.spec.ts` contains the test flows and all assertions.
- `src/pages/booking-flights.page.ts` contains page interactions and locators.
- `src/fixtures/test-fixtures.ts` configures the page fixture and network mocks.
- `src/data/flight-data.ts` contains route data.

Assertions intentionally remain in the test file rather than the page object or fixtures.

## Network mocks

The tests mock Booking.com's live flight APIs so they are not dependent on bot protection, live availability, or changing flight inventory:

- Destination autocomplete for `DEL` and `BOM`
- Standard flight results
- Cheapest-sorted flight results

The flight response date is rewritten at runtime to match the date selected by the test.
