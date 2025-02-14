// Define an interface for serializers
export interface VGSSerializer {
  serialize(value: string): string | Record<string, string>;
}

// Implement a separate serializer for expDate
class ExpDateSeparateSerializer implements VGSSerializer {
  private monthFieldName: string;
  private yearFieldName: string;

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
      // Handle invalid format (TODO: throw an error or log a warning)
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
