import { Platform } from 'react-native';
// import DeviceInfo from 'react-native-device-info';
import * as packageJson from '../../../package.json';

export const defaultHTTPHeaders: Record<string, string> = (() => {
  const version = Platform.Version;
  const trStatus = 'default';
  const sdkVersion = packageJson.version;
  return {
    'vgs-client': `source=rnSDK&medium=vgs-collect&content=${sdkVersion}&osVersion=${version}&tr=${trStatus}`,
  };
})();
// export async function getDeviceInfo() {
//   const osVersion = Platform.Version;
//   const platform = Platform.OS;
//   const deviceModel = DeviceInfo.getModel(); // (наприклад, iPhone 13)
//   const deviceLocale = DeviceInfo.getDeviceLocale(); // Locale

//   const deviceModelDetailed = await DeviceInfo.getSystemName(); // Повертає, наприклад, "iPhone" або "iPad"

//   const defaultUserAgentData = {
//     platform: platform,
//     device: deviceModelDetailed, // Або deviceModel, залежно від ваших потреб
//     osVersion: osVersion,
//     deviceLocale: deviceLocale,
//   };

//   console.log(defaultUserAgentData);
//   return defaultUserAgentData;
// }
