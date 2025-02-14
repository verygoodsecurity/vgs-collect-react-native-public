// VGSCollect.test.ts
import VGSCollect from '../../collector/VGSCollect';
import APIHostnameValidator from '../../utils/url/APIHostnameValidator';
import { PaymentCardBrandsManager } from '../../utils/paymentCards/PaymentCardBrandsManager';

// --- Mocks ---
// Mock the APIHostnameValidator module
jest.mock('../../utils/url/APIHostnameValidator', () => ({
  __esModule: true,
  default: {
    validateCustomHostname: jest.fn(),
  },
}));

// Mock PaymentCardBrandsManager
jest.mock('../../utils/paymentCards/PaymentCardBrandsManager', () => {
  const instance = {
    getBrandByName: jest.fn(),
  };
  return {
    PaymentCardBrandsManager: {
      getInstance: () => instance,
    },
  };
});

// A helper to reset the global fetch mock between tests
const originalFetch = global.fetch;
afterEach(() => {
  jest.clearAllMocks();
  global.fetch = originalFetch;
});

describe('VGSCollect', () => {
  const tenantId = 'tenant';
  const environment = 'sandbox';

  describe('setRouteId', () => {
    it('should set the routeId when a valid string is provided', () => {
      const collect = new VGSCollect(tenantId, environment);
      const result = collect.setRouteId('route123');
      // The method returns the instance for chaining.
      expect(result).toBeInstanceOf(VGSCollect);
      // Access private property via casting
      expect((collect as any).routeId).toBe('route123');
    });

    it('should throw an error if routeId is not a string', () => {
      const collect = new VGSCollect(tenantId, environment);
      // @ts-ignore: Passing a non-string to force error
      expect(() => collect.setRouteId(123)).toThrow('routeIdTypeMismatch');
    });
  });

  describe('setCustomHeaders', () => {
    it('should set custom headers correctly', () => {
      const collect = new VGSCollect(tenantId, environment);
      const headers = { Authorization: 'Bearer token' };
      collect.setCustomHeaders(headers);
      expect((collect as any).customHeaders).toEqual(headers);
    });
  });

  describe('setCname', () => {
    it('should clear cname if an empty string is provided', async () => {
      const collect = new VGSCollect(tenantId, environment);
      await collect.setCname('');
      expect((collect as any).cname).toBeUndefined();
    });

    it('should validate and set cname if valid', async () => {
      // Mock APIHostnameValidator to resolve as valid
      (
        APIHostnameValidator.validateCustomHostname as jest.Mock
      ).mockResolvedValue(true);
      const collect = new VGSCollect(tenantId, environment);
      await collect.setCname('example.com');
      expect(APIHostnameValidator.validateCustomHostname).toHaveBeenCalledWith(
        'example.com',
        tenantId
      );
      expect((collect as any).cname).toBe('example.com');
    });

    it('should set cname to undefined if validation fails', async () => {
      // Mock APIHostnameValidator to resolve as false
      (
        APIHostnameValidator.validateCustomHostname as jest.Mock
      ).mockResolvedValue(false);
      const collect = new VGSCollect(tenantId, environment);
      await collect.setCname('invalid.com');
      expect((collect as any).cname).toBeUndefined();
    });

    it('should handle errors during validation', async () => {
      // Mock APIHostnameValidator to reject
      (
        APIHostnameValidator.validateCustomHostname as jest.Mock
      ).mockRejectedValue(new Error('Validation error'));
      const collect = new VGSCollect(tenantId, environment);
      await expect(collect.setCname('error.com')).rejects.toThrow(
        'Validation error'
      );
      expect((collect as any).cname).toBeUndefined();
    });
  });

  describe('buildUrl', () => {
    // We test the private buildUrl method via type assertion.
    it('should build URL using default base when no cname is provided', () => {
      const collect = new VGSCollect(tenantId, environment);
      // Set a routeId so that baseUrl uses tenantId-routeId...
      collect.setRouteId('route1');
      const buildUrl = (collect as any).buildUrl.bind(collect);
      const url = buildUrl('/my/path');
      expect(url).toBe(
        'https://tenant-route1.sandbox.verygoodproxy.com/my/path'
      );
    });

    it('should build URL using cname and remove extra slashes', () => {
      const collect = new VGSCollect(tenantId, environment);
      // Directly set the cname (bypassing validation)
      (collect as any).cname = 'example.com/';
      const buildUrl = (collect as any).buildUrl.bind(collect);
      // Leading slash in path should be trimmed
      const url = buildUrl('/another/path');
      expect(url).toBe('https://example.com/another/path');
    });

    it('should sanitize unwanted characters from the path', () => {
      const collect = new VGSCollect(tenantId, environment);
      const buildUrl = (collect as any).buildUrl.bind(collect);
      // Characters like "<" and ">" should be removed.
      const url = buildUrl('/my/<script>path');
      // Expected: "<" and ">" are removed.
      expect(url).toBe(
        `https://${tenantId}.${environment}.verygoodproxy.com/my/scriptpath`
      );
    });
  });

  describe('registerField and unregisterField', () => {
    it('should register a field and then unregister it', () => {
      const collect = new VGSCollect(tenantId, environment);
      const dummyGetValue = jest.fn(() => 'value');
      const dummyValidation = jest.fn(() => []);
      collect.registerField('field1', dummyGetValue, dummyValidation);
      expect((collect as any).fields.field1).toBeDefined();

      collect.unregisterField('field1');
      expect((collect as any).fields.field1).toBeUndefined();
    });
  });

  describe('updateFieldByType', () => {
    it('should update fields of a specific type and invoke updateCallback', () => {
      const collect = new VGSCollect(tenantId, environment);
      const dummyGetValue = jest.fn(() => 'value');
      const dummyValidation = jest.fn(() => []);
      const updateCallback = jest.fn();

      // Register two fields: one with type 'cvc' and one with a different type.
      collect.registerField(
        'field1',
        dummyGetValue,
        dummyValidation,
        undefined,
        'cvc',
        [],
        updateCallback
      );
      collect.registerField(
        'field2',
        dummyGetValue,
        dummyValidation,
        undefined,
        'text'
      );

      collect.updateFieldByType('cvc', { mask: '###', validationRules: [] });
      const field1 = (collect as any).fields.field1;
      const field2 = (collect as any).fields.field2;
      expect(field1.mask).toBe('###');
      // Callback should have been called.
      expect(updateCallback).toHaveBeenCalledWith({
        mask: '###',
        validationRules: [],
      });
      // Field2 should remain unchanged.
      expect(field2.mask).toBeUndefined();
    });
  });

  describe('updateCvcFieldForBrand', () => {
    it('should update CVC fields based on the card brand', () => {
      const collect = new VGSCollect(tenantId, environment);
      const dummyGetValue = jest.fn(() => '123');
      const dummyValidation = jest.fn(() => []);
      const updateCallback = jest.fn();
      collect.registerField(
        'cvcField',
        dummyGetValue,
        dummyValidation,
        undefined,
        'cvc',
        [],
        updateCallback
      );

      // Setup the PaymentCardBrandsManager mock.
      const brand = {
        cvcLengths: [3, 4],
      };
      const managerInstance = PaymentCardBrandsManager.getInstance();
      (managerInstance.getBrandByName as jest.Mock).mockReturnValue(brand);

      collect.updateCvcFieldForBrand('visa');

      // Check that the field was updated: mask should be '####' (because max length is 4)
      const field = (collect as any).fields.cvcField;
      expect(field.mask).toBe('####');
      expect(updateCallback).toHaveBeenCalledWith({
        mask: '####',
        validationRules: expect.any(Array),
      });
    });

    it('should do nothing if brand is not found', () => {
      const collect = new VGSCollect(tenantId, environment);
      const dummyGetValue = jest.fn(() => '123');
      const dummyValidation = jest.fn(() => []);
      collect.registerField(
        'cvcField',
        dummyGetValue,
        dummyValidation,
        undefined,
        'cvc'
      );

      const managerInstance = PaymentCardBrandsManager.getInstance();
      (managerInstance.getBrandByName as jest.Mock).mockReturnValue(null);

      // Should not throw and field remains unchanged.
      expect(() => collect.updateCvcFieldForBrand('unknown')).not.toThrow();
      const field = (collect as any).fields.cvcField;
      expect(field.mask).toBeUndefined();
    });
  });

  describe('findFieldNameByType', () => {
    it('should find the first field with the given type', () => {
      const collect = new VGSCollect(tenantId, environment);
      const dummyGetValue = jest.fn(() => 'val');
      const dummyValidation = jest.fn(() => []);
      collect.registerField(
        'field1',
        dummyGetValue,
        dummyValidation,
        undefined,
        'text'
      );
      collect.registerField(
        'field2',
        dummyGetValue,
        dummyValidation,
        undefined,
        'cvc'
      );

      expect(collect.findFieldNameByType('cvc')).toBe('field2');
      expect(collect.findFieldNameByType('text')).toBe('field1');
    });

    it('should return undefined if no field matches the type', () => {
      const collect = new VGSCollect(tenantId, environment);
      expect(collect.findFieldNameByType('nonexistent')).toBeUndefined();
    });
  });

  describe('applyCustomStructure (private)', () => {
    it('should replace placeholders in a string template', () => {
      const collect = new VGSCollect(tenantId, environment);
      const applyTemplate = (collect as any).applyCustomStructure.bind(collect);
      const template = 'Hello, {{ name }}!';
      const sensitiveData = { name: 'Alice' };
      expect(applyTemplate(template, sensitiveData)).toBe('Hello, Alice!');
    });

    it('should process arrays recursively', () => {
      const collect = new VGSCollect(tenantId, environment);
      const applyTemplate = (collect as any).applyCustomStructure.bind(collect);
      const template = ['{{ a }}', '{{ b }}'];
      const sensitiveData = { a: '1', b: '2' };
      expect(applyTemplate(template, sensitiveData)).toEqual(['1', '2']);
    });

    it('should process objects recursively', () => {
      const collect = new VGSCollect(tenantId, environment);
      const applyTemplate = (collect as any).applyCustomStructure.bind(collect);
      const template = { x: '{{ x }}', y: { z: '{{ z }}' } };
      const sensitiveData = { x: 'foo', z: 'bar' };
      expect(applyTemplate(template, sensitiveData)).toEqual({
        x: 'foo',
        y: { z: 'bar' },
      });
    });
  });

  describe('submitDataToServer (private)', () => {
    // For testing submitDataToServer, we need to mock the global fetch.
    it('should submit data and return the response when fetch is successful', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Prepare a fake response
      const fakeResponse = {
        ok: true,
        json: async () => ({ success: true }),
      };
      global.fetch = jest.fn().mockResolvedValue(fakeResponse);
      const submitDataToServer = (collect as any).submitDataToServer.bind(
        collect
      );
      const url = 'https://example.com/api';
      const method = 'POST';
      const data = { key: 'value' };

      const response = await submitDataToServer(url, method, data);
      expect(global.fetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(data),
        })
      );
      expect(response).toBe(fakeResponse);
    });

    it('should throw an error when response is not ok', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Prepare a fake error response (simulate non-2xx status)
      const errorText = 'Not found';
      const fakeResponse = {
        ok: false,
        status: 404,
        text: async () => errorText,
      };
      global.fetch = jest.fn().mockResolvedValue(fakeResponse);
      const submitDataToServer = (collect as any).submitDataToServer.bind(
        collect
      );
      await expect(
        submitDataToServer('https://example.com/api', 'GET', {})
      ).rejects.toThrow(errorText);
    });
  });

  describe('submit', () => {
    it('should call submitDataToServer with correct URL and payload', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Stub collectFieldData to return dummy data.
      (collect as any).collectFieldData = jest
        .fn()
        .mockResolvedValue({ field: 'value' });
      // Stub awaitCnameValidation (no-op)
      (collect as any).awaitCnameValidation = jest
        .fn()
        .mockResolvedValue(undefined);
      // Stub buildUrl to return a known URL.
      (collect as any).buildUrl = jest
        .fn()
        .mockReturnValue('https://test.com/submit');
      // Stub submitDataToServer to return a fake response object with a json method.
      (collect as any).submitDataToServer = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });

      const response = await collect.submit('/submit');
      const json = await response.json();
      expect((collect as any).buildUrl).toHaveBeenCalledWith('/submit');
      expect((collect as any).submitDataToServer).toHaveBeenCalledWith(
        'https://test.com/submit',
        'POST',
        { field: 'value' }
      );
      expect(json).toEqual({ success: true });
    });

    it('should throw an error if submission fails', async () => {
      const collect = new VGSCollect(tenantId, environment);
      (collect as any).collectFieldData = jest
        .fn()
        .mockResolvedValue({ field: 'value' });
      (collect as any).awaitCnameValidation = jest
        .fn()
        .mockResolvedValue(undefined);
      (collect as any).buildUrl = jest
        .fn()
        .mockReturnValue('https://test.com/submit');
      (collect as any).submitDataToServer = jest
        .fn()
        .mockRejectedValue(new Error('Server error'));

      await expect(collect.submit('/submit')).rejects.toThrow(
        'Submission failed: Server error'
      );
    });
  });

  describe('tokenize', () => {
    it('should process tokenization and parse the response', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Stub collectFieldTokenizationData to return dummy data.
      const dummyCollectedData = [
        { value: 'sensitive', storage: 'vault', format: 'alias' },
      ];
      const dummyFieldMappings = [{ key: 'field1', fieldName: 'field1' }];
      (collect as any).collectFieldTokenizationData = jest
        .fn()
        .mockResolvedValue({
          collectedData: dummyCollectedData,
          fieldMappings: dummyFieldMappings,
        });
      // Stub prepareSubmission to return a known URL.
      (collect as any).prepareSubmission = jest.fn().mockResolvedValue({
        url: 'https://test.com/tokens',
      });
      // Stub submitDataToServer to return a fake response.
      const fakeResponse = {
        json: async () => ({
          data: [
            {
              aliases: [{ format: 'alias', alias: 'token123' }],
            },
          ],
        }),
      };
      (collect as any).submitDataToServer = jest
        .fn()
        .mockResolvedValue(fakeResponse);
      // Stub parseTokenizationResponse to simply return its input for testing.
      (collect as any).parseTokenizationResponse = jest
        .fn()
        .mockImplementation((responseJson, mappings) => {
          const tokenized: Record<string, string> = {};
          responseJson.data.forEach((item: any, index: number) => {
            tokenized[mappings[index].key] = item.aliases[0].alias;
          });
          return tokenized;
        });

      const result = await collect.tokenize();
      expect(result).toEqual({ field1: 'token123' });
    });

    it('should throw an error if tokenization fails', async () => {
      const collect = new VGSCollect(tenantId, environment);
      (collect as any).collectFieldTokenizationData = jest
        .fn()
        .mockResolvedValue({
          collectedData: [],
          fieldMappings: [],
        });
      (collect as any).prepareSubmission = jest.fn().mockResolvedValue({
        url: 'https://test.com/tokens',
      });
      (collect as any).submitDataToServer = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(collect.tokenize()).rejects.toThrow(
        'Tokenization failed: Network error'
      );
    });
  });
});
