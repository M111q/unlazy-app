import { Injectable, inject } from "@angular/core";
import { ConfigService } from "../config/config.service";

/**
 * Utility service for common helper functions
 * Currently focused on date manipulation for database operations
 */
@Injectable({
  providedIn: "root",
})
export class UtilService {
  private readonly configService = inject(ConfigService);

  /**
   * Get the start of day (00:00:00.000) for given date
   * Used for daily session limit validation
   * @param date - Date string or Date object
   * @returns ISO string representing start of day
   */
  getStartOfDay(date: string | Date): string {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.toISOString();
  }

  /**
   * Get the end of day (23:59:59.999) for given date
   * Used for daily session limit validation
   * @param date - Date string or Date object
   * @returns ISO string representing end of day
   */
  getEndOfDay(date: string | Date): string {
    const targetDate = new Date(date);
    targetDate.setHours(23, 59, 59, 999);
    return targetDate.toISOString();
  }

  /**
   * Format a date for display purposes in the UI.
   * Uses the format defined in ConfigService.dateFormat.
   * Note: Actual formatting logic would typically use Angular's DatePipe,
   * but this method demonstrates usage of ConfigService for format definition.
   * @param date - The date to format.
   * @returns Formatted date string.
   */
  formatDateForDisplay(date: string | Date): string {
    const format = this.configService.dateFormat;
    // Placeholder for actual date formatting logic using 'format'
    // Example: return new DatePipe('en-US').transform(date, format);
    return `Formatted using format: ${format}`; // Placeholder implementation
  }
}
