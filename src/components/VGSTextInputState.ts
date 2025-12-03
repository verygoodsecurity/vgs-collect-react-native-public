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

/**
 * State emitted by `VGSTextInput` components.
 * Captures validation, focus, and input metadata.
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
