// VGSCardInput.tsx
import { useState, forwardRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { VGSTextInputProps, VGSTextInputRef } from './VGSTextInputBase';
import { VGSTextInputBase}  from './VGSTextInputBase';
import type { VGSTextInputState } from './VGSTextInputState';
import { PaymentCardBrandsManager } from '../utils/paymentCards/PaymentCardBrandsManager';

/**
 * Specific Props for the VGSCardInput component.
 */
export interface VGSCardInputProps extends Omit<VGSTextInputProps, 'type'> {
  /**
   * Width of the card brand icon.
   * @default 42
   */
  iconWidth?: number;
  /**
   * Height of the card brand icon.
   * @default 24
   */
  iconHeight?: number;
  /**
   * Padding around the card brand icon.
   * @default 8
   */
  iconPadding?: number;
  /**
   * Position of the card brand icon ('left', 'right', or 'none').
   * @default 'right'
   */
  iconPosition?: 'left' | 'right' | 'none';
  /**
   * Height of the container view.
   * @default 50
   */
  containerHeight?: number;
  /**
   * Style for the container view.
   */
  containerStyle?: object;
  /**
   * Style for the text input.
   */
  textStyle?: object;
  /**
   * Style for the card brand icon.
   */
  iconStyle?: object;
}

/**
 * A Secure component for inputting payment card details with a pre-defefined config such as type, validation rules, masks.
 * It automatically detects the card brand and displays the corresponding icon.
 */
const VGSCardInput = forwardRef<VGSTextInputRef, VGSCardInputProps>(({
  iconPosition = 'right',
  iconWidth = 42,
  iconHeight = 24,
  iconPadding = 8,
  onStateChange,
  containerStyle,
  textStyle: textStyle,
  iconStyle,
  containerHeight = 50,
  ...otherProps
}, ref) => {
  const manager = PaymentCardBrandsManager.getInstance();
  const [brandIcon, setBrandIcon] = useState<any>(
    manager.getBrandIcon('unknown')
  );

  const handleStateChange = (newState: VGSTextInputState) => {
    if (newState.type === 'card' && 'cardBrand' in newState) {
      const brandName = newState.cardBrand?.toLowerCase() || 'unknown';
      setBrandIcon(manager.getBrandIcon(brandName));
    }
    onStateChange?.(newState);
  };

  return (
    <View
      style={[styles.container, containerStyle, { height: containerHeight }]}
    >
      <VGSTextInputBase
        {...otherProps}
        ref={ref}
        type="card"
        onStateChange={handleStateChange}
        textStyle={[
          // eslint-disable-next-line react-native/no-inline-styles
          {
            paddingLeft: iconPosition === 'left' ? iconWidth + iconPadding : 0,
            paddingRight:
              iconPosition === 'right' ? iconWidth + iconPadding : 0,
          },
          textStyle, // Merged with default padding
        ]}
      />

      {iconPosition === 'left' && (
        <Image
          source={brandIcon}
          style={[
            styles.icon,
            // eslint-disable-next-line react-native/no-inline-styles
            {
              width: iconWidth,
              height: iconHeight,
              left: iconPadding,
              top: '50%',
              transform: [{ translateY: -iconHeight / 2 }],
            },
            iconStyle,
          ]}
          accessibilityLabel="Payment Card Brand Icon"
        />
      )}

      {iconPosition === 'right' && (
        <Image
          source={brandIcon}
          style={[
            styles.icon,
            // eslint-disable-next-line react-native/no-inline-styles
            {
              width: iconWidth,
              height: iconHeight,
              right: iconPadding,
              top: '50%',
              transform: [{ translateY: -iconHeight / 2 }],
            },
            iconStyle,
          ]}
          accessibilityLabel="Payment Card Brand Icon"
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  icon: {
    position: 'absolute',
    resizeMode: 'contain',
  },
});

export default VGSCardInput;
