// VGSCollect.test.ts
import VGSCollect from '../../collector/VGSCollect';
import APIHostnameValidator from '../../utils/url/APIHostnameValidator';
import { PaymentCardBrandsManager } from '../../utils/paymentCards/PaymentCardBrandsManager';
import { VGSError } from '../../utils/errors';

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
      collect.setRouteId('route123');
      // Access private property via casting
      expect((collect as any).routeId).toBe('route123');
    });

    it('should throw an error if routeId is not a string', () => {
      const collect = new VGSCollect(tenantId, environment);
      // @ts-ignore: Passing a non-string to force error
      expect(() => collect.setRouteId(123)).toThrow(
        'VGSCollect: Invalid routeId error'
      );
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
    it('should return an object with { status, response } on a successful fetch', async () => {
      const collect = new VGSCollect(tenantId, environment);
      const fakeFetchResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
      global.fetch = jest.fn().mockResolvedValue(fakeFetchResponse);

      const submitDataToServer = (collect as any).submitDataToServer.bind(
        collect
      );
      const url = 'https://example.com/api';
      const method = 'POST';
      const data = { key: 'value' };

      const result = await submitDataToServer(url, method, data);

      // We expect { status, response }
      expect(result.status).toBe(200);
      expect(result.response).toBe(fakeFetchResponse);
    });

    it('should return an object with { status, response } even if response.ok is false', async () => {
      const collect = new VGSCollect(tenantId, environment);
      const fakeFetchResponse = {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not Found' }),
      };
      global.fetch = jest.fn().mockResolvedValue(fakeFetchResponse);

      const submitDataToServer = (collect as any).submitDataToServer.bind(
        collect
      );
      const result = await submitDataToServer(
        'https://example.com/api',
        'GET',
        {}
      );

      // No throw for non-2xx. We simply return { status, response }
      expect(result.status).toBe(404);
      expect(result.response).toBe(fakeFetchResponse);
    });

    it('should throw an Error on actual network failure (fetch reject)', async () => {
      const collect = new VGSCollect(tenantId, environment);
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const submitDataToServer = (collect as any).submitDataToServer.bind(
        collect
      );

      await expect(
        submitDataToServer('https://example.com/api', 'POST', {})
      ).rejects.toThrow('Network error');
    });
  });

  describe('submit', () => {
    it('should return { status, response } on success', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Stub collectFieldData to return dummy data.
      (collect as any).collectFieldData = jest
        .fn()
        .mockResolvedValue({ field: 'value' });
      (collect as any).awaitCnameValidation = jest
        .fn()
        .mockResolvedValue(undefined);
      (collect as any).buildUrl = jest
        .fn()
        .mockReturnValue('https://test.com/submit');
      (collect as any).submitDataToServer = jest.fn().mockResolvedValue({
        status: 200,
        response: {
          ok: true,
          json: async () => ({ success: true }),
        },
      });

      const result = await collect.submit('/submit');
      expect(result.status).toBe(200);
      // "result.response" is the fetch Response
      expect(result.response.ok).toBe(true);
      const body = await result.response.json();
      expect(body).toEqual({ success: true });
    });

    it('should return { status, response } if server responds with error (non-2xx)', async () => {
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
      (collect as any).submitDataToServer = jest.fn().mockResolvedValue({
        status: 400,
        response: {
          ok: false,
          json: async () => ({ error: 'Bad Request' }),
        },
      });

      const result = await collect.submit('/submit');
      expect(result.status).toBe(400);
      expect(result.response.ok).toBe(false);
      const body = await result.response.json();
      expect(body).toEqual({ error: 'Bad Request' });
    });

    it('should throw if fetch rejects', async () => {
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

      await expect(collect.submit('/submit')).rejects.toThrow('Server error');
    });
    it('should throw a VGSError if fields fail validation', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Register a field that intentionally fails validation
      collect.registerField(
        'failingField',
        () => 'some invalid value',
        () => ['Field is not valid']
      );
      // Attempt to submit, expecting VGSError due to validation failure
      await expect(collect.submit('/submit')).rejects.toThrow(VGSError);
    });
  });
  /** 
  describe('tokenize', () => {
    it('should return { status, response: parsedTokens } when response is ok', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Stub collectFieldTokenizationData
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
      (collect as any).prepareSubmission = jest.fn().mockResolvedValue({
        url: 'https://test.com/tokens',
      });
      // Suppose fetch is ok
      (collect as any).submitDataToServer = jest.fn().mockResolvedValue({
        status: 200,
        response: {
          ok: true,
          json: async () => ({
            data: [
              {
                aliases: [{ format: 'alias', alias: 'token123' }],
              },
            ],
          }),
        },
      });
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
      // For a 200 and ok response, we place the parsed tokens in result.response
      expect(result.status).toBe(200);
      expect(result.response).toEqual({ field1: 'token123' });
    });

    it('should return { status, response: fetchResponse } if response is not ok', async () => {
      const collect = new VGSCollect(tenantId, environment);
      // Stub collectFieldTokenizationData
      (collect as any).collectFieldTokenizationData = jest
        .fn()
        .mockResolvedValue({
          collectedData: [],
          fieldMappings: [],
        });
      (collect as any).prepareSubmission = jest.fn().mockResolvedValue({
        url: 'https://test.com/tokens',
      });
      (collect as any).submitDataToServer = jest.fn().mockResolvedValue({
        status: 400,
        response: {
          ok: false,
          json: async () => ({ error: 'Bad Request' }),
        },
      });

      const result = await collect.tokenize();
      // For a non-ok fetch, code returns { status, response: rawFetchResponse }
      expect(result.status).toBe(400);
      expect(result.response.ok).toBe(false);

      const body = await result.response.json();
      expect(body).toEqual({ error: 'Bad Request' });
    });

    it('should throw if network fails (fetch reject)', async () => {
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

      await expect(collect.tokenize()).rejects.toThrow('Network error');
    });
  });
  */
});
