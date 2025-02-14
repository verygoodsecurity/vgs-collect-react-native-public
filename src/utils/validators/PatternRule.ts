import { ValidationRule } from './Validator';

/**
 * A validation rule that checks if the input string
 * matches the specified pattern (regex).
 */
export class PatternRule extends ValidationRule {
  private pattern: string;

  /**
   * @param pattern - The regex pattern to validate against.
   * @param errorMessage - String to display on validation failure.
   */
  constructor(pattern: string, errorMessage: string) {
    super(errorMessage);
    this.pattern = pattern;
  }

  /**
   * Validate that the input matches the provided regex pattern.
   *
   * @param input - The string to validate
   * @returns true if valid, false otherwise
   */
  validate(input: string): boolean {
    // Edge case: handle undefined or null as invalid
    if (!input) {
      return false;
    }

    const regex = new RegExp(this.pattern);
    return regex.test(input);
  }
}
