import { ValidationRule } from './Validator';

/**
 * Interface representing a date with day, month, and year components.
 */
interface VGSDateInterface {
  day: number;
  month: number;
  year: number;
}
/** Class representing a date with day, month, and year components. */
export class VGSDate implements VGSDateInterface {
  day: number;
  month: number;
  year: number;

  public constructor(date: number, month: number, year: number) {
    this.day = date;
    this.month = month;
    this.year = year;
  }

  /**  Create VGSDate from string with given format */
  public static dateFromString(dateString: string, format: VGSDateFormatType): VGSDate | null {
    if (dateString.length === 8) {
      var day = NaN
      var month = NaN
      var year = NaN
      switch (format) {
        case 'mmddyyyy': {
          month = parseInt(dateString.slice(0, 2), NaN);
          day = parseInt(dateString.slice(2, 4), NaN);
          year = parseInt(dateString.slice(4, 8), NaN);
          break
        }
        case 'ddmmyyyy': {
          day = parseInt(dateString.slice(0, 2), NaN);
          month = parseInt(dateString.slice(2, 4), NaN);
          year = parseInt(dateString.slice(4, 8), NaN);
          break;
        }
        case 'yyyymmdd': {
          year = parseInt(dateString.slice(0, 4), NaN);
          month = parseInt(dateString.slice(4, 6), NaN);
          day = parseInt(dateString.slice(6, 8), NaN);
          break
        }
        default:
          console.error(`Wrong VGSDateFormatType: ${format}`);
          return null;
      }
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new VGSDate(day, month, year);
      }
      return null;
    }
    else {
      return null;
    }
  }

  /** Compare if this date is less than or equal to another VGSDate */
  public lte(other: VGSDate): boolean {
    if (this.year !== other.year) {
      return this.year < other.year;
    }
    if (this.month !== other.month) {
      return this.month < other.month;
    }
    return this.day <= other.day;
  }

  /** Compare if this date is greater than or equal to another VGSDate */
  public gte(other: VGSDate): boolean {
    if (this.year !== other.year) {
      return this.year > other.year;
    }
    if (this.month !== other.month) {
      return this.month > other.month;
    }
    return this.day >= other.day;
  }

  /** Check if this date is between two other dates (inclusive) */
  public isBetween(start: VGSDate, end: VGSDate): boolean {
    return this.gte(start) && this.lte(end);
  }
}

/** Type representing supported date formats */
export type VGSDateFormatType = 'ddmmyyyy' | 'mmddyyyy' | 'yyyymmdd';

export class DateRangeRule extends ValidationRule {
  private dateFormat: VGSDateFormatType;
  private startDate: VGSDate | null = null;
  private endDate: VGSDate | null = null;

  /**
   * @param dateFormat - The format of the expiration date ('mmyy' or 'mmyyyy').
   * @param errorMessage - String to display on validation failure.
   * @param start - Optional start date for the valid range.
   * @param end - Optional end date for the valid range.
   */
  public constructor(dateFormat: VGSDateFormatType, errorMessage: string, start?: VGSDate, end?: VGSDate) {
    super(errorMessage);
    this.dateFormat = dateFormat;
    this.startDate = start ?? null;
    this.endDate = end ?? null;
  }

  /**
   * Validate that the input in a date range.
   *
   * @param value - The expiration date string to validate.
   * @returns true if valid, false otherwise.
   */
  validate(value: string): boolean {
    if (!value) {
      return false;
    }
    const inputDate = VGSDate.dateFromString(value, this.dateFormat)
    if (!inputDate) {
      return false;
    }
    // When startDate and endDate are set, validate that startDate <= inputDate <= endDate
    if (this.startDate && this.endDate) {
      return inputDate.isBetween(this.startDate, this.endDate);
    }

    // When only startDate is set, validate that startDate <= inputDate
    if (this.startDate) {
      return inputDate.gte(this.startDate);
    }

    // When only endDate is set, validate that inputDate <= endDate
    if (this.endDate) {
      return inputDate.lte(this.endDate);
    }
    // If no date constraints are set, the date is considered valid
    return true;
  }
}
