import { SHORT_DURATION_H_MM, LONG_DURATION_H_MM, PT0S } from '@data/constants';
import { Duration } from './luxon';

const DURATION_HOURS = 'h\'h\'';
const DURATION_MINUTES = 'm\'min\'';

const CompaniDurationFactory = (inputDuration) => {
  const _duration = inputDuration;

  return {
    // GETTER
    get _getDuration () {
      return _duration;
    },

    // DISPLAY
    format (template) {
      const shiftedDuration = _duration.shiftTo('hours', 'minutes', 'seconds');
      const minutes = shiftedDuration.get('minutes');
      const hours = shiftedDuration.get('hours');

      if (template === SHORT_DURATION_H_MM) {
        if (minutes === 0) return _duration.toFormat(DURATION_HOURS);

        return _duration.toFormat(SHORT_DURATION_H_MM);
      } if (template === LONG_DURATION_H_MM) {
        if (hours === 0) return _duration.toFormat(DURATION_MINUTES);
        if (minutes === 0) return _duration.toFormat(DURATION_HOURS);

        return _duration.toFormat(LONG_DURATION_H_MM);
      }
      throw Error('Invalid argument: expected specific format');
    },

    asYears () {
      return _duration.as('years');
    },

    asMonths () {
      return _duration.as('months');
    },

    asDays () {
      return _duration.as('days');
    },

    asHours () {
      return _duration.as('hours');
    },

    asMinutes () {
      return _duration.as('minutes');
    },

    toHoursAndMinutesObject () {
      const shiftedDuration = _duration.shiftTo('hours', 'minutes');
      const minutes = shiftedDuration.get('minutes');
      const hours = shiftedDuration.get('hours');
      return { hours, minutes };
    },

    toMonthAndDaysObject () {
      const shiftedDuration = _duration.shiftTo('months', 'days');
      const months = shiftedDuration.get('months');
      const days = shiftedDuration.get('days');
      return { months, days };
    },

    toISO () {
      return _duration.toISO();
    },

    // QUERY
    isEquivalentTo (miscTypeOtherDuration) {
      const otherDurationInSeconds = _formatMiscToCompaniDuration(miscTypeOtherDuration).shiftTo('seconds');
      const durationInSeconds = _duration.shiftTo('seconds');

      return durationInSeconds.equals(otherDurationInSeconds);
    },

    isLongerThan (miscTypeOtherDuration) {
      const otherDurationInSeconds = _formatMiscToCompaniDuration(miscTypeOtherDuration).as('seconds');
      const durationInSeconds = _duration.as('seconds');

      return durationInSeconds > otherDurationInSeconds;
    },

    isShorterThan (miscTypeOtherDuration) {
      const otherDurationInSeconds = _formatMiscToCompaniDuration(miscTypeOtherDuration).as('seconds');
      const durationInSeconds = _duration.as('seconds');

      return durationInSeconds < otherDurationInSeconds;
    },

    // MANIPULATE
    add (miscTypeOtherDuration) {
      const otherDuration = _formatMiscToCompaniDuration(miscTypeOtherDuration);

      return CompaniDurationFactory(_duration.plus(otherDuration));
    },

    subtract (miscTypeOtherDuration) {
      const otherDuration = _formatMiscToCompaniDuration(miscTypeOtherDuration);

      return CompaniDurationFactory(_duration.minus(otherDuration));
    },

    abs () {
      if (_duration.as('seconds') > 0) return CompaniDurationFactory(_duration);
      return CompaniDurationFactory(_duration.mapUnits(value => -value));
    },
  };
};

const _formatMiscToCompaniDuration = (...args) => {
  if (args.length === 0) return Duration.fromISO(PT0S);

  if (args.length === 1) {
    if (typeof args[0] === 'string') return Duration.fromISO(args[0]);

    if (args[0] instanceof Object) {
      if (args[0]._getDuration && args[0]._getDuration instanceof Duration) return args[0]._getDuration;
    }
  }
  return Duration.invalid('wrong arguments');
};

export default (...args) => CompaniDurationFactory(_formatMiscToCompaniDuration(...args));
