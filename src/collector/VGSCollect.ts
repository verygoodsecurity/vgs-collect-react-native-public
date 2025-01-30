// VGSCollect.ts
import APIHostnameValidator from '../utils/url/APIHostnameValidator';
import { LengthRule, PatternRule } from '../utils/validators';
import { ValidationRule } from '../utils/validators/Validator';
import { PaymentCardBrandsManager } from '../utils/paymentCards/PaymentCardBrandsManager';

type FieldUpdateCallback = (config: {
  mask?: string;
  validationRules?: ValidationRule[];
}) => void;

interface FieldConfig {
  getValue: () => string;
  getValidationErrors: () => string[];
  mask?: string;
  validationRules?: ValidationRule[];
  type?: string;
  updateCallback?: FieldUpdateCallback;
}

class VGSCollect {
  private tenantId: string;
  private environment: string;
  private routeId?: string;
  private cname?: string;
  private customHeaders: Record<string, string> = {};
  private isCnameValidating: boolean = false;
  private cnameValidationPromise: Promise<boolean> | null = null;
  private fields: Record<string, FieldConfig> = {};

  constructor(tenantId: string, environment: string) {
    this.tenantId = tenantId;
    this.environment = environment;
  }
  /**
   * Sets the route ID for the VGSCollect instance.
   *
   * @param routeId - The vault route ID to set.
   * @returns The VGSCollect instance for chaining.
   * @throws {Error} If the route ID is not a string.
   */
  public setRouteId(routeId: string) {
    if (typeof routeId !== `string`) {
      throw new Error(`routeIdTypeMismatch`);
    }
    this.routeId = routeId;
    return this;
  }
  /**
   * Sets custom headers for the VGSCollect instance.
   *
   * @param headers - An object containing the custom headers.
   */
  public setCustomHeaders(headers: Record<string, string>) {
    this.customHeaders = headers;
  }

  /**
   * Sets the CNAME for the VGSCollect instance.
   *
   * @param cname - The CNAME to set.
   * @returns A Promise that resolves when the CNAME validation is complete.
   */
  public async setCname(cname: string): Promise<void> {
    if (!cname) {
      this.cname = undefined;
      return;
    }

    if (this.isCnameValidating) {
      // If already validating, wait for the existing promise
      await this.cnameValidationPromise;
    }

    this.isCnameValidating = true;
    this.cnameValidationPromise = new Promise<boolean>((resolve, reject) => {
      APIHostnameValidator.validateCustomHostname(cname, this.tenantId)
        .then((isValid) => {
          this.isCnameValidating = false;
          this.cname = isValid ? cname : undefined;
          resolve(isValid);
        })
        .catch((error) => {
          this.isCnameValidating = false;
          console.error(`Error validating CNAME:`, error);
          this.cname = undefined;
          reject(error);
        });
    });

    await this.cnameValidationPromise;
  }
  /**
   * Registers a field with the VGSCollect instance.
   *
   * @param fieldName - The uniq name of the field.
   * @param getValue - A function that returns the current value of the field.
   * @param getValidationErrors - A function that returns an array of validation errors for the field.
   * @param type - The type of the field.
   * @param validationRules - An array of validation rules for the field (optional).
   * @param updateCallback - A callback function that is invoked when the field's configuration is updated (optional).
   */
  registerField(
    fieldName: string,
    getValue: () => string,
    getValidationErrors: () => string[],
    type?: string,
    validationRules: ValidationRule[] = [],
    updateCallback?: FieldUpdateCallback
  ) {
    this.fields[fieldName] = {
      getValue,
      getValidationErrors,
      type,
      validationRules,
      updateCallback,
    };
  }
  /**
   * Unregisters a field from the VGSCollect instance.
   *
   * @param fieldName - The name of the field to unregister.
   */
  public unregisterField(fieldName: string): void {
    delete this.fields[fieldName];
  }

  /**
   * Submits the datafrom VGS Inputs to Vault with `vauld ID` and the specified path.
   *
   * @param path - The path to submit the data to.
   * @param method - The HTTP method to use (default: 'POST').
   * @param extraData - Additional data to include in the submission.
   * @returns A Promise that resolves with the response from the server.
   * @throws {Error} If the submission fails.
   */
  public async submit(
    path: string,
    method: string = `POST`,
    extraData: Record<string, any> = {}
  ): Promise<any> {
    const collectedData: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    // Iterate through each registered field
    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];
      if (field) {
        const value = field.getValue();
        collectedData[fieldName] = value;
        if (field.getValidationErrors().length > 0) {
          errors[fieldName] = field.getValidationErrors();
        }
      }
    }
    // If there are validation errors, reject the promise with structured errors
    if (Object.keys(errors).length > 0) {
      console.warn('Validation failed with errors:', errors);
      return Promise.reject({
        message: 'Validation failed',
        errors,
      });
    }
    const dataToSubmit = { ...collectedData, ...extraData };
    // Wait for CNAME validation if pending
    if (this.isCnameValidating) {
      await this.cnameValidationPromise;
    }
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.customHeaders,
      },
      body: JSON.stringify(dataToSubmit),
    });

    if (!response.ok) {
      throw new Error(`Submission failed with status ${response.status}`);
    }
    return response;
  }

  private buildUrl(path: string): string {
    if (this.cname) {
      return this.cname;
    }

    const baseUrl = this.routeId
      ? `${this.tenantId}-${this.routeId}.${this.environment}.verygoodproxy.com`
      : `${this.tenantId}.${this.environment}.verygoodproxy.com`;

    const sanitizedPath = path.replace(/[^\w.-]/g, '');

    return `https://${baseUrl}/${sanitizedPath}`;
  }

  getFieldRules(fieldName: string): ValidationRule[] | undefined {
    return this.fields[fieldName]?.validationRules;
  }
  /**
   * Updates ALL fields of a specific type with new mask and validation rules.
   * Invokes the update callback for each field to notify the component.
   */
  updateFieldByType(
    type: string,
    config: { mask?: string; validationRules?: ValidationRule[] }
  ) {
    for (const fieldName in this.fields) {
      if (this.fields[fieldName]?.type === type) {
        // Update the field's config internally
        this.fields[fieldName] = {
          ...this.fields[fieldName],
          ...config,
        };
        // Invoke the update callback to notify the VGSTextInput component
        this.fields[fieldName].updateCallback?.(config);
      }
    }
  }
  /**
   * Updates ALL fields of type "cvc" with suitable mask and validation rules
   * whenever the card brand changes. Computes min/max from brand.cvcLengths.
   */
  updateCvcFieldForBrand(brandName: string) {
    const manager = PaymentCardBrandsManager.getInstance();
    const brand = manager.getBrandByName(brandName);
    if (!brand) return;

    // E.g., brand.cvcLengths = [3,4] for some cards
    const cvcLengths = brand.cvcLengths ?? [3];
    const minLen = Math.min(...cvcLengths);
    const maxLen = Math.max(...cvcLengths);

    // Decide on mask (#=digit)
    const cvcMask = maxLen === 4 ? `####` : `###`;

    // Example: length rule, numeric pattern rule, required, etc.
    const cvcRules: ValidationRule[] = [
      new PatternRule(`\\d*$`, `CVC must be numeric.`),
      new LengthRule(minLen, maxLen, `CVC length not valid.`),
    ];

    // Update EVERY field whose type is "cvc"
    this.updateFieldByType(`cvc`, {
      mask: cvcMask,
      validationRules: cvcRules,
    });
  }

  /**
   * A simple helper to find the first field name whose type matches `inputType`.
   */
  findFieldNameByType(inputType: string): string | undefined {
    return Object.keys(this.fields).find(
      (fName) => this.fields[fName] && this.fields[fName].type === inputType
    );
  }
}

export default VGSCollect;
