import compact from 'lodash/compact';
import get from 'lodash/get';
import { computed } from 'vue';
import { E_LEARNING, SHORT_DURATION_H_MM, DD_MM_YYYY, REMOTE } from '@data/constants';
import { getISOTotalDuration, ascendingSortBy } from '@helpers/dates/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';

export const useCourseDocumentInfosModal = (course, slots) => {
  // make sure code is similar to API part
  const liveDuration = computed(() => {
    if (course.value.slotsToPlan.length) {
      const theoreticalDurationList = course.value.subProgram.steps
        .filter(step => step.type !== E_LEARNING)
        .map(step => step.theoreticalDuration);

      if (theoreticalDurationList.some(duration => !duration)) return '';

      return theoreticalDurationList
        .reduce((acc, duration) => acc.add(duration), CompaniDuration())
        .format(SHORT_DURATION_H_MM);
    }

    return CompaniDuration(getISOTotalDuration(course.value.slots)).format(SHORT_DURATION_H_MM);
  });

  const dates = computed(() => {
    const slotDatesWithDuplicate = [...slots.value]
      .sort(ascendingSortBy('startDate'))
      .map(slot => CompaniDate(slot.startDate).format(DD_MM_YYYY));
    const uniqDates = [...new Set(slotDatesWithDuplicate)];

    return uniqDates.join(' - ');
  });

  const addressList = computed(() => {
    const { steps } = course.value.subProgram;

    if (steps.every(step => step.type === REMOTE)) return 'en distanciel';
    const fullAddressList = compact(slots.value.map(slot => get(slot, 'address.fullAddress')));
    if ([...new Set(fullAddressList)].length <= 2) return [...new Set(fullAddressList)].join(', ');

    const cityList = compact(slots.value.map(slot => get(slot, 'address.city')));
    return [...new Set(cityList)].join(', ');
  });

  return {
    // Computed
    liveDuration,
    dates,
    addressList,
  };
};
