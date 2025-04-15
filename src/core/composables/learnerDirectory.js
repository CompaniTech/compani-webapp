import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { sortStrings } from '@helpers/utils';
import { formatISODurationWithBestUnit, durationAscendingSort } from '@helpers/dates/utils';
import { DEFAULT_AVATAR } from '@data/constants';

export const useLearnerDirectory = () => {
  const $router = useRouter();
  const isVendorInterface = /\/ad\//.test($router.currentRoute.value.path);

  const pagination = ref({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 15 });
  const columns = ref([
    {
      name: 'name',
      label: 'Nom',
      field: row => row.learner,
      align: 'left',
      sortable: true,
      sort: (a, b) => sortStrings(a.lastname, b.lastname),
      style: `width: ${isVendorInterface ? '30%' : '50%'}`,
    },
    ...isVendorInterface
      ? [{
        name: 'company',
        label: 'Structure',
        align: 'center',
        field: 'company',
        sortable: true,
        style: 'width: 30%',
        sort: sortStrings,
      }]
      : [],
    {
      name: 'blendedCoursesCount',
      label: 'Formations mixtes',
      field: 'blendedCoursesCount',
      align: 'center',
      sortable: true,
    },
    {
      name: 'eLearningCoursesCount',
      label: 'Formations eLearning',
      field: 'eLearningCoursesCount',
      align: 'center',
      sortable: true,
    },
    {
      name: 'isoDurationSinceLastActivityHistory',
      label: 'Dernière activité il y a...',
      field: 'isoDurationSinceLastActivityHistory',
      align: 'center',
      sortable: true,
      format: value => (value !== null ? formatISODurationWithBestUnit(value) : '-'),
      sort: (a, b) => durationAscendingSort(a, b),
    },
  ]);

  const getAvatar = link => link || DEFAULT_AVATAR;

  return {
    // Data
    pagination,
    columns,
    // Methods
    getAvatar,
  };
};
