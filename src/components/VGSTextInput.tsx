// VGSTextInput.tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import VGSTextInputBase, {
  type VGSTextInputRef,
  type VGSTextInputProps,
  type VGSPredefinedInputProps
} from './VGSTextInputBase';

import VGSCardInput, { type VGSCardInputProps } from './VGSCardInput';
import VGSCVCInput, { type VGSCVCInputProps } from './VGSCVCInput';
import ExpDateSeparateSerializer from '../utils/serializers/ExpDateSeparateSerializer';
import type { TextInput } from 'react-native';

type CardNumberInputProps = Omit<VGSCardInputProps, 'fieldName'> & { fieldName?: string }
/** CardNumberInput wrapper */
const CardNumberInput =  forwardRef<VGSTextInputRef, CardNumberInputProps>(
  (props, ref) => {
    const { fieldName = 'pan', ...rest } = props;
    const inner = useRef<TextInput>(null);
    useImperativeHandle(ref, () => ({
      focus: () => inner.current?.focus(),
      blur: () => inner.current?.blur(),
    }));
    return <VGSCardInput {...rest} fieldName={fieldName} ref={inner} />;
  }
);
type CVCInputProps = Omit<VGSCVCInputProps, 'fieldName'> & { fieldName?: string };
/** CVCInput wrapper */
const CVCInput =  forwardRef<VGSTextInputRef, CVCInputProps>(
  (props, ref) => {
    const { fieldName = 'cvc', ...rest } = props;
    const inner = useRef<TextInput>(null);
    useImperativeHandle(ref, () => ({
      focus: () => inner.current?.focus(),
      blur: () => inner.current?.blur(),
    }));
    return <VGSCVCInput {...rest} fieldName={fieldName} ref={inner} />;
  }
);

/** ExpDateInput wrapper */
const ExpDateInput = forwardRef<VGSTextInputRef, VGSPredefinedInputProps>(
  (props, ref) => {
    const {
      fieldName = 'expDate',
      type = 'expDate',
      serializers = [new ExpDateSeparateSerializer('exp_month','exp_year')],
      accessibilityLabel = 'Card expiration date',
      ...rest
    } = props;
    return (
      <VGSTextInputBase
        {...rest}
        ref={ref}
        fieldName={fieldName}
        type={type}
        serializers={serializers}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
);

/** CardholderInput wrapper */
const CardholderInput =  forwardRef<VGSTextInputRef, VGSPredefinedInputProps>(
  (props, ref) => {
    const { fieldName = 'cardholder', type = 'cardHolderName', accessibilityLabel = 'Cardholder name', ...rest } = props;
    return (
      <VGSTextInputBase
        {...rest}
        ref={ref}
        fieldName={fieldName}
        type={type}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
);


export interface VGSTextInputComponent
  extends React.ForwardRefExoticComponent<
    VGSTextInputProps & React.RefAttributes<VGSTextInputRef>
  > {
  CardNumber: typeof CardNumberInput;
  CVC: typeof CVCInput;
  ExpDate: typeof ExpDateInput;
  CardHolder: typeof CardholderInput;
}

/** Base input component for collecting sensitive data */
export const VGSTextInput = Object.assign(VGSTextInputBase, {
  CardNumber: CardNumberInput,
  CVC: CVCInput,
  ExpDate: ExpDateInput,
  CardHolder: CardholderInput,
}) as VGSTextInputComponent;

export default VGSTextInput;