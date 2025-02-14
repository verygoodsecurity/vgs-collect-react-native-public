// APIHostnameValidator.ts

class APIHostnameValidator {
  static readonly Constants = {
    validStatuses: [200, 300],
  };

  static readonly hostValidatorBaseURL = 'https://js.verygoodvault.com';

  static async validateCustomHostname(
    hostname: string,
    tenantId: string
  ): Promise<boolean> {
    if (!hostname) {
      return false;
    }

    const normalizedHostname = this.normalizeHostname(hostname);
    if (!normalizedHostname) {
      console.error(`Error: Invalid hostname: "${hostname}"`);
      return false;
    }
    try {
      const url = await this.buildHostValidationURLstring(
        normalizedHostname,
        tenantId
      );
      if (!url) {
        console.error(
          `Error: Cannot build validation URL with tenantId: "${tenantId}", hostname: "${hostname}"`
        );
        return false;
      }
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `Error: Cannot resolve hostname "${normalizedHostname}". Status code: ${response.status}`
        );
        this.logErrorForStatusCode(response.status, normalizedHostname);
        return false;
      }

      const responseText = await response.text();
      return responseText.includes(normalizedHostname);
    } catch (error) {
      console.error(
        `Error: Cannot resolve hostname "${normalizedHostname}". Error: ${error}`
      );
      return false;
    }
  }

  private static logErrorForStatusCode(statusCode: number, hostname: string) {
    switch (statusCode) {
      case 403:
        console.warn(
          `A specified host: "${hostname}" was not correct. Looks like you don't activate cname for VGSCollect SDK on the Dashboard`
        );
        break;
      default:
        console.error(
          `Error: Cannot resolve hostname "${hostname}". Status code: ${statusCode}`
        );
    }
  }

  private static async buildHostValidationURLstring(
    normalizedHostname: string,
    tenantId: string
  ): Promise<string | null> {
    const hostPath = `collect-configs/${normalizedHostname}__${tenantId}.txt`;
    const url = new URL(hostPath, this.hostValidatorBaseURL);
    return url.toString();
  }

  private static normalizeHostname(url: string): string | null {
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      const parsedUrl = new URL(url);
      // Return the hostname directly (ignores query params, paths, etc.)
      return parsedUrl.hostname;
    } catch (error) {
      return null;
    }
  }
}

export default APIHostnameValidator;
