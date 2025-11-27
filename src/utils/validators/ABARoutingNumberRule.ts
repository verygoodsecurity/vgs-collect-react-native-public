import { ValidationRule } from './Validator';

/**
 * ABARoutingNumberRule
 *
 * Validates US ABA routing numbers.
 * Requirements:
 * - Exactly 9 digits
 * - Checksum: 3*(d0+d3+d6) + 7*(d1+d4+d7) + 1*(d2+d5+d8) must be divisible by 10
 */
export class ABARoutingNumberRule extends ValidationRule {
  constructor(errorMessage: string) {
    super(errorMessage);
  }

  validate(input: string): boolean {
    if (!input || !/^\d{9}$/.test(input)) {
      return false;
    }

    const digits = input.split('').map(Number);
    // Regex ensures length is exactly 9; non-null assertions satisfy noUncheckedIndexedAccess.
    const sum =
      3 * (digits[0]! + digits[3]! + digits[6]!) +
      7 * (digits[1]! + digits[4]! + digits[7]!) +
      1 * (digits[2]! + digits[5]! + digits[8]!);

    return sum % 10 === 0;
  }
}

export default ABARoutingNumberRule;
