// VGSTextInput.tsx
import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import VGSCollect from '../collector/VGSCollect';
import type { ValidationRule } from '../utils/validators/Validator';
import { validateInput } from '../utils/validators/Validator';
import type { VGSTextInputState } from './VGSTextInputState';
import { PaymentCardBrandsManager } from '../utils/paymentCards/PaymentCardBrandsManager';
import { getSubmitValue, maskInput, unmaskInput } from '../utils/masker/Masker';
import { type VGSInputType, inputTypeDefaults } from './VGSInputType';
import { DEFAULT_CARD_MASK } from '../utils/paymentCards/PaymentCardBrand';

/**
 * Props for the VGSTextInput component.
 */
export interface VGSTextInputProps {
  /**
   * The VGSCollect instance to register the field with.
   */
  collector: VGSCollect;
  /**
   * The name of the field.
   */
  fieldName: string;
  /**
   * The type of the input field (e.g., 'card', 'cvc', 'expDate', 'text').
   */
  type?: VGSInputType;
  /**
   * The mask pattern for the input field (e.g., '#### #### #### ####' for card number).
   */
  mask?: string;
  /**
   * The divider to use when replacing non-mask characters on form submission.
   */
  divider?: string;
  /**
   * An array of validation rules for the input field.
   */
  validationRules?: ValidationRule[];
  /**
   * A callback function that is invoked when the input field's state changes.
   */
  onStateChange?: (state: VGSTextInputState) => void;
  /**
   * The placeholder text for the input field.
   */
  placeholder?: string;
  /**
   * The keyboard type for the input field (e.g., 'numeric', 'email-address').
   */
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  /**
   * Whether the input field should have secure text entry (e.g., for passwords).
   */
  secureTextEntry?: boolean;
  /**
   * Whether the input field should enable auto-correction.
   */
  autoCorrect?: boolean;
  /**
   * Style for the container view.
   */
  containerStyle?: object;
  /**
   * Style for the text input.
   */
  textStyle?: object;
}

/**
 * A Securee text input component for collecting sensitive data with VGS.
 */
const VGSTextInput: React.FC<VGSTextInputProps> = forwardRef((props, ref) => {
  const {
    collector,
    fieldName,
    type = 'text', // default field type if not provided
    onStateChange,
    placeholder,
    divider,
    secureTextEntry = false,
    autoCorrect = false,
    containerStyle,
    textStyle: inputTextStyle,
  } = props;

  // Get defaults for the specified type
  const defaultConfig = inputTypeDefaults[type] ?? inputTypeDefaults.text;

  // Merge user overrides with defaults
  const initialMask = props.mask ?? defaultConfig?.mask;
  const keyboardType =
    props.keyboardType ?? defaultConfig?.keyboardType ?? 'default';
  const mergedValidationRules: ValidationRule[] =
    props.validationRules ?? defaultConfig?.validationRules ?? [];
  // State to manage the current validation rules
  const [validationRules, setValidationRules] = useState<ValidationRule[]>(
    mergedValidationRules
  );
  // State to manage the current mask
  const [currentMask, setCurrentMask] = useState<string | undefined>(
    initialMask
  );

  const [text, setText] = useState('');
  const [state, setState] = useState<VGSTextInputState>({
    type,
    isValid: validationRules.length === 0,
    isDirty: false,
    isEmpty: true,
    isFocused: false,
    inputLength: 0,
    validationErrors: [],
    fieldName,
  });

  const textRef = React.useRef<string>(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Define the update callback to handle updates from VGSCollect
  const handleFieldConfigUpdate = (config: {
    mask?: string;
    validationRules?: ValidationRule[];
  }) => {
    // Apply the new mask to the current text
    const currentRawInput = unmaskInput(textRef.current, currentMask ?? '');
    const newMaskedInput = maskInput(currentRawInput, config.mask ?? '');
    setCurrentMask(config.mask);
    setValidationRules(config.validationRules ?? []);
    setText(newMaskedInput);
    // Need to unmask since new mask can cut current input
    const newRawInput = unmaskInput(newMaskedInput, config.mask ?? '');
    const errors = validateInput(newRawInput, config.validationRules ?? []);
    const isValid = errors.length === 0;
    // Use a timeout to defer state updates, avoiding state updates during render
    setTimeout(() => {
      const newState = {
        ...state,
        inputLength: newRawInput.length,
        isValid,
        isDirty: state.isDirty || newRawInput.length > 0,
        isEmpty: newRawInput.length === 0,
        validationErrors: errors,
      };
      setState(newState);
      onStateChange?.(newState);
    }, 0);
  };

  useEffect(() => {
    collector.registerField(
      fieldName,
      () => getSubmitValue(textRef.current, currentMask, divider),
      () => {
        const rawInput = unmaskInput(textRef.current, currentMask ?? '');
        return validateInput(rawInput, validationRules);
      },
      type,
      validationRules,
      handleFieldConfigUpdate
    );
    return () => {
      collector.unregisterField(fieldName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collector, fieldName, currentMask, divider, type, validationRules]);

  const handleFocus = () => {
    const newState = { ...state, isFocused: true };
    setState(newState);
    onStateChange?.(newState);
  };

  const handleBlur = () => {
    const newState = { ...state, isFocused: false };
    setState(newState);
    onStateChange?.(newState);
  };

  const handleChangeText = (input: string) => {
    let maskedInput = input;
    let rawInput = input;

    // If a mask is set, apply it
    if (currentMask) {
      maskedInput = maskInput(input, currentMask);
      rawInput = unmaskInput(maskedInput, currentMask);
    }

    // Retrieve validation rules from collector if available
    const errors = validateInput(rawInput, validationRules);
    const isValid = errors.length === 0;

    // Build the new state for this field
    let newState: VGSTextInputState = {
      ...state,
      type,
      isValid,
      isDirty: state.isDirty || rawInput.length > 0,
      isEmpty: rawInput.length === 0,
      inputLength: rawInput.length,
      validationErrors: errors,
      fieldName,
    };

    // Additional logic if type === "card"
    if (type === 'card') {
      // Remove whitespace/dashes
      const cleaned = rawInput.replace(/\s+|-/g, '');
      const manager = PaymentCardBrandsManager.getInstance();
      const detectedBrand = manager.detectBrand(cleaned);
      const brandName = detectedBrand ? detectedBrand.name : 'Unknown';

      // Only update if brand changed
      if (
        detectedBrand &&
        'cardBrand' in state &&
        brandName !== state.cardBrand
      ) {
        // Update the 'cvc' fields via VGSCollect
        collector.updateCvcFieldForBrand(brandName);
        // Apply the new mask
        const brandMask = detectedBrand?.mask || DEFAULT_CARD_MASK;
        setCurrentMask(brandMask);
        maskedInput = maskInput(cleaned, brandMask);
      }
      // Update newState with brand info
      newState = {
        ...newState,
        cardBrand: brandName,
        cardBin: isValid ? manager.getBin(cleaned, brandName) : undefined,
        last4: isValid && cleaned.length >= 12 ? cleaned.slice(-4) : undefined,
      };
    } else if (type === 'ssn') {
      // Example: store last 4 for SSN
      const cleaned = rawInput.replace(/\D/g, '');
      newState = {
        ...newState,
        last4: isValid && cleaned.length === 9 ? cleaned.slice(-4) : undefined,
      };
    }
    // Update our text display
    setText(maskedInput);
    setState(newState);
    onStateChange?.(newState);
  };

  useImperativeHandle(ref, () => ({
    focus: () => textInputRef.current?.focus(),
    blur: () => textInputRef.current?.blur(),
  }));

  const textInputRef = React.useRef<TextInput>(null);

  return (
    <View style={[containerStyle, styles.container]}>
      <TextInput
        value={text}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCorrect={autoCorrect}
        style={inputTextStyle}
        ref={textInputRef}
        underlineColorAndroid="transparent"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
});

export default VGSTextInput;
