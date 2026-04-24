import {
  E_LEARNING,
  ON_SITE,
  STEP_TYPES,
  INTRA,
  SHORT_DURATION_H_MM,
  PT0S,
  EXPECTATIONS,
  END_OF_COURSE,
  SELF_POSITIONNING,
} from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { formatIntervalHourly, getISODuration } from './dates/utils';

export const happened = sameDaySlots => CompaniDate().isSameOrAfter(sameDaySlots[sameDaySlots.length - 1].endDate);

export const composeCourseName = (course, attachCompany = false) => {
  const companyName = (attachCompany && course.type === INTRA) ? `${course.companies[0].name} - ` : '';
  const misc = course.misc ? ` - ${course.misc}` : '';
  return companyName + course.subProgram.program.name + misc;
};

export const getStepTypeIcon = (type) => {
  if (type === E_LEARNING) return 'stay_current_portrait';
  if (type === ON_SITE) return 'mdi-teach';
  return 'videocam';
};

export const getStepTypeLabel = (value) => {
  const type = STEP_TYPES.find(t => t.value === value);
  return type ? type.label : '';
};

export const formatSlotSchedule = slot => `${formatIntervalHourly(slot)} `
  + `(${CompaniDuration(getISODuration(slot)).format(SHORT_DURATION_H_MM)})`;

export const computeDuration = steps => (steps.length
  ? steps.reduce((acc, s) => (s.theoreticalDuration ? acc.add(s.theoreticalDuration) : acc), CompaniDuration()).toISO()
  : PT0S
);

export const getQuestionnaireTypeTitle = (types) => {
  const labels = [];
  for (const type of types) {
    switch (type) {
      case EXPECTATIONS:
        labels.push('de recueil des attentes');
        break;
      case END_OF_COURSE:
        labels.push('de fin de formation');
        break;
      case SELF_POSITIONNING:
        labels.push('d\'auto-positionnement');
        break;
      default:
        break;
    }
  }

  return labels.join(' et ');
};

export const isCourseInterrupted = (interruptionDates = []) => interruptionDates.some(d => !d.endDate);
