import { ValidationRule } from './Validator';
import type VGSCollect from '../../collector/VGSCollect';

/**
 * MatchFieldRule
 *
 * Secure cross-field equality validator.
 * Compares current input against another field's value via a comparator without exposing raw data.
 */
export class MatchFieldRule extends ValidationRule {
  private readonly collector: VGSCollect;
  private readonly targetFieldName: string;

  /**
   * Creates a cross-field match validator.
   *
   * @param collector - `VGSCollect` instance managing fields.
   * @param targetFieldName - Field name to compare against.
   * @param errorMessage - Message when values do not match.
   */
  constructor(
    collector: VGSCollect,
    targetFieldName: string,
    errorMessage: string
  ) {
    super(errorMessage);
    this.collector = collector;
    this.targetFieldName = targetFieldName;
  }

  /**
   * Checks whether `input` equals the target field value.
   *
   * @param input - String to compare.
   * @returns `true` if equal, `false` otherwise.
   */
  validate(input: string): boolean {
    if (!input) return false;
    // Get a comparator function that doesn't expose the raw value
    const comparator = this.collector.getFieldComparator(this.targetFieldName);
    return comparator(input);
  }
}

export default MatchFieldRule;