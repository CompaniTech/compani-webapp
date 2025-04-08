import { HH_MM } from '@data/constants';
import { formatQuantity } from '../utils';
import CompaniDate from './companiDates';
import CompaniDuration from './companiDurations';

export const ascendingSort = (a, b) => {
  if (CompaniDate(a).isSame(b)) return 0;

  return CompaniDate(a).isAfter(b) ? 1 : -1;
};

export const ascendingSortBy = key => (a, b) => {
  if (CompaniDate(a[key]).isSame(b[key])) return 0;

  return CompaniDate(a[key]).isAfter(b[key]) ? 1 : -1;
};

export const descendingSortBy = (key, format = '') => (a, b) => {
  if (format) {
    if (CompaniDate(a[key], format).isSame(CompaniDate(b[key], format))) return 0;

    return CompaniDate(a[key], format).isBefore(CompaniDate(b[key], format)) ? 1 : -1;
  }
  if (CompaniDate(a[key]).isSame(b[key])) return 0;

  return CompaniDate(a[key]).isBefore(b[key]) ? 1 : -1;
};

export const durationAscendingSort = (miscDurationA, miscDurationB) => {
  const companiDurationA = CompaniDuration(miscDurationA);
  const companiDurationB = CompaniDuration(miscDurationB);
  if (companiDurationA.isEquivalentTo(companiDurationB)) return 0;

  return companiDurationA.isLongerThan(companiDurationB) ? 1 : -1;
};

export const getISODuration = timePeriod => CompaniDate(timePeriod.endDate).diff(timePeriod.startDate, 'seconds');

export const getISOTotalDuration = timePeriods => timePeriods
  .reduce((acc, tp) => acc.add(getISODuration(tp)), CompaniDuration())
  .toISO();

export const formatIntervalHourly = slot => `${CompaniDate(slot.startDate).format(HH_MM)} - `
  + `${CompaniDate(slot.endDate).format(HH_MM)}`;

export const formatISODurationWithBestUnit = (durationISO) => {
  const absoluteDuration = CompaniDuration(durationISO).abs();

  if (absoluteDuration.isShorterThan('PT1H')) {
    const minutes = Math.floor(absoluteDuration.asMinutes());

    return formatQuantity('minute', minutes);
  }
  if (absoluteDuration.isShorterThan('P1D')) {
    const hours = Math.floor(absoluteDuration.asHours());

    return formatQuantity('heure', hours);
  }
  if (absoluteDuration.isShorterThan('P1M')) {
    const days = Math.floor(absoluteDuration.asDays());

    return formatQuantity('jour', days);
  }
  if (absoluteDuration.isShorterThan('P1Y')) {
    const months = Math.floor(absoluteDuration.asMonths());

    return `${months} mois`;
  }
  const years = Math.floor(absoluteDuration.asYears());

  return formatQuantity('an', years);
};
