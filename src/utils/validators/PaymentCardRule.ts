import { ValidationRule } from './Validator';
import { LuhnCheckRule } from './LuhnCheckRule';
import { PaymentCardBrandsManager } from '../paymentCards/PaymentCardBrandsManager';
import { CheckSumAlgorithmType } from '../paymentCards/PaymentCardBrand';

export class PaymentCardRule extends ValidationRule {
  private validateUnknownCardBrand: boolean;

  /**
   * @param errorMessage - string to display on validation failure.
   * @param validateUnknownCardBrand - if true, attempts validation with the fallback brand.
   */
  constructor(errorMessage: string, validateUnknownCardBrand = false) {
    super(errorMessage);
    this.validateUnknownCardBrand = validateUnknownCardBrand;
  }

  validate(input: string): boolean {
    // Remove spaces & dashes
    const cardNumber = input.replace(/\s+|-/g, '');

    // Must be numeric
    if (!/^\d+$/.test(cardNumber)) {
      return false;
    }

    // Detect known brand
    const manager = PaymentCardBrandsManager.getInstance();
    let brand = manager.detectBrand(cardNumber);

    if (brand) {
      // ### Known brand ###
      // 1) Check length
      if (!brand.cardNumberLengths.includes(cardNumber.length)) {
        return false;
      }
      // 2) If brand uses Luhn, check it
      if (
        brand.checkSumAlgorithm === CheckSumAlgorithmType.LUHN &&
        !LuhnCheckRule.prototype.validate(cardNumber)
      ) {
        return false;
      }
      return true; // passed
    } else if (!brand && this.validateUnknownCardBrand) {
      // ### Unknown brand case ###
      const unknownBrand = manager.getUnknownBrand();
      if (!unknownBrand) {
        // If there's no fallback brand defined, fail immediately
        return false;
      }
      // Check length
      if (!unknownBrand.cardNumberLengths.includes(cardNumber.length)) {
        return false;
      }
      // Check Luhn if needed
      if (
        unknownBrand.checkSumAlgorithm === CheckSumAlgorithmType.LUHN &&
        !LuhnCheckRule.prototype.validate(cardNumber)
      ) {
        return false;
      }
      return true;
    }

    // If brand is unknown and we do NOT validate unknown => fail
    return false;
  }
}
