import { ValidationRule } from './Validator';

export class NotEmptyRule extends ValidationRule {
  validate(input: string): boolean {
    if (input == null) {
      return false;
    }
    return input.trim().length > 0;
  }
}
