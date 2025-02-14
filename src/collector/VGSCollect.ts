// VGSCollect.ts
import APIHostnameValidator from '../utils/url/APIHostnameValidator';
import { LengthRule, PatternRule } from '../utils/validators';
import { ValidationRule } from '../utils/validators/Validator';
import { PaymentCardBrandsManager } from '../utils/paymentCards/PaymentCardBrandsManager';
import type { TokenizationConfig } from '../utils/tokenization/TokenizationConfig';

type FieldUpdateCallback = (config: {
  mask?: string;
  validationRules?: ValidationRule[];
}) => void;

interface TokenizationFieldMapping {
  /** The key to use in the final output (if a serializer split the value, this is the sub-key, e.g. "month") */
  key: string;
  /** The registered field name (used to look up the field config) */
  fieldName: string;
}

interface FieldConfig {
  getSubmitValue: () => string | Record<string, string>;
  getValidationErrors: () => string[];
  mask?: string;
  validationRules?: ValidationRule[];
  type?: string;
  tokenizationConfig?: TokenizationConfig;
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
   * @param getSubmitValue - A function that returns the current value of the field.
   * @param getValidationErrors - A function that returns an array of validation errors for the field.
   * @param type - The type of the field.
   * @param validationRules - An array of validation rules for the field (optional).
   * @param updateCallback - A callback function that is invoked when the field's configuration is updated (optional).
   */
  registerField(
    fieldName: string,
    getSubmitValue: () => string | Record<string, string>,
    getValidationErrors: () => string[],
    tokenizationConfig?: TokenizationConfig,
    type?: string,
    validationRules: ValidationRule[] = [],
    updateCallback?: FieldUpdateCallback
  ) {
    this.fields[fieldName] = {
      getSubmitValue: getSubmitValue,
      getValidationErrors,
      tokenizationConfig,
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
   * @description The main function for submitting the form data.
   * @param {string} path - The API endpoint path.
   * @param {string} method - The HTTP method (default is POST).
   * @param {Record<string, any>} extraData - Additional data to send.
   * @param {Record<string, any>} customRequestStructure - JSON pattern, applies a custom structure template to the collected sensitive data.
   * @returns {Promise<any>} - A Promise that resolves with the server response, or rejects with a validation error.
   */
  public async submit(
    path: string = '',
    method: string = 'POST',
    extraData: Record<string, any> = {},
    customRequestStructure?: Record<string, any>
  ): Promise<any> {
    try {
      const { data: finalPayload, url } = await this.prepareSubmission(
        async () => {
          // Collect the input field data.
          const collectedData = await this.collectFieldData();
          // If a custom structure is provided, apply it to wrap the input data.
          const wrappedData = customRequestStructure
            ? this.applyCustomStructure(customRequestStructure, collectedData)
            : collectedData;
          // Merge non-input extraData with the wrapped input data.
          return { ...wrappedData, ...extraData };
        },
        path
      );
      return await this.submitDataToServer(url, method, finalPayload);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Submission failed: ${error.message}`);
      } else {
        throw new Error(`Submission failed: ${String(error)}`);
      }
    }
  }

  /**
   * @description The function for tokenizating data on VGS backend.
   * @returns {Promise<any>} - A Promise that resolves with the tokenization response, or rejects with a validation error.
   */
  public async tokenize(): Promise<any> {
    const { collectedData, fieldMappings } =
      await this.collectFieldTokenizationData();
    const { url } = await this.prepareSubmission(
      () => Promise.resolve({ data: collectedData }),
      'tokens'
    );
    try {
      const response = await this.submitDataToServer(url, 'POST', {
        data: collectedData,
      });
      const responseJson = await response.json();
      return this.parseTokenizationResponse(responseJson, fieldMappings);
    } catch (error) {
      throw new Error(
        `Tokenization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * @description Collects submit data form fields, handling asynchronous operations.
   * @returns {Promise<Record<string, any>>} An object containing the field data.
   */
  private async collectFieldData(): Promise<Record<string, any>> {
    const collectedData: Record<string, any> = {};

    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];
      if (!field) continue;
      const submitValue = field.getSubmitValue();
      if (typeof submitValue === 'object' && submitValue !== null) {
        Object.assign(collectedData, submitValue);
      } else if (submitValue !== undefined) {
        collectedData[fieldName] = submitValue;
      }
    }
    return collectedData;
  }

  // Helper method for preparing a submission
  private async prepareSubmission<T>(
    dataCollector: () => Promise<T>,
    path: string
  ): Promise<{ data: T; url: string }> {
    const data = await dataCollector();
    const validationErrors = this.validateFields();
    if (validationErrors) {
      return Promise.reject({
        message: 'VGS_FORM_VALIDATION_FAILED',
        errors: validationErrors,
      });
    }
    await this.awaitCnameValidation();
    const url = this.buildUrl(path);
    return { data, url };
  }

  // Helper method for checking if CNAME validation is in progress
  private async awaitCnameValidation() {
    if (this.isCnameValidating && this.cnameValidationPromise) {
      await this.cnameValidationPromise;
    }
  }

  /**
   * @description Collects data from fields with tokenization config, handling asynchronous operations.
   * @returns {Promise<Record<string, any>>} An object containing the field data.
   */
  private async collectFieldTokenizationData(): Promise<{
    collectedData: Array<Record<string, any>>; // an array of field data objects
    fieldMappings: TokenizationFieldMapping[];
  }> {
    const collectedData: Array<Record<string, any>> = [];
    const fieldMappings: TokenizationFieldMapping[] = [];

    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];
      if (!field || field.tokenizationConfig === undefined) continue;

      const submitValue = field.getSubmitValue();

      if (typeof submitValue === 'object' && submitValue !== null) {
        // For fields with a serializer, iterate over its keys.
        for (const key in submitValue) {
          const config = field.tokenizationConfig;
          const fieldData = {
            value: submitValue[key],
            storage: config.storage,
            format: config.format,
          };
          collectedData.push(fieldData);
          // Store a mapping that keeps track of the parent field and the specific sub-key.
          fieldMappings.push({ key, fieldName });
        }
      } else {
        // For simple fields, use the field name as both.
        const config = field.tokenizationConfig;
        const fieldData = {
          value: submitValue,
          storage: config.storage,
          format: config.format,
        };
        collectedData.push(fieldData);
        fieldMappings.push({ key: fieldName, fieldName });
      }
    }
    return { collectedData, fieldMappings };
  }

  private parseTokenizationResponse(
    responseJson: any,
    fieldMappings: TokenizationFieldMapping[]
  ): Record<string, string> {
    const tokenizedData: Record<string, string> = {};

    responseJson.data.forEach((item: any, index: number) => {
      const mapping = fieldMappings[index];
      if (mapping) {
        // Get the tokenization config from the registered field
        const config = this.fields[mapping.fieldName]?.tokenizationConfig;
        const requestedFormat = config?.format;
        // Find the alias for the requested format
        const alias = item.aliases.find(
          (a: any) => a.format === requestedFormat
        )?.alias;
        if (alias) {
          // Use the mapping key (which might be a sub-key like "month") as the output key.
          tokenizedData[mapping.key] = alias;
        }
      }
    });

    return tokenizedData;
  }

  /**
   * @description Validates the form fields using the getValidationErrors() method.
   * @returns {Record<string, string[]> | null} An object containing validation errors, or null if no errors exist.
   */
  private validateFields(): Record<string, string[]> | null {
    const errors: Record<string, string[]> = {};
    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];
      if (!field) continue;

      const validationErrors = field.getValidationErrors(); // Use getValidationErrors()
      if (validationErrors.length > 0) {
        errors[fieldName] = validationErrors;
      }
    }
    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * @description Submits data to the server using fetch.
   * @param {string} url - The URL to send the request to.
   * @param {string} method - The HTTP method (default is POST).
   * @param {Record<string, any>} data - The data to send.
   * @returns {Promise<any>} - A Promise that resolves with the JSON response from the server, or rejects with an error.
   * @throws {Error} - An error if the request is not successful.
   */
  private async submitDataToServer(
    url: string,
    method: string,
    data: Record<string, any>
  ): Promise<any> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.customHeaders,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        // Handle non-2xx HTTP status codes
        const errorText = await response.text(); // Get the error body
        try {
          const errorJson = JSON.parse(errorText); // Try to parse as JSON
          const errorMessage =
            errorJson.message ||
            errorJson.error ||
            errorText ||
            `HTTP error ${response.status}`; // Prefer JSON message
          throw new Error(errorMessage); // Throw an error with the server's message
        } catch (jsonError) {
          // If not JSON, just use the text or status
          throw new Error(errorText || `HTTP error ${response.status}`);
        }
      }
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Submission failed: ${error.message}`);
      } else {
        throw new Error(`Submission failed: ${String(error)}`);
      }
    }
  }

  private buildUrl(path: string): string {
    // Sanitize the path to prevent injection
    const sanitizedPath = path.replace(/[^\w.\-\/]/g, '');

    if (this.cname) {
      // Append the sanitized path to the CNAME. Check for double slashes
      return `https://${this.cname.replace(/\/+$/, '')}/${sanitizedPath.replace(/^\/+/, '')}`;
    }
    const baseUrl = this.routeId
      ? `${this.tenantId}-${this.routeId}.${this.environment}.verygoodproxy.com`
      : `${this.tenantId}.${this.environment}.verygoodproxy.com`;
    return `https://${baseUrl}/${sanitizedPath.replace(/^\/+/, '')}`;
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

  /**
   * Recursively applies a custom structure template to the collected sensitive data.
   * It replaces any placeholder string matching the pattern {{ fieldName }}
   * with the corresponding value from the sensitiveData.
   *
   * @param template - The custom JSON structure template.
   * @param sensitiveData - The object containing collected sensitive fields.
   * @returns The final object with the placeholders replaced by actual values.
   */
  private applyCustomStructure(
    template: any,
    sensitiveData: Record<string, any>
  ): any {
    if (typeof template === 'string') {
      return template.replace(/{{\s*(\w+)\s*}}/g, (_match, fieldName) => {
        return sensitiveData[fieldName] !== undefined
          ? sensitiveData[fieldName]
          : '';
      });
    } else if (Array.isArray(template)) {
      return template.map((item) =>
        this.applyCustomStructure(item, sensitiveData)
      );
    } else if (typeof template === 'object' && template !== null) {
      const result: any = {};
      for (const key in template) {
        result[key] = this.applyCustomStructure(template[key], sensitiveData);
      }
      return result;
    }
    return template;
  }
}

export default VGSCollect;
