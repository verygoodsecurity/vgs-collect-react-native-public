<p align="center">
  <a href="https://www.verygoodsecurity.com/" rel="nofollow">
    <img src="https://avatars0.githubusercontent.com/u/17788525" width="128" alt="VGS Logo">
  </a>
  <h3 align="center">VGS Collect React Native SDK</h3>

  <p align="center">
    Securely collect, tokenize, and manage sensitive data in your React Native applications with ease.
    <br />
    <a href="https://www.verygoodsecurity.com/docs/vgs-collect/"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://www.npmjs.com/package/@vgs/collect-react-native">NPM (@vgs/collect-react-native)</a>
  </p>
</p>

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [UI Inputs](#ui-inputs)
  - [Masking Inputs](#masking-inputs)
  - [Custom Validation](#custom-validation)
- [iOS Privacy Manifest](#ios-privacy-manifest)
- [Privacy](#privacy)
- [Documentation](#documentation)
- [Releases](#releases)
- [License](#license)

## Introduction

The `@vgs/collect-react-native` SDK by Very Good Security (VGS) enables you to securely collect and manage sensitive data such as credit card information and Social Security Numbers (SSNs) within your React Native applications. Leveraging VGS's data protection infrastructure ensures that sensitive information is handled securely, simplifying compliance and enhancing user trust.

## Features

- **Secure Data Collection:** Tokenize sensitive data before it reaches your servers.
- **Customizable Input Components:** Pre-built components for various data types (e.g., Card Number, CVC, Expiration Date, Social Security Number).
- **Real-time Validation:** Instant feedback on input validity to enhance user experience.
- **Pre-defined Masking:** Automatically setup input masks based on data type.
- **Easy Integration:** Simple setup and integration with existing React Native projects.
- **Compliance Ready:** Assists in achieving PCI DSS compliance by minimizing the handling of sensitive data.

## Installation

Install the `@vgs/collect-react-native` package using npm or yarn:

```bash
# Using npm
npm install @vgs/collect-react-native

# Using yarn
yarn add @vgs/collect-react-native
```
Ensure you have React Native set up in your project. If not, follow the React Native Getting Started guide.

## Prerequisites
You should have your organization registered at <a href="https://dashboard.verygoodsecurity.com/dashboard/" target="_blank">VGS Dashboard</a>. A Sandbox Vault will be
pre-created for you. Use your <a href="https://dashboard.verygoodsecurity.com/dashboard/" target="_blank">VGS Dashboard</a>  to start collecting data. If you don’t have an organization registered yet, check the [Quick Integration](getting-started/quick-integration) guides. Use your `<vaultId>` to start collecting data.

## Example app
You can check our example application [here](./example/src/App.tsx). To run example Application, follow next steps:
``` bash
# 1. Download SDK repository
# 2. In root folder run:
npm install
# 3. Navigate to example folder
cd example
# 4. Build example app for iOS or Android
npm run ios
# 5. Later you can start expo server(optional)
npx expo start --clear
```
## Quick Start

Import the SDK Components:
```javascript
import { VGSCollect, VGSTextInput } from '@vgs/collect-react-native';
```
Initialize VGSCollect:
```javascript
const collector = new VGSCollect('yourVaultId', 'sandbox'); // Use 'live' for production
```
Create Secure Input Fields:
```javascript
<VGSTextInput
  containerStyle={styles.inputContainer}
  textStyle={styles.inputText}
  collector={collector}
  fieldName="card_holder"
  type="cardHolderName"
  placeholder="Name"
  onStateChange={handleFieldStateChange}
/>
```
Handle Form Submission:
```javascript
// Handle submit request
const handleSubmit = async () => {
  try {
    const { status, response } = await collector.submit('/post', 'POST');
    if (response.ok) {
      try {
        const responseBody = await response.json();
        const json = JSON.stringify(responseBody, null, 2);
        console.log('Success:', json);
      } catch (error) {
        console.warn(
          'Error parsing response body. Body can be empty or your <vaultId> is wrong!',
          error
        );
      }
    } else {
      console.warn(`Server responded with error: ${status}\n${response}`);
    }
  } catch (error) {
    if (error instanceof VGSError) {
      switch (error.code) {
        case VGSErrorCode.InputDataIsNotValid:
          for (const fieldName in error.details) {
            console.error(
              `Not valid fieldName: ${fieldName}: ${error.details[fieldName].join(', ')}`
            );
          }
          break;
        default:
          console.error('VGSError:', error.code, error.message);
      }
    } else {
      console.error('Network or unexpected error:', error);
    }
  }
};
```
**NOTE**: for each input you should set 'fieldName' attribute, that should be same as in you **Vault** Route settings. This identifier is required for Redact/Reveal operations on Inbound/Outbound Routes.

## UI Inputs

The SDK provides pre-built UI input components for securely collecting sensitive data. The following input components are available:

* **`VGSTextInput`:** A versatile, customizable input component. 
    * **Field Types:** You can configure the input's behavior by setting the `type` prop. 
        * Supported types: 
            * `'text'`: General-purpose text input with no predefined settings.
            * `'card'`: For collecting card numbers.
            * `'cardHolderName'`: For collecting card holder names.
            * `'expDate'`: For collecting card expiration dates.
            * `'cvc'`: For collecting CVC/CVV codes.
            * `'ssn'`: For collecting social security numbers.
        * Each type includes default configurations for:
            * **Validation Rules:** Enforces data integrity and compliance.
            * **Input Mask:** Provides visual guidance and improves user experience.
            * **Keyboard Type:** Optimizes the on-screen keyboard for the input type.
* **`VGSCardInput`:** A specialized input component for collecting card numbers. 
    * **Features:** 
        * Predefined `type='card'`.
        * Dynamically displays the detected card brand based on user input.
* **`VGSCVCInput`:** A specialized input component for collecting CVC/CVV codes.
    * **Features:** 
        * Predefined `type='cvc'`.
        * Displays an icon to guide users in entering the CVC/CVV code.

## Masking Inputs

VGS Input components allow you to apply a mask to the input field using the mask prop. This prop accepts a string pattern that defines how the input should be formatted. It uses placeholder characters to define the allowed characters in each position of the mask. The following placeholders are supported:

-  `#`: Any digit (0-9)
-  `@`: Any letter (a-zA-Z)
-  `a`: Any lowercase letter (a-z)
-  `A`: Any uppercase letter (A-Z)
-  `*`: Any alphanumeric character (a-zA-Z0-9)

Here's how to use the mask prop:
```javascript
<VGSTextInput
  //... other props
  mask="#### #### #### ####" // Example mask for a credit card number
/>
```

## Custom Validation

VGS Input components allow you to re-define default or add custom validation rules to ensure that the input data meets certain criteria. You can use the validationRules prop to pass an array of ValidationRule objects.

Here's a list of the available validation rules available:

-  `NotEmptyRule`: Checks if the input is not empty.
-  `LengthRule`: Validates the input length against a minimum and maximum length.
-  `LengthMatchRule`: Checks if the input has an exact specified length.
-  `PatternRule`: Validates the input against a regular expression pattern.
-  `CardExpDateRule`: Checks if the input is a valid card expiration date in the specified format ('mmyy' or 'mmyyyy').
-  `PaymentCardRule`: Validates if the input is a valid payment card number based on the card brand and Luhn check.
-  `LuhnCheckRule`: Performs a Luhn check on the input to validate its integrity (commonly used for credit card numbers).

Here's how to set validation rules:
```javascript
import { NotEmptyRule, LengthRule, PatternRule } from '@vgs/collect-react-native';

<VGSTextInput
  //... other props
  validationRules={[
    new NotEmptyRule('This field is required'),
    new LengthRule(5, 10, 'Length must be between 5 and 10 characters'),
    new PatternRule('/^[a-zA-Z]+$/', 'Only letters are allowed'),
  ]}
/>
```
## iOS Privacy Manifest
VGS Collect React Native SDK **does not directly package or embed** the Privacy Manifest file into your iOS project. Instead, you should manually copy and update Privacy Manifest info from the VGS [Privacy Manifest file](https://github.com/verygoodsecurity/vgs-collect-react-native-public/blob/main/PrivacyInfo.xcprivacy). Follow the instructions from our [docs](https://www.verygoodsecurity.com/docs/vgs-collect/rn-sdk/privacy-details).


### Privacy
The SDK tracks a few key metrics to understand SDK's features usage, which helps us know what areas need improvement. No personal information is tracked.

You can opt-out of metrics collection via `VGSAnalyticsClient`:
```
VGSAnalyticsClient.getInstance().shouldCollectAnalytics = false
```

### Documentation
-  SDK Documentation: https://www.verygoodsecurity.com/docs/vgs-collect/rn-sdk

### Releases
To follow `@vgs/collect-react-native` updates and changes check the [releases](https://github.com/verygoodsecurity/vgs-collect-react-native-public/releases) page.

## License

VGS Collect React Native SDK is released under the MIT license. [See LICENSE](https://github.com/verygoodsecurity/vgs-collect-react-native-public/blob/main/LICENSE) for details.
