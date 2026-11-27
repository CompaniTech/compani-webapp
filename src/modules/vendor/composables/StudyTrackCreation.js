import { ref, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, helpers } from '@vuelidate/validators';
import { strictPositiveNumber, integerNumber, everyFractionDigits, hasNonZeroValue } from '@helpers/vuelidateCustomVal';
import StudyTracks from '@api/StudyTracks';
import { multiply, toNumber } from '@helpers/numbers';
import { E_LEARNING, DEFAULT_STUDY_TRACK_MONTHS, MAX_STUDY_TRACK_MONTHS } from '@data/constants';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const useStudyTrackCreation = (modalLoading, refreshProgram) => {
  const studyTrackCreationModal = ref(false);

  const newStudyTrack = ref({
    subProgram: { _id: '', steps: [] },
    name: '',
    monthsCount: DEFAULT_STUDY_TRACK_MONTHS,
    detailsPerStep: [],
    milestones: [],
  });

  const rules = computed(() => ({
    newStudyTrack: {
      name: { required },
      monthsCount: {
        required,
        strictPositiveNumber,
        integerNumber,
        maxStudyTrackMonths: value => Number(value) <= MAX_STUDY_TRACK_MONTHS,
      },
      detailsPerStep: {
        $each: helpers.forEach({ durations: { oneDecimal: everyFractionDigits(1), hasNonZeroValue } }),
      },
      eLearningDurations: {
        oneDecimal: everyFractionDigits(1),
        hasNonZeroValue: value => !value || hasNonZeroValue(value),
      },
      milestones: { $each: helpers.forEach({ label: { required }, targets: { required }, month: { required } }) },
    },
  }));
  const v$ = useVuelidate(rules, { newStudyTrack });

  const toSeconds = hours => toNumber(multiply(hours || 0, 3600));

  const formatPayload = (studyTrack) => {
    const { detailsPerStep, eLearningDurations, milestones } = studyTrack;

    return {
      name: studyTrack.name,
      subProgram: studyTrack.subProgram._id,
      detailsPerStep: detailsPerStep.map(d => ({
        step: d.step,
        durations: d.durations.map(toSeconds),
        ...d.targets.length && { targets: d.targets },
      })),
      ...eLearningDurations && { eLearningDurations: eLearningDurations.map(toSeconds) },
      ...milestones.length && { milestones },
    };
  };

  const openStudyTrackCreationModal = (subProgram) => {
    const steps = subProgram.steps.filter(s => s.type !== E_LEARNING);
    const hasELearning = subProgram.steps.some(s => s.type === E_LEARNING);
    const emptyDurations = () => Array(DEFAULT_STUDY_TRACK_MONTHS).fill(0);

    newStudyTrack.value = {
      name: '',
      monthsCount: DEFAULT_STUDY_TRACK_MONTHS,
      milestones: [],
      subProgram: { _id: subProgram._id, steps: steps.map(s => ({ _id: s._id, name: s.name })) },
      detailsPerStep: steps.map(s => ({ step: s._id, durations: emptyDurations(), targets: [] })),
      ...hasELearning && { eLearningDurations: emptyDurations() },
    };
    studyTrackCreationModal.value = true;
  };

  const resetStudyTrackCreationModal = () => {
    newStudyTrack.value = {
      subProgram: { _id: '', steps: [] },
      name: '',
      monthsCount: DEFAULT_STUDY_TRACK_MONTHS,
      detailsPerStep: [],
      milestones: [],
    };
    v$.value.newStudyTrack.$reset();
  };

  const createStudyTrack = async () => {
    try {
      v$.value.newStudyTrack.$touch();
      if (v$.value.newStudyTrack.$error) return NotifyWarning('Champ(s) invalide(s).');

      modalLoading.value = true;
      await StudyTracks.create(formatPayload(newStudyTrack.value));
      NotifyPositive('Parcours type créé.');
      studyTrackCreationModal.value = false;
      await refreshProgram();
    } catch (e) {
      console.error(e);
      if (e.data && [403, 409].includes(e.data.statusCode) && e.data.message) return NotifyWarning(e.data.message);
      NotifyNegative('Erreur lors de la création du parcours type.');
    } finally {
      modalLoading.value = false;
    }

    return null;
  };

  return {
    studyTrackCreationModal,
    newStudyTrack,
    v$,
    // Methods
    openStudyTrackCreationModal,
    resetStudyTrackCreationModal,
    createStudyTrack,
  };
};
