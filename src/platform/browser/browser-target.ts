/** Returns a coarse browser family/version string without device identifiers. */
export function getBrowserTarget(userAgent: string): string {
  const candidates = [
    { name: 'Edge', pattern: /Edg\/([\d.]+)/ },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
    { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
  ] as const;
  for (const candidate of candidates) {
    const version = candidate.pattern.exec(userAgent)?.[1];
    if (version) return `${candidate.name} v.${version}`;
  }
  return 'Unknown browser';
}

export interface OperatingSystemInfo {
  name: string;
  version: string;
}

/** Extracts coarse OS metadata without retaining the full user-agent string. */
export function getOperatingSystemInfo(
  userAgent: string,
  platform: string,
): OperatingSystemInfo {
  const windowsVersion = /Windows NT ([\d.]+)/.exec(userAgent)?.[1];
  if (windowsVersion) return { name: 'Windows', version: windowsVersion };
  const androidVersion = /Android ([\d.]+)/.exec(userAgent)?.[1];
  if (androidVersion) return { name: 'Android', version: androidVersion };
  const macVersion = /Mac OS X ([\d_]+)/.exec(userAgent)?.[1];
  if (macVersion)
    return { name: 'macOS', version: macVersion.replaceAll('_', '.') };
  if (/Linux/i.test(platform)) return { name: 'Linux', version: 'Unknown' };
  return { name: platform || 'Unknown', version: 'Unknown' };
}
