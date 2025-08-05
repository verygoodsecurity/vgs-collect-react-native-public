/* eslint-disable react-native/no-inline-styles */
// VGSCVCInput.tsx
import { useState, forwardRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { VGSTextInputProps, VGSTextInputRef } from './VGSTextInputBase';
import { VGSTextInputBase}  from './VGSTextInputBase';
import type { VGSTextInputState } from './VGSTextInputState';

const CVCImage = require('../assets/cardIcons/cvc3-light.png');

/**
 * Props for the VGSCVCInput component.
 */
export interface VGSCVCInputProps extends Omit<VGSTextInputProps, 'type'> {
  /**
   * Width of the CVC image.
   * @default 48
   */
  iconWidth?: number;
  /**
   * Height of the CVC image.
   * @default 24
   */
  iconHeight?: number;
  /**
   * Padding around the CVC image.
   * @default 8
   */
  iconPadding?: number;
  /**
   * Position of the CVC image ('left', 'right', or 'none').
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
   * Style for the CVC image.
   */
  iconStyle?: object;
}
/**
 * A Secute component for inputting CVC/CVV codes with a pre-defefined config such as type, validation rules, mask.
 * It displays an image of the CVC code location on the card.
 */
const VGSCVCInput = forwardRef<VGSTextInputRef, VGSCVCInputProps>((
  {
    secureTextEntry = true,
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
  }, ref
) => {
  const [cvcIcon, setCVCIcon] = useState<any>(CVCImage);

  const handleStateChange = (newState: VGSTextInputState) => {
    if (newState.type === 'cvc') {
      // TODO: Separate icon for CVV??
      setCVCIcon(CVCImage);
    }
    onStateChange?.(newState);
  };

  return (
    <View
      style={[styles.container, containerStyle, { height: containerHeight }]}
    >
      <VGSTextInputBase
        {...otherProps}
        type="cvc"
        ref={ref}
        secureTextEntry={secureTextEntry}
        onStateChange={handleStateChange}
        textStyle={[
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
          source={cvcIcon}
          style={[
            styles.icon,
            {
              width: iconWidth,
              height: iconHeight,
              left: iconPadding,
              top: '50%',
              transform: [{ translateY: -iconHeight / 2 }],
            },
            iconStyle,
          ]}
          accessibilityLabel="Payment Card CVC Icon"
        />
      )}

      {iconPosition === 'right' && (
        <Image
          source={cvcIcon}
          style={[
            styles.icon,
            {
              width: iconWidth,
              height: iconHeight,
              right: iconPadding,
              top: '50%',
              transform: [{ translateY: -iconHeight / 2 }],
            },
            iconStyle,
          ]}
          accessibilityLabel="Payment Card CVC Icon"
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

export default VGSCVCInput;
