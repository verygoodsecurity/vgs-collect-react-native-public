import type { VGSInputType } from './VGSInputType';
type CardState = {
  type: 'card';
  cardBin?: string;
  last4?: string;
  cardBrand?: string;
};
type SsnState = { type: 'ssn'; last4?: string };
type DefaultState = { type: VGSInputType };
type ExtraState = CardState | SsnState | DefaultState;

/** State object for VGSTextInput component
 * Includes properties for validation, focus, and input status.
 */
export type VGSTextInputState = ExtraState & {
  isValid: boolean;
  isEmpty: boolean;
  isDirty: boolean;
  isFocused: boolean;
  inputLength: number;
  validationErrors: string[];
  fieldName: string;
};
