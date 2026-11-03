import { ref, computed } from 'vue';
import get from 'lodash/get';
import Courses from '@api/Courses';
import { NotifyNegative } from '@components/popup/notify';
import { TRAINER_COURSE_BILLING_STATUS } from '@data/constants';
import { formatAndSortIdentityOptions } from '@helpers/utils';

export const useTrainerCollectiveCoursesBillingInfos = (trainer = null) => {
  const trainers = ref([]);
  const coursesLoading = ref(false);
  const selectedTrainer = ref('');
  const selectedStatus = ref('');
  const selectedProgram = ref('');

  const trainerCourses = computed(() => trainers.value.flatMap(t => t.courses));

  const statusOptions = [
    ...Object.entries(TRAINER_COURSE_BILLING_STATUS).map(([value, label]) => ({ label, value })),
    { label: 'Tous', value: '' },
  ];

  const trainerOptions = computed(() => [
    { label: 'Tous les intervenant·es', value: '' },
    ...formatAndSortIdentityOptions(trainers.value),
  ]);

  const programOptions = computed(() => {
    const programNames = [...new Set(trainerCourses.value.map(c => get(c, 'subProgram.program.name')))]
      .filter(Boolean);

    return [
      { label: 'Tous les programmes', value: '' },
      ...programNames.map(name => ({ label: name, value: name })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  });

  const refreshCourses = async () => {
    try {
      coursesLoading.value = true;
      trainers.value = await Courses.listTrainersBilling(trainer ? { trainer: trainer.value._id } : {});
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la récupération des formations de l\'intervenant·e.');
    } finally {
      coursesLoading.value = false;
    }
  };

  const isCourseDisplayed = (course) => {
    if (selectedStatus.value && course.status !== selectedStatus.value) return false;
    if (selectedProgram.value && get(course, 'subProgram.program.name') !== selectedProgram.value) return false;
    return true;
  };

  const filteredData = computed(() => trainers.value
    .filter(t => !selectedTrainer.value || t._id === selectedTrainer.value)
    .map(t => ({ ...t, courses: t.courses.filter(isCourseDisplayed) }))
    .filter(t => t.courses.length));

  const resetFilters = () => {
    selectedTrainer.value = '';
    selectedStatus.value = '';
    selectedProgram.value = '';
  };

  return {
    // Data
    coursesLoading,
    selectedTrainer,
    selectedStatus,
    selectedProgram,
    statusOptions,
    // Computed
    trainerCourses,
    filteredData,
    trainerOptions,
    programOptions,
    // Methods
    refreshCourses,
    resetFilters,
  };
};
