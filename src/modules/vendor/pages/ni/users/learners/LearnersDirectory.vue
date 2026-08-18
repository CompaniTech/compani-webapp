<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Répertoire utilisateurs" @update-search="updateSearch" :search="searchStr" />
    <ni-table-list :data="filteredLearners" :columns="columns" :loading="tableLoading" v-model:pagination="pagination"
      :path="path">
      <template #body="{ col }">
        <q-item v-if="col.name === 'name'">
          <q-item-section avatar>
            <img class="avatar" :src="getAvatar(col.value.picture)">
          </q-item-section>
          <q-item-section>{{ col.value.fullName }}</q-item-section>
        </q-item>
        <q-item v-else class="row justify-center">{{ col.value }}</q-item>
      </template>
    </ni-table-list>
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter une personne"
      @click="learnerCreationModal = true" :disable="tableLoading" />

    <learner-creation-modal v-model="learnerCreationModal" v-model:new-user="newLearner" :first-step="firstStep"
      @next-step="nextStepLearnerCreationModal" @hide="resetLearnerCreationModal" :company-options="companyOptions"
      :validations="learnerValidation.newLearner" :loading="learnerCreationModalLoading"
      @submit="submitLearnerCreationModal" />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { onMounted, ref } from 'vue';
import TableList from '@components/table/TableList';
import DirectoryHeader from '@components/DirectoryHeader';
import Companies from '@api/Companies';
import { formatAndSortCompanyOptions } from '@helpers/utils';
import LearnerCreationModal from '@components/courses/LearnerCreationModal';
import { useLearnersCreation } from '@composables/learnersCreation';
import { useLearnerDirectory } from '@composables/learnerDirectory';
import { DIRECTORY } from '@data/constants';

export default {
  name: 'LearnersDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-table-list': TableList,
    'learner-creation-modal': LearnerCreationModal,
  },
  setup () {
    const metaInfo = { title: 'Répertoire utilisateurs' };
    useMeta(metaInfo);
    const companyOptions = ref([]);

    const path = { name: 'ni users learners info', params: 'learnerId' };

    const refresh = async () => getLearnerList();

    const {
      searchStr,
      newLearner,
      learnerCreationModal,
      learnerCreationModalLoading,
      firstStep,
      learnerList,
      tableLoading,
      filteredLearners,
      learnerValidation,
      updateSearch,
      nextStepLearnerCreationModal,
      getLearnerList,
      submitLearnerCreationModal,
      resetLearnerCreationModal,
    } = useLearnersCreation(refresh, false, true);

    const { pagination, columns, getAvatar } = useLearnerDirectory();

    const refreshCompanies = async () => {
      try {
        const companies = await Companies.list({ action: DIRECTORY });
        companyOptions.value = formatAndSortCompanyOptions(companies, 'name');
      } catch (e) {
        console.error(e);
        companyOptions.value = [];
      }
    };

    const created = async () => {
      await refreshCompanies();
    };

    onMounted(async () => { await refresh(); });

    created();

    return {
      // Data
      searchStr,
      newLearner,
      firstStep,
      learnerList,
      tableLoading,
      learnerCreationModalLoading,
      learnerCreationModal,
      path,
      pagination,
      columns,
      companyOptions,
      // Computed
      filteredLearners,
      // Validations
      learnerValidation,
      // Methods
      updateSearch,
      nextStepLearnerCreationModal,
      submitLearnerCreationModal,
      resetLearnerCreationModal,
      getAvatar,
    };
  },
};
</script>
