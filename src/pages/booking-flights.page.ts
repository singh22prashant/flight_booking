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
    await this.selectLocation(
      this.destination,
      'Arrival airport or city',
      code,
    );
  }

  async selectOrigin(code: string): Promise<void> {
    await this.selectLocation(
      this.origin,
      'Departure airport or city',
      code,
    );
  }

  private async selectLocation(
    field: Locator,
    inputName: string,
    code: string,
  ): Promise<void> {
    await field.click();
    const input = this.page.getByRole('combobox', { name: inputName });
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
        `Booking.com did not return airport suggestions for ${inputName.toLowerCase()} ${code}.`,
      );
    }

    await airportSuggestion.click();
  }

  async selectOneWay(): Promise<void> {
    // Booking renders the radio input without an accessible radio role in CI.
    await this.page
      .locator('[data-ui-name="input_search_type_oneway"]')
      .check();
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
