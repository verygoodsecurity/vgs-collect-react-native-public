import { ValidationRule } from './Validator';

/** Class representing a non-empty string validation rule. */
export class NotEmptyRule extends ValidationRule {
  validate(input: string): boolean {
    if (input == null) {
      return false;
    }
    return input.trim().length > 0;
  }
}
