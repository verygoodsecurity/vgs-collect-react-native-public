// APIHostnameValidator.ts

import VGCollectLogger, {
  VGSLogLevel,
  VGSLogSeverity,
} from '../logger/VGSCollectLogger';

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
      this.logCnameError(
        'Hostname is invalid (empty) and will be ignored. Default Vault URL will be used.'
      );
      return false;
    }
    try {
      const url = await this.buildHostValidationURLstring(
        normalizedHostname,
        tenantId
      );
      if (!url) {
        this.logCnameError(
          `Error: Cannot build validation URL with tenantId: "${tenantId}", hostname: "${hostname}"`
        );
        return false;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const message =
          response.status === 403
            ? `A specified host: "${hostname}" was not correct. Looks like you don't activate cname for VGSCollect SDK on the Dashboard`
            : `Error: Cannot resolve hostname "${hostname}". Status code: ${response.status}`;
        this.logCnameError(message);
        return false;
      }

      const responseText = await response.text();
      return responseText.includes(normalizedHostname);
    } catch (error) {
      this.logCnameError(
        `Error: Cannot resolve hostname "${normalizedHostname}". Error: ${error}`
      );
      return false;
    }
  }

  private static logCnameError(message: string) {
    VGCollectLogger.getInstance().log({
      logLevel: VGSLogLevel.WARNING,
      text: message,
      severity: VGSLogSeverity.ERROR,
    });
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
