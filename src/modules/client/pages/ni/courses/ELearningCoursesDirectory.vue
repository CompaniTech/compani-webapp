<template>
  <q-page class="client-background" padding>
    <ni-directory-header title="Formations eLearning" search-placeholder="Rechercher une formation"
      @update-search="updateSearch" :search="searchStr" />
    <ni-table-list :data="filteredCourses" :columns="columns" :loading="tableLoading" v-model:pagination="pagination"
      :path="path" />
  </q-page>
</template>

<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
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
    const $store = useStore();

    const path = ref({ name: 'ni elearning courses info', params: 'courseId' });

    const {
      tableLoading,
      searchStr,
      pagination,
      columns,
      filteredCourses,
      updateSearch,
      refreshCourseList,
    } = useELearningCourseDirectory();

    const company = computed(() => $store.getters['main/getCompany']);

    const created = async () => {
      await refreshCourseList({
        format: STRICTLY_E_LEARNING,
        company: company.value._id,
        action: OPERATIONS,
      });
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
