import { ref, computed } from 'vue';
import get from 'lodash/get';
import Courses from '@api/Courses';
import { NotifyNegative } from '@components/popup/notify';
import { TRAINER_COURSE_BILLING_STATUS } from '@data/constants';

export const useTrainerCollectiveCoursesBillingInfos = (trainer) => {
  const trainerCourses = ref([]);
  const coursesLoading = ref(false);
  const selectedStatus = ref('');
  const selectedProgram = ref('');

  const statusOptions = [
    ...Object.entries(TRAINER_COURSE_BILLING_STATUS).map(([value, label]) => ({ label, value })),
    { label: 'Tous', value: '' },
  ];

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
      const trainers = await Courses.listTrainersBilling({ trainer: trainer.value._id });
      trainerCourses.value = get(trainers, '[0].courses') || [];
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la récupération des formations de l\'intervenant·e.');
    } finally {
      coursesLoading.value = false;
    }
  };

  const filteredData = computed(() => trainerCourses.value.filter((course) => {
    if (selectedStatus.value && course.status !== selectedStatus.value) return false;
    if (selectedProgram.value && get(course, 'subProgram.program.name') !== selectedProgram.value) return false;
    return true;
  }));

  const resetFilters = () => {
    selectedStatus.value = '';
    selectedProgram.value = '';
  };

  return {
    // Data
    trainerCourses,
    coursesLoading,
    selectedStatus,
    selectedProgram,
    statusOptions,
    // Computed
    filteredData,
    programOptions,
    // Methods
    refreshCourses,
    resetFilters,
  };
};
