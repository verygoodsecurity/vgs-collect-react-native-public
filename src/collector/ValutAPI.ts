export enum ValutAPIVersion {
  v1 = 'v1',
  v2 = 'v2',
}

export const getVaultAPIPath = (version: ValutAPIVersion) => {
  switch (version) {
    case ValutAPIVersion.v1:
      return '/tokens';
    case ValutAPIVersion.v2:
      return '/aliases';
  }
};
