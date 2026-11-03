<template>
  <div>
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select caption="Programme de formation" clearable :options="programOptions" v-model="selectedProgram" />
      <ni-select caption="Intervenant·e" clearable :options="trainerOptions" v-model="selectedTrainer" />
      <ni-select caption="Statut des groupes" clearable :options="statusOptions" v-model="selectedStatus" />
    </div>
    <q-inner-loading v-if="coursesLoading" :showing="coursesLoading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
    <div v-else-if="filteredData.length">
      <trainer-courses-billing-card v-for="trainer of filteredData" :key="trainer._id" :trainer="trainer" />
    </div>
    <div v-else class="text-italic">Pas de groupes de formation correspondant aux filtres</div>
  </div>
</template>

<script>
import Select from '@components/form/Select';
import { useTrainerCollectiveCoursesBillingInfos } from '@composables/trainerCollectiveCoursesBillingInfos';
import TrainerCoursesBillingInfosCard from 'src/modules/vendor/components/billing/TrainerCoursesBillingInfosCard';

export default {
  name: 'TrainersCollectiveCoursesBillingFollowUp',
  components: {
    'ni-select': Select,
    'trainer-courses-billing-card': TrainerCoursesBillingInfosCard,
  },
  setup () {
    const {
      coursesLoading,
      selectedTrainer,
      selectedStatus,
      selectedProgram,
      statusOptions,
      filteredData,
      trainerOptions,
      programOptions,
      refreshCourses,
      resetFilters,
    } = useTrainerCollectiveCoursesBillingInfos();

    const created = async () => { await refreshCourses(); };

    created();

    return {
      // Data
      coursesLoading,
      selectedTrainer,
      selectedStatus,
      selectedProgram,
      statusOptions,
      // Computed
      filteredData,
      trainerOptions,
      programOptions,
      // Methods
      resetFilters,
    };
  },
};
</script>
