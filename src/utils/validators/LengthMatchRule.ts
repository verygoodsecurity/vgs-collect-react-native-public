import { ValidationRule } from './Validator';

/**
 * A validation rule that checks if the input string
 * has an exact specified length.
 */
export class LengthMatchRule extends ValidationRule {
  private length: number;

  /**
   * @param length - required exact length for validation
   * @param errorMessage - string to display on validation failure.
   */
  constructor(length: number, errorMessage: string) {
    super(errorMessage);
    this.length = length;
  }

  /**
   * Validate that the input has exactly the specified length.
   *
   * @param input - The string to validate
   * @returns true if valid, false otherwise
   */
  validate(input: string): boolean {
    // Edge case: handle undefined or null as invalid
    if (!input) {
      return false;
    }

    return input.length === this.length;
  }
}
