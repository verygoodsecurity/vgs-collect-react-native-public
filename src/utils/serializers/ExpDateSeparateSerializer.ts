import VGSCollectLogger, {
  VGSLogSeverity,
  VGSLogLevel,
} from '../logger/VGSCollectLogger';

// Define an interface for serializers
export interface VGSSerializer {
  serialize(value: string): string | Record<string, string>;
}
/** Serializer that splits an expiration date into separate month and year fields. */
class ExpDateSeparateSerializer implements VGSSerializer {
  private monthFieldName: string;
  private yearFieldName: string;
  /**
   * Create an ExpDateSeparateSerializer.
   * @param monthFieldName - The field name for the month part.
   * @param yearFieldName - The field name for the year part.
   */
  public constructor(monthFieldName: string, yearFieldName: string) {
    this.monthFieldName = monthFieldName;
    this.yearFieldName = yearFieldName;
  }

  serialize(value: string): string | Record<string, string> {
    let month: string, year: string;
    // Use the same logic as in CardExpDateRule to extract month and year
    if (/^\d{4}$/.test(value)) {
      // mmyy format
      month = value.slice(0, 2);
      year = value.slice(2, 4);
    } else if (/^\d{6}$/.test(value)) {
      // mmyyyy format
      month = value.slice(0, 2);
      year = value.slice(2, 6);
    } else {
      VGSCollectLogger.getInstance().log({
        logLevel: VGSLogLevel.WARNING,
        text: `Invalid expiration date format: ${value}. Can not separate month and year.`,
        severity: VGSLogSeverity.ERROR,
      });
      month = '';
      year = '';
    }
    return {
      [this.monthFieldName]: month,
      [this.yearFieldName]: year,
    };
  }
}

export default ExpDateSeparateSerializer;
