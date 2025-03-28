/**
 * Log level enum.
 */
export enum VGSLogSeverity {
  WARNING = `⚠️`,
  ERROR = `❌`,
}

/**
 * Severity level enum.
 */
export enum VGSLogLevel {
  /// Log *all* events including errors and warnings.
  INFO = 'info',
  // Log *only* events indicating warnings and errors.
  WARNING = 'warning',
  /// Log *no* events.
  NONE = 'none',
}

/**
 * Log event interface.
 */
export interface VGSLogEvent {
  logLevel: VGSLogLevel;
  text: string;
  severity: VGSLogSeverity;
}

/**
 * VGSLogger class.
 */
class VGCollectLogger {
  private static instance: VGCollectLogger;
  private isEnabled: boolean = false;

  /**
   * Private constructor for singleton pattern.
   */
  private constructor() {}

  /**
   * Get the singleton instance of VGSLogger.
   *
   * @returns {VGSLogger} The VGSLogger instance.
   */
  public static getInstance(): VGCollectLogger {
    if (!VGCollectLogger.instance) {
      VGCollectLogger.instance = new VGCollectLogger();
    }
    return VGCollectLogger.instance;
  }

  /**
   * Enable logging.
   */
  public enable(): void {
    // Prevent enabling logs in production
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    this.isEnabled = true;
  }

  /**
   * Disable logging.
   */
  public disable(): void {
    this.isEnabled = false;
  }

  /**
   * Log an event.
   *
   * @param {VGSLogEvent} event - The log event.
   */
  log(event: VGSLogEvent): void {
    const { logLevel, text, severity } = event;
    if (!this.isEnabled || logLevel === VGSLogLevel.NONE) {
      return;
    }

    const logMessage = `${severity} VGSCollectSDK: ${text}`;
    if (severity === VGSLogSeverity.ERROR) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  logRequest(
    url: string,
    headers: Record<string, any>,
    payload: Record<string, any>
  ) {
    if (!this.isEnabled) {
      return;
    }
    console.log(`⬆️ Send VGSCollectSDK request url: ${url}))`);
    const headersString = JSON.stringify(headers, null, 2);
    console.log(`⬆️ Send VGSCollectSDK request headers: ${headersString}`);
    const payloadString = JSON.stringify(payload, null, 2);
    console.log(`⬆️ Send VGSCollectSDK request payload: ${payloadString}`);
    console.log('------------------------------------');
  }

  async logResponse(response: any): Promise<void> {
    if (!this.isEnabled) {
      return;
    }
    this.logBaseResponseData(response);
    const statusString = this.baseStatusString(response.ok);
    const headersString = JSON.stringify(response.headers, null, 2);
    console.log(`${statusString}  response headers: ${headersString}`);
    try {
      const responseBody = await response.clone().json();
      const bodyString = JSON.stringify(responseBody, null, 2);
      console.log(`${statusString}  response body: ${bodyString}`);
    } catch (error) {
      console.error(
        'VGSCollectLogger: ❗ Error parsing response body. Body is empty or wrong format(expecting JSON). Check you <vaultId> and backend response object:',
        error
      );
    }
    console.log('------------------------------------');
  }

  logTokenizationResponse(response: any, result: Record<string, string>) {
    if (!this.isEnabled) {
      return;
    }
    this.logBaseResponseData(response);
    const statusString = this.baseStatusString(response.ok);
    console.log(`${statusString}  response body:`);
    console.log(result);
  }

  private logBaseResponseData(response: any) {
    if (!(response instanceof Response)) {
      this.log({
        severity: VGSLogSeverity.ERROR,
        text: `Response is not valid. Response object: ${response}`,
        logLevel: VGSLogLevel.WARNING,
      });
      return;
    }
    const statusString = this.baseStatusString(response.ok);
    console.log(`${statusString} request url: ${response.url}`);
    console.log(`${statusString}  response code: ${response.status}`);
  }

  private baseStatusString(ok: Boolean): string {
    return ok ? '✅ Success ⬇️ VGSCollectSDK' : '❗ Failed ⬇️ VGSCollectSDK';
  }

  logRequestError(
    error: Error,
    url: string,
    headers: Record<string, any> = {},
    payload: Record<string, any> = {}
  ) {
    if (!this.isEnabled) {
      return;
    }
    console.error(`❗ Failed ⬆️ VGSCollectSDK request url: ${url}`);
    console.error(`❗ Failed ⬆️ VGSCollectSDK request headers: ${headers}`);
    console.error(`❗ Failed ⬆️ VGSCollectSDK request payload: ${payload}`);
    console.error(`❗ Failed ⬆️ VGSCollectSDK error: ${error}`);
    console.error('------------------------------------');
  }
}

export default VGCollectLogger;
