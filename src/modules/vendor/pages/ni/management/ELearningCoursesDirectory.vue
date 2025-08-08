<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Formations eLearning" search-placeholder="Rechercher une formation"
      @update-search="updateSearch" :search="searchStr" />
    <ni-table-list :data="filteredCourses" :columns="columns" :loading="tableLoading" v-model:pagination="pagination"
      :path="path" />
  </q-page>
</template>

<script>
import { ref } from 'vue';
import { useMeta } from 'quasar';
import DirectoryHeader from '@components/DirectoryHeader';
import TableList from '@components/table/TableList';
import { useELearningCourseDirectory } from '@composables/eLearningCourseDirectory';
import { STRICTLY_E_LEARNING, OPERATIONS } from '@data/constants';

export default {
  name: 'ELearningCoursesDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-table-list': TableList,
  },
  setup () {
    const metaInfo = { title: 'Repertoire formation eLearning' };
    useMeta(metaInfo);

    const path = ref({ name: 'ni management elearning courses info', params: 'courseId' });

    const {
      tableLoading,
      searchStr,
      pagination,
      columns,
      filteredCourses,
      updateSearch,
      refreshCourseList,
    } = useELearningCourseDirectory();

    const created = async () => {
      await refreshCourseList({ format: STRICTLY_E_LEARNING, action: OPERATIONS });
    };

    created();

    return {
      // Data
      path,
      tableLoading,
      searchStr,
      pagination,
      columns,
      // Computed
      filteredCourses,
      // Method
      updateSearch,
    };
  },
};
</script>
