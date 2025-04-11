import { ref } from 'vue';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import Courses from '@api/Courses';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { BLENDED, OPERATIONS } from '@data/constants';

export const useCourseCreation = (newCourse, activeCourses, archivedCourses, v$) => {
  const modalLoading = ref(false);
  const courseCreationModal = ref(false);

  const refreshActiveCourses = async (types) => {
    try {
      const courseList = await Courses
        .list({ format: BLENDED, action: OPERATIONS, isArchived: false, type: types });
      activeCourses.value = courseList;
    } catch (e) {
      console.error(e);
      activeCourses.value = [];
    }
  };

  const refreshArchivedCourses = async (types) => {
    try {
      const archivedCourseList = await Courses
        .list({ format: BLENDED, action: OPERATIONS, isArchived: true, type: types });
      archivedCourses.value = archivedCourseList;
    } catch (e) {
      console.error(e);
      archivedCourses.value = [];
    }
  };

  const createCourse = async (types) => {
    try {
      v$.value.newCourse.$touch();
      if (v$.value.newCourse.$error) return NotifyWarning('Champ(s) invalide(s)');

      modalLoading.value = true;
      await Courses.create({
        ...pickBy(omit(newCourse.value, 'program')),
        hasCertifyingTest: newCourse.value.hasCertifyingTest,
      });

      courseCreationModal.value = false;
      NotifyPositive('Formation créée.');

      await refreshActiveCourses(types);
    } catch (e) {
      console.error(e);
      NotifyNegative('Impossible de créer la formation.');
    } finally {
      modalLoading.value = false;
    }
  };

  return {
    // Data
    modalLoading,
    courseCreationModal,
    // Methods
    createCourse,
    refreshActiveCourses,
    refreshArchivedCourses,
  };
};
