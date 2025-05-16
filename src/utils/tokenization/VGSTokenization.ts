import { VGSTokenizationConfigurationType } from '../../components/VGSInputType';
import {
  VGSVaultAliasFormat,
  VGSVaultStorageType,
} from './TokenizationConfiguration';

/**
 * Tokenization configuration for a fields.
 */
export default class VGSTokenizationConfiguration {
  /**
   * Default Tokenization configuration for field types.
   */
  static presets: typeof VGSTokenizationConfigurationType =
    VGSTokenizationConfigurationType;

  /**
   * Enum for VGSVaultStorageType.
   * https://www.verygoodsecurity.com/docs/vault/concepts/tokens#retention-policies
   */
  static storage: typeof VGSVaultStorageType = VGSVaultStorageType;

  /**
   * Enum for VGSVaultAliasFormat.
   * https://www.verygoodsecurity.com/docs/vault/concepts/tokens#alias-formats
   */
  static aliasFormat: typeof VGSVaultAliasFormat = VGSVaultAliasFormat;
}
