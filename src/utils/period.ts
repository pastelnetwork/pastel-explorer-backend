export const periodData = {
  '1h': 1,
  '2h': 2,
  '3h': 3,
  '4h': 4,
  '6h': 6,
  '12h': 12,
  '1d': 24,
  '2d': 2 * 24,
  '4d': 4 * 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
  '60d': 60 * 24,
  '180d': 180 * 24,
  '1y': 365 * 24,
};
export type TGranularity = '1d' | '30d' | '1y' | 'all';

export const granulatiry: TGranularity[] = ['1d', '30d', '1y', 'all'];

export type TPeriod = keyof typeof periodData | 'all';

export function getStartPoint(period: TPeriod): number {
  if (period === 'all') {
    return 0;
  }
  let duration = 0;
  duration = periodData[period] ?? 0;
  return Date.now() - duration * 60 * 60 * 1000;
}

export const marketPeriodData = {
  '24h': 1,
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '60d': 60,
  '180d': 180,
  '1y': 365,
  all: 'max',
};
