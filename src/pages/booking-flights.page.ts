import { Locator, Page } from '@playwright/test';

export class BookingFlightsPage {
  readonly page: Page;
  readonly origin: Locator;
  readonly destination: Locator;
  readonly travelDates: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.origin = page.locator('[data-ui-name="input_location_from_segment_0"]');
    this.destination = page.locator('[data-ui-name="input_location_to_segment_0"]');
    this.travelDates = page.locator('[data-ui-name="button_date_segment_0"]');
    this.searchButton = page.locator('[data-ui-name="button_search_submit"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/flights/index.en-gb.html', { waitUntil: 'domcontentloaded' });
  }

  async selectDestination(code: string): Promise<void> {
    await this.destination.click();
    const input = this.page.getByRole('combobox', { name: 'Arrival airport or city' });
    const serviceError = this.page.getByText(/Oops, something's not right/i);
    await input.waitFor({ state: 'visible' });
    await input.fill(code);

    const airportSuggestion = this.page
      .locator('[role="option"], [data-ui-name*="airport"], [data-ui-name*="location"]')
      .filter({ hasText: new RegExp(`\\b${code}\\b`, 'i') })
      .last();

    // Booking's live autocomplete can return a service error instead of suggestions.
    await Promise.race([
      airportSuggestion.waitFor({ state: 'visible' }),
      serviceError.waitFor({ state: 'visible' }),
    ]);

    if (await serviceError.isVisible()) {
      throw new Error(
        `Booking.com did not return airport suggestions for destination ${code}.`,
      );
    }

    await airportSuggestion.click();
  }

  async selectOneWay(): Promise<void> {
    const oneWayRadio = this.page.getByRole('radio', { name: 'One way' });

    if (await oneWayRadio.count()) {
      await oneWayRadio.check();
      return;
    }

    // Booking exposes the control as visible text in some CI/browser variants.
    await this.page.getByText('One way', { exact: true }).click();
  }

  async selectDepartureDate(daysFromToday: number): Promise<Date> {
    await this.travelDates.click();
    // Booking opens on a future month; the previous month contains the current date.
    await this.page.getByRole('button', { name: 'Previous month' }).click();

    const today = this.page.locator(
      '[role="checkbox"][aria-current="date"][data-date]',
    );
    const todayValue = await today.getAttribute('data-date');

    if (!todayValue) {
      throw new Error('Could not determine today in the calendar.');
    }

    const [year, month, day] = todayValue.split('-').map(Number);
    const departureDate = new Date(year, month - 1, day);
    departureDate.setDate(departureDate.getDate() + daysFromToday);
    // Build the calendar key in local time so midnight does not shift the date.
    const dateValue = [
      departureDate.getFullYear(),
      String(departureDate.getMonth() + 1).padStart(2, '0'),
      String(departureDate.getDate()).padStart(2, '0'),
    ].join('-');

    await this.page
      .locator(`[role="checkbox"][data-date="${dateValue}"]`)
      .click();
    return departureDate;
  }

  async search(): Promise<void> {
    await this.searchButton.click();
    await this.page.waitForURL(/\/flights\//, { waitUntil: 'domcontentloaded' });
  }

  async sortByCheapest(): Promise<void> {
    // Selecting the menu item triggers Booking's CHEAPEST results request.
    await this.page.getByRole('button', { name: 'Sort by: Best' }).click();
    await this.page.getByRole('menuitem', { name: 'Cheapest' }).click();
  }
}
