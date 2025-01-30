import { ValidationRule } from './Validator';

/**
 * A validation rule that checks if the input string
 * is a valid card expiration date based on the specified format.
 */
export class CardExpDateRule extends ValidationRule {
  private dateFormat: 'mmyy' | 'mmyyyy';

  /**
   * @param dateFormat - The format of the expiration date ('mmyy' or 'mmyyyy').
   * @param errorMessage - String to display on validation failure.
   */
  constructor(dateFormat: 'mmyy' | 'mmyyyy', errorMessage: string) {
    super(errorMessage);
    this.dateFormat = dateFormat;
  }

  /**
   * Validate that the input is a valid card expiration date.
   *
   * @param value - The expiration date string to validate.
   * @returns true if valid, false otherwise.
   */
  validate(value: string): boolean {
    if (!value) {
      return false;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Months are zero-based
    const maxYear = currentYear + 20;

    let month: number;
    let year: number;

    if (this.dateFormat === 'mmyy') {
      if (!/^\d{4}$/.test(value)) return false;
      month = parseInt(value.slice(0, 2), 10);
      year = parseInt(`20${value.slice(2, 4)}`, 10);
    } else if (this.dateFormat === 'mmyyyy') {
      if (!/^\d{6}$/.test(value)) return false;
      month = parseInt(value.slice(0, 2), 10);
      year = parseInt(value.slice(2, 6), 10);
    } else {
      return false;
    }

    if (month < 1 || month > 12) return false;
    if (year < currentYear || year > maxYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }
}
