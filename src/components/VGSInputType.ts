import { DEFAULT_CARD_MASK } from '../utils/paymentCards/PaymentCardBrand';
import { PatternRule, PaymentCardRule, LengthRule } from '../utils/validators';
import { CardExpDateRule } from '../utils/validators/CardExpDateRule';
import { ValidationRule } from '../utils/validators/Validator';

export type VGSInputType =
  | 'text'
  | 'card'
  | 'cardHolderName'
  | 'expDate'
  | 'cvc'
  | 'ssn';

/**
 * Predefined default config for each field type.
 * Developers can override these defaults via VGSTextInput props.
 */
export const inputTypeDefaults: Record<
  string,
  {
    mask?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    validationRules?: ValidationRule[];
  }
> = {
  // For standard text input (no custom config)
  text: {
    mask: undefined,
    keyboardType: 'default',
    validationRules: [],
  },

  cardHolderName: {
    mask: undefined,
    keyboardType: 'default',
    // Basic pattern check: "Invalid cardholder name"
    validationRules: [
      new PatternRule(
        "^([a-zA-Z0-9\\ \\,\\.\\-\\']{2,})$",
        'INVALID_CARDHOLDER_NAME'
      ),
    ],
  },

  card: {
    mask: DEFAULT_CARD_MASK,
    keyboardType: 'numeric',
    validationRules: [new PaymentCardRule('INVALID_CARD_NUMBER', false)],
  },

  cvc: {
    mask: '###',
    keyboardType: 'numeric',
    validationRules: [
      new PatternRule('\\d*$', 'INVALID_CVC'),
      new LengthRule(3, 3, 'INVALID_CVC_LEHGTH'),
    ],
  },

  expDate: {
    mask: '##/##', // e.g., "MM/YY
    keyboardType: 'numeric',
    validationRules: [new CardExpDateRule('mmyy', 'INVALID_EXP_DATE')],
  },

  date: {
    mask: '##/##/####', // e.g., "MM/DD/YYYY"
    keyboardType: 'numeric',
    validationRules: [
      new PatternRule(
        '^([0-9]{2})\\/?([0-9]{2})\\/?([0-9]{4})$',
        'Invalid date format (MM/DD/YYYY).'
      ),
    ],
  },

  ssn: {
    mask: '###-##-####',
    keyboardType: 'numeric',
    validationRules: [
      new PatternRule(
        '^(?!000|666|9\\d{2})\\d{3}(-|\\s)?(?!00)\\d{2}(-|\\s)?(?!0000)\\d{4}$',
        'INVALID_SSN'
      ),
    ],
  },
};
