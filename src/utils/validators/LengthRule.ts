import { ValidationRule } from './Validator';

/**
 * A validation rule that checks if the length of the input string
 * is between the specified `min` and `max` bounds.
 */
export class LengthRule extends ValidationRule {
  private min: number;
  private max: number;

  /**
   * @param min - minimal length (default: 0)
   * @param max - maximum length (default: Infinity)
   * @param errorMessage - string to display on validation failure.
   */
  constructor(min: number = 0, max: number = Infinity, errorMessage: string) {
    super(errorMessage);
    this.min = min;
    this.max = max;
  }

  /**
   * Validate that the input length is >= min and <= max.
   *
   * @param input - The string to validate
   * @returns true if valid, false otherwise
   */
  validate(input: string): boolean {
    // Edge case: handle undefined or null as invalid
    if (!input) {
      return false;
    }

    return input.length >= this.min && input.length <= this.max;
  }
}
