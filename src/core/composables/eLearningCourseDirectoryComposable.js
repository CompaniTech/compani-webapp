import { ref, computed } from 'vue';
import escapeRegExp from 'lodash/escapeRegExp';
import Courses from '@api/Courses';
import { NotifyNegative } from '@components/popup/notify';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { DD_MM_YYYY, LONG_DURATION_H_MM } from '@data/constants';
import { ascendingSort } from '@helpers/dates/utils';
import { removeDiacritics } from '@helpers/utils';

export const useELearningCourseDirectory = () => {
  const courses = ref([]);
  const tableLoading = ref(false);
  const pagination = ref({ sortBy: 'createdAt', descending: true, page: 1, rowsPerPage: 15 });
  const searchStr = ref('');
  const columns = ref([
    { name: 'name', label: 'Nom', field: 'name', align: 'left', sortable: true, style: 'width: 60%' },
    {
      name: 'totalTheoreticalDuration',
      label: 'Durée',
      field: 'totalTheoreticalDuration',
      format: value => CompaniDuration(value).format(LONG_DURATION_H_MM),
      align: 'center',
      sortable: true,
      style: 'width: 10%',
    },
    {
      name: 'traineesCount',
      label: 'Nombre d\'apprenants',
      field: 'traineesCount',
      align: 'center',
      sortable: true,
      style: 'width: 20%',
    },
    {
      name: 'createdAt',
      label: 'Créée le...',
      field: 'createdAt',
      align: 'left',
      sortable: true,
      format: value => CompaniDate(value).format(DD_MM_YYYY),
      sort: ascendingSort,
      style: 'width: 10%',
    },
  ]);

  const filteredCourses = computed(() => {
    const formattedString = escapeRegExp(removeDiacritics(searchStr.value));
    return courses.value.filter(course => course.noDiacriticsName.match(new RegExp(formattedString, 'i')));
  });

  const updateSearch = (value) => { searchStr.value = value; };

  const refreshCourseList = async (query) => {
    try {
      tableLoading.value = true;
      const courseList = await Courses.list(query);

      courses.value = courseList.map(c => ({
        name: c.subProgram.program.name,
        noDiacriticsName: removeDiacritics(c.subProgram.program.name),
        createdAt: c.createdAt,
        _id: c._id,
        traineesCount: c.trainees.length || '0',
        totalTheoreticalDuration: c.totalTheoreticalDuration,
      }));
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la récupération des formations.');
    } finally {
      tableLoading.value = false;
    }
  };

  return {
    // Data
    courses,
    tableLoading,
    searchStr,
    pagination,
    columns,
    // Computed
    filteredCourses,
    // Method
    updateSearch,
    refreshCourseList,
  };
};
