import { generateUUID } from '../Utils';

/// Form analytics details
class FormAnalyticsDetails {
  /// Form ID to identify fields realte to one collect instance
  readonly formId: string;
  readonly tnt: string;
  readonly env: string;

  constructor(tenantId: string, environment: string) {
    this.formId = generateUUID();
    this.tnt = tenantId;
    this.env = environment;
  }
}
export default FormAnalyticsDetails;
