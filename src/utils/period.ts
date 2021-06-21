export type TPeriod =
  | '2h'
  | '2d'
  | '4d'
  | '30d'
  | '60d'
  | '180d'
  | '1y'
  | 'all';
export type TGranularity = '1d' | '30d' | '1y' | 'all';

export function getStartPoint(period: TPeriod): number {
  let duration = 1;
  switch (period) {
    case '2h':
      duration = 2;
      break;
    case '2d':
      duration = 2 * 24;
      break;
    case '4d':
      duration = 4 * 24;
      break;
    case '30d':
      duration = 30 * 24;
      break;
    case '60d':
      duration = 60 * 24;
      break;
    case '180d':
      duration = 180 * 24;
      break;
    case '1y':
      duration = 360 * 24;
      break;
    case 'all':
      return 0;
    default:
      duration = 2;
      return 0;
  }
  return Date.now() - duration * 60 * 60 * 1000;
}
