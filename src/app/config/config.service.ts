import { Injectable } from "@angular/core";

/**
 * Configuration service for UI and application settings
 * Contains formatting preferences and UI behavior configuration
 */
@Injectable({
  providedIn: "root",
})
export class ConfigService {
  // ========================================
  // DATE & TIME FORMATTING
  // ========================================

  /**
   * Date format for display in UI components
   * Using Angular date pipe format
   * 'dd/MM/yyyy' = 31/12/2023, 'MM/dd/yyyy' = 12/31/2023
   */
  readonly dateFormat = "dd/MM/yyyy";

  /**
   * Date format for database operations and API calls
   * ISO 8601 format for consistency
   */
  readonly dateFormatISO = "yyyy-MM-dd";

  /**
   * Time display format
   * 'HH:mm:ss' = 24-hour format (23:59:59)
   * 'hh:mm:ss a' = 12-hour format with AM/PM (11:59:59 PM)
   */
  readonly timeDisplayFormat = "HH:mm:ss";

  /**
   * Whether to use 24-hour time format
   * true = 23:59, false = 11:59 PM
   */
  readonly use24HourFormat = true;

  /**
   * DateTime format for session timestamps
   * Combines date and time formatting
   */
  readonly dateTimeFormat = `${this.dateFormat} ${this.timeDisplayFormat}`;

  /**
   * First day of the week for calendar components
   * 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
   * Most European countries use Monday (1) as first day
   */
  readonly firstDayOfWeek = 1; // Monday

  /**
   * First day of week as string (for display purposes)
   */
  readonly firstDayOfWeekName = "Monday";

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Get day names starting from configured first day of week
   * Useful for calendar headers
   */
  getDayNames(): string[] {
    const allDays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return [
      ...allDays.slice(this.firstDayOfWeek),
      ...allDays.slice(0, this.firstDayOfWeek),
    ];
  }

  /**
   * Get short day names starting from configured first day of week
   * Useful for compact calendar displays
   */
  getShortDayNames(): string[] {
    const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return [
      ...allDays.slice(this.firstDayOfWeek),
      ...allDays.slice(0, this.firstDayOfWeek),
    ];
  }
}
