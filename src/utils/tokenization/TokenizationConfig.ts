import type { VGSInputType } from '../../components/VGSInputType';
/**
 * Tokenization configuration for a field. The object can contain `storage` and `format` properties.
 */
export interface TokenizationConfig {
  storage?: VaultStorageType; // Add vault storage type
  format?: VaultAliasFormat; // Add alias format
}

// Enum for VaultStorageType. Details: https://www.verygoodsecurity.com/docs/vault/concepts/tokens#retention-policies
export enum VaultStorageType {
  PERSISTENT = 'PERSISTENT',
  VOLATILE = 'VOLATILE',
}

// Enum for VaultAliasFormat. Details: https://www.verygoodsecurity.com/docs/vault/concepts/tokens#alias-formats
export enum VaultAliasFormat {
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
  value: false | TokenizationConfig,
  inputType: VGSInputType
): TokenizationConfig | false {
  if (
    typeof value === 'object' &&
    value !== null &&
    'storage' in value &&
    'format' in value
  ) {
    if (inputType === 'cvc' && value.storage !== VaultStorageType.VOLATILE) {
      return false;
    } else if (
      inputType === 'card' &&
      value.storage !== VaultStorageType.PERSISTENT
    ) {
      return false;
    }
    return value;
  }
  return value;
}
