export interface PrivacyStats {
  trackersBlocked: number;
  adsBlocked: number;
  httpsUpgrades: number;
  cookiesBlocked: number;
}

export const AD_TRACKERS = [
  'doubleclick.net',
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.com/tr',
  'adnxs.com',
  'adsrvr.org',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'scorecardresearch.com',
  'quantserve.com',
  'addthis.com',
  'hotjar.com',
  'mixpanel.com',
  'segment.io',
  'amplitude.com',
  'kissmetrics.com',
];

export const isTracker = (url: string): boolean => {
  return AD_TRACKERS.some(tracker => url.includes(tracker));
};

export const shouldUpgradeToHttps = (url: string): boolean => {
  return url.startsWith('http://') && !url.includes('localhost');
};

export const upgradeToHttps = (url: string): string => {
  return url.replace('http://', 'https://');
};

export const getPrivacyStats = async (): Promise<PrivacyStats> => {
  return {
    trackersBlocked: 0,
    adsBlocked: 0,
    httpsUpgrades: 0,
    cookiesBlocked: 0,
  };
};