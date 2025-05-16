import type { VGSInputType } from '../../components/VGSInputType';
/**
 * Tokenization configuration for a field. The object can contain `storage` and `format` properties.
 */
export interface VGSTokenizationConfiguration {
  storage?: VGSVaultStorageType; // Add vault storage type
  format?: VGSVaultAliasFormat; // Add alias format
}

// Enum for VaultStorageType. Details: https://www.verygoodsecurity.com/docs/vault/concepts/tokens#retention-policies
export enum VGSVaultStorageType {
  PERSISTENT = 'PERSISTENT',
  VOLATILE = 'VOLATILE',
}

// Enum for VaultAliasFormat. Details: https://www.verygoodsecurity.com/docs/vault/concepts/tokens#alias-formats
export enum VGSVaultAliasFormat {
  FPE_ACC_NUM_T_FOUR = 'FPE_ACC_NUM_T_FOUR',
  FPE_ALPHANUMERIC_ACC_NUM_T_FOUR = 'FPE_ALPHANUMERIC_ACC_NUM_T_FOUR',
  FPE_SIX_T_FOUR = 'FPE_SIX_T_FOUR',
  FPE_SSN_T_FOUR = 'FPE_SSN_T_FOUR',
  FPE_T_FOUR = 'FPE_T_FOUR',
  NUM_LENGTH_PRESERVING = 'NUM_LENGTH_PRESERVING',
  PFPT = 'PFPT',
  RAW_UUID = 'RAW_UUID',
  UUID = 'UUID',
  GENERIC_T_FOUR = 'GENERIC_T_FOUR',
  ALPHANUMERIC_SIX_T_FOUR = 'ALPHANUMERIC_SIX_T_FOUR',
  ALPHANUMERIC_LENGTH_PRESERVING = 'ALPHANUMERIC_LENGTH_PRESERVING',
  ALPHANUMERIC_LENGTH_PRESERVING_T_FOUR = 'ALPHANUMERIC_LENGTH_PRESERVING_T_FOUR',
  ALPHANUMERIC_SSN_T_FOUR = 'ALPHANUMERIC_SSN_T_FOUR',
  ALPHANUMERIC_LENGTH_PRESERVING_SIX_T_FOUR = 'ALPHANUMERIC_LENGTH_PRESERVING_SIX_T_FOUR',
}

export function tokenizationConfigValidation(
  value: false | VGSTokenizationConfiguration,
  inputType: VGSInputType
): VGSTokenizationConfiguration | false {
  if (
    typeof value === 'object' &&
    value !== null &&
    'storage' in value &&
    'format' in value
  ) {
    if (inputType === 'cvc' && value.storage !== VGSVaultStorageType.VOLATILE) {
      return false;
    } else if (
      inputType === 'card' &&
      value.storage !== VGSVaultStorageType.PERSISTENT
    ) {
      return false;
    }
    return value;
  }
  return value;
}
