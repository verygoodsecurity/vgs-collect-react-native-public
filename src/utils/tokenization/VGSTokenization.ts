import { VGSTokenizationConfigurationType } from '../../components/VGSInputType';
import {
  VGSVaultAliasFormat,
  VGSVaultStorageType,
} from './TokenizationConfiguration';

/**
 * VGSTokenizationConfiguration
 *
 * Public namespace exposing tokenization presets and enums.
 * Use `presets` for per-type defaults, `storage` and `aliasFormat` for policies.
 */
export default class VGSTokenizationConfiguration {
  /**
   * Default tokenization configuration per field type.
   */
  static presets: typeof VGSTokenizationConfigurationType =
    VGSTokenizationConfigurationType;

  /**
   * Enum for storage policies.
   * https://www.verygoodsecurity.com/docs/vault/concepts/tokens#retention-policies
   */
  static storage: typeof VGSVaultStorageType = VGSVaultStorageType;

  /**
   * Enum for alias formats.
   * https://www.verygoodsecurity.com/docs/vault/concepts/tokens#alias-formats
   */
  static aliasFormat: typeof VGSVaultAliasFormat = VGSVaultAliasFormat;
}
