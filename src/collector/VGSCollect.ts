// VGSCollect.ts
import APIHostnameValidator from '../utils/url/APIHostnameValidator';
import { LengthRule, PatternRule } from '../utils/validators';
import { ValidationRule } from '../utils/validators/Validator';
import { PaymentCardBrandsManager } from '../utils/paymentCards/PaymentCardBrandsManager';
import type { VGSTokenizationConfiguration } from '../utils/tokenization/TokenizationConfiguration';
import { VGSError, VGSErrorCode } from '../utils/errors';
import VGCollectLogger, {
  VGSLogLevel,
  VGSLogSeverity,
} from '../utils/logger/VGSCollectLogger';
import VGSAnalyticsClient, {
  AnalyticEventStatus,
} from '../utils/analytics/AnalyticsClient';
import { AnalyticsEventType } from '../utils/analytics/AnalyticsClient';
import FormAnalyticsDetails from '../utils/analytics/FormAnalyticsDetails';
import {
  getTypeAnalyticsString,
  type VGSInputType,
} from '../components/VGSInputType';
import { getVaultAPIPath, ValutAPIVersion } from './ValutAPI';

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
  tokenizationConfig?: VGSTokenizationConfiguration;
  updateCallback?: FieldUpdateCallback;
}
/**
 * The main class for the VGSCollect SDK.
 * It provides methods for registering fields, submitting data, and tokenizing data.
 */
class VGSCollect {
  private tenantId: string;
  private environment: string;
  private routeId?: string;
  private cname?: string;
  private customHeaders: Record<string, string> = {};
  private isCnameValidating: boolean = false;
  private cnameValidationPromise: Promise<boolean> | null = null;
  private fields: Record<string, FieldConfig> = {};
  private logger: VGCollectLogger = VGCollectLogger.getInstance();
  private analyticsClient = VGSAnalyticsClient.getInstance();
  private formAnalyticsDetails: FormAnalyticsDetails;

  /**
   * Creates a new VGSCollect instance with Vault Id.
   *
   * @param id - The VGS Vault ID.
   * @param environment - The environment (sandbox, live, live-[region]).
   */
  public constructor(id: string, environment: string = 'sandbox') {
    this.validateConfig(id, environment);
    this.tenantId = id;
    this.environment = environment.toLowerCase();
    this.formAnalyticsDetails = new FormAnalyticsDetails(id, environment);
  }

  /**
   * Creates a new VGSCollect instance with AccoutId Id.
   *
   * @param accountId - The Card Management API AccoutId Id.
   * @param environment - The environment (sandbox, live).
   */
  public static createWithAccountId(
    accountId: string,
    environment: string = 'sandbox'
  ): VGSCollect {
    return new VGSCollect(accountId, environment);
  }
  /**
   * Sets the route ID for the VGSCollect instance.
   *
   * @param routeId - The vault route ID to set.
   * @returns The VGSCollect instance for chaining.
   * @throws {Error} If the route ID is not a string.
   */
  public setRouteId(routeId: string) {
    this.validateRouteId(routeId);
    this.routeId = routeId;
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
          this.analyticsClient.trackFormEvent(
            this.formAnalyticsDetails,
            AnalyticsEventType.HostnameValidation,
            isValid ? AnalyticEventStatus.Success : AnalyticEventStatus.Failed,
            { hostname: cname }
          );
          resolve(isValid);
        })
        .catch((error) => {
          this.analyticsClient.trackFormEvent(
            this.formAnalyticsDetails,
            AnalyticsEventType.HostnameValidation,
            AnalyticEventStatus.Failed,
            { hostname: cname }
          );
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
    tokenizationConfig?: VGSTokenizationConfiguration,
    type?: VGSInputType,
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
    this.analyticsClient.trackFormEvent(
      this.formAnalyticsDetails,
      AnalyticsEventType.FieldInit,
      AnalyticEventStatus.Success,
      { field: getTypeAnalyticsString(type ?? 'text') }
    );
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
  ): Promise<{ status: number; response: any } | never> {
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
        this.BASE_VAULT_URL,
        path
      );
      const { status, response } = await this.submitDataToServer(
        url,
        method,
        finalPayload
      );
      // Log the response
      this.logger.logResponse(response);
      return { status, response };
    } catch (error) {
      throw error;
    }
  }

  public async createAliases(): Promise<{
    status: number;
    data: Record<string, string> | any;
  }> {
    try {
      return await this._handleTokenization(
        ValutAPIVersion.v2,
        this.collectFieldTokenizationData.bind(this)
      );
    } catch (error) {
      throw error;
    }
  }

  private buildCmpAPIUrl(path: string): string {
    const environment = this.environment.toLowerCase();
    const baseUrl =
      environment === 'sandbox'
        ? 'https://sandbox.vgsapi.com'
        : 'https://vgsapi.com';
    const formattedPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${formattedPath}`;
  }

  /**
   * @description Creates a new card in the Card Management API(https://www.verygoodsecurity.com/docs/api/card-management#tag/card-management/POST/cards).
   * @returns {Promise<{ status: number; response: any }>} - A Promise that resolves with the server response.
   * @throws {VGSError} - If validation fails or if the request is not successful.
   * @requires **Authorization** - Card Management API requires **authToken** and proper **Content-Type** set in `customHeaders`.
   */
  public async createCard(): Promise<{ status: number; response: any }> {
    // Will throw VGSError if validation fails
    this.validateFields();
    this.setCustomHeaders(this.customHeaders);
    // prepare cmp json data
    const fieldsData = await this.collectFieldData();
    const data = { data: { attributes: fieldsData } };
    // get the URL for the cmp API
    const url = this.buildCmpAPIUrl(`cards`);
    return this.submitDataToServer(url, 'POST', data, { upstream: 'cmp' });
  }

  public async tokenize(): Promise<{
    status: number;
    data: Record<string, string> | any;
  }> {
    try {
      return await this._handleTokenization(
        ValutAPIVersion.v1,
        this.collectFieldTokenizationData.bind(this)
      );
    } catch (error) {
      throw error;
    }
  }

  private async _handleTokenization(
    apiVersion: ValutAPIVersion,
    collectedDataFetcher: () => Promise<{
      collectedData: any[];
      fieldMappings: TokenizationFieldMapping[];
    }>
  ): Promise<{ status: number; data: Record<string, string> | any } | never> {
    const apiPath = getVaultAPIPath(apiVersion);
    const { collectedData, fieldMappings } = await collectedDataFetcher();
    const { url } = await this.prepareSubmission(
      () => Promise.resolve({ data: collectedData }),
      this.BASE_VAULT_URL,
      apiPath
    );

    if (collectedData.length === 0) {
      this.analyticsClient.trackFormEvent(
        this.formAnalyticsDetails,
        AnalyticsEventType.Submit,
        AnalyticEventStatus.Success,
        { statusCode: 200 }
      );
      this.logger.log({
        logLevel: VGSLogLevel.WARNING,
        text: 'No data to tokenize!',
        severity: VGSLogSeverity.WARNING,
      });
      return { status: 200, data: {} };
    }

    const upstreamData =
      apiVersion === ValutAPIVersion.v1 ? 'tokenization' : 'vaultApi';
    const { status, response } = await this.submitDataToServer(
      url,
      'POST',
      {
        data: collectedData,
      },
      { upstream: upstreamData }
    );

    if (!response.ok) {
      this.logger.logTokenizationResponse(response, {});
      return { status, data: response };
    }

    const responseJson = await response.json();
    const result = this.parseTokenizationResponse(responseJson, fieldMappings);
    this.logger.logTokenizationResponse(response, result);
    return { status, data: result };
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
    baseUrl: string,
    path: string
  ): Promise<{ data: T; url: string }> {
    const data = await dataCollector();
    // Will throw VGSError if validation fails
    this.validateFields();
    await this.awaitCnameValidation();
    const url = this.buildUrl(baseUrl, path);
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
   */
  private validateFields() {
    const errors: Record<string, string[]> = {};
    for (const fieldName in this.fields) {
      const field = this.fields[fieldName];
      if (!field) continue;

      const validationErrors = field.getValidationErrors();
      if (validationErrors.length > 0) {
        errors[fieldName] = validationErrors;
      }
    }
    if (Object.keys(errors).length > 0) {
      const errorCode = VGSErrorCode.InputDataIsNotValid;
      this.analyticsClient.trackFormEvent(
        this.formAnalyticsDetails,
        AnalyticsEventType.BeforeSubmit,
        AnalyticEventStatus.Failed,
        { statusCode: errorCode }
      );
      this.logger.log({
        severity: VGSLogSeverity.WARNING,
        text: `Input data not valid in fields: ${Object.keys(errors)}`,
        logLevel: VGSLogLevel.WARNING,
      });
      throw new VGSError(
        errorCode,
        'VGSCollect: Input data not valid!',
        errors
      );
    }
  }

  /**
   * @description Submits data to the server using fetch.
   * @param {string} url - The URL to send the request to.
   * @param {string} method - The HTTP method (default is POST).
   * @param {Record<string, any>} data - The data to send.
   * @returns {Promise<{ status: number; response: any }>} - A Promise that resolves with the server response.
   * @throws {Error} - An error if the request is not successful.
   */
  private async submitDataToServer(
    url: string,
    method: string,
    data: Record<string, any>,
    analyticsData?: Record<string, any>
  ): Promise<{ status: number; response: any } | never> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...VGSAnalyticsClient.getInstance().collectHTTPHeaders,
        ...this.customHeaders,
      };
      this.logger.logRequest(url, headers, data);
      this.analyticsClient.trackFormEvent(
        this.formAnalyticsDetails,
        AnalyticsEventType.BeforeSubmit,
        AnalyticEventStatus.Success,
        { statusCode: 200, analyticsData }
      );
      const response = await fetch(url, {
        method,
        headers: headers,
        body: JSON.stringify(data),
      });
      this.analyticsClient.trackFormEvent(
        this.formAnalyticsDetails,
        AnalyticsEventType.Submit,
        response.ok ? AnalyticEventStatus.Success : AnalyticEventStatus.Failed,
        { statusCode: response.status, analyticsData }
      );
      return { status: response.status, response };
    } catch (error) {
      var errorMessage = 'unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.analyticsClient.trackFormEvent(
        this.formAnalyticsDetails,
        AnalyticsEventType.Submit,
        AnalyticEventStatus.Failed,
        { error: errorMessage, analyticsData }
      );
      throw error;
    }
  }

  BASE_VAULT_URL = 'verygoodproxy.com';
  private buildUrl(baseDomain: string, path: string = ''): string {
    // Sanitize the path to prevent injection
    const sanitizedPath = path
      .replace(/[^\w\-\/]/g, '')
      .replace(/\/{2,}/g, '/');

    const baseUrl = this.cname
      ? `https://${this.cname.replace(/\/+$/, '')}`
      : `https://${this.getBaseUrl(baseDomain)}`;

    const resultUrl = `${baseUrl}/${sanitizedPath.replace(/^\/+/, '')}`;

    if (this.isValidURL(resultUrl)) {
      return resultUrl;
    } else {
      throw new VGSError(VGSErrorCode.InvalidConfigurationURL, 'Invalid URL', {
        URL: resultUrl,
      });
    }
  }

  private getBaseUrl(baseDomain: string): string {
    const defaultBaseDomain = baseDomain || this.BASE_VAULT_URL;
    if (defaultBaseDomain === this.BASE_VAULT_URL && this.routeId) {
      return `${this.tenantId}-${this.routeId}.${this.environment}.${defaultBaseDomain}`;
    }
    return `${this.tenantId}.${this.environment}.${defaultBaseDomain}`;
  }

  private isValidURL(string: string) {
    try {
      return new URL(string) ? true : false;
    } catch (error) {
      return false;
    }
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

  private validateConfig(tenantId: string, env: string) {
    const pattern = /^[a-zA-Z0-9]+$/;
    if (!tenantId || typeof tenantId !== 'string' || !pattern.test(tenantId)) {
      throw new VGSError(
        VGSErrorCode.InvalidVaultConfiguration,
        'VGSCollect -init Error: Invalid tenantId!'
      );
    }
    const lowerCaseEnv = env.toLowerCase();

    const ENVIRONMENTS = ['sandbox', 'live', 'live-'];
    if (lowerCaseEnv.startsWith('live-')) {
      return;
    }
    if (
      !ENVIRONMENTS.some(
        (allowedEnv) => allowedEnv.toLowerCase() === lowerCaseEnv
      )
    ) {
      throw new VGSError(
        VGSErrorCode.InvalidVaultConfiguration,
        `VGSCollect -init Error: Available environments are: 'sandbox', 'live' or 'live-' with specified region`
      );
    }
  }

  private validateRouteId(routeId: string) {
    if (!routeId || typeof routeId !== 'string') {
      throw new VGSError(
        VGSErrorCode.InvalidVaultConfiguration,
        'VGSCollect: Invalid routeId error'
      );
    }
  }
}

export default VGSCollect;
