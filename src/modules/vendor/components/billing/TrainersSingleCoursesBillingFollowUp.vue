<template>
  <div>
    <div class="row justify-end">
      <ni-button icon="chevron_left" class="no-shadow" @click="goToPreviousMonth" />
      <ni-date-range class="col-md-6 col-xs-12" caption="Période" v-model="dateRange" :error="v$.dateRange.$error"
        @update:model-value="input" :error-message="dateRangeErrorMessage" @blur="v$.dateRange.$touch" />
      <ni-button icon="chevron_right" class="no-shadow" @click="goToNextMonth" />
    </div>
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select caption="Programme de formation" clearable :options="programOptions" v-model="selectedProgram" />
      <ni-select caption="Intervenant·e" clearable :options="trainerOptions" v-model="selectedTrainer" />
      <ni-select caption="Statut des créneaux" clearable :options="statusOptions" v-model="selectedStatus" />
    </div>
    <q-inner-loading v-if="slotsLoading" :showing="slotsLoading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
    <div v-else-if="displaySlots">
      <single-courses-billing-card v-for="trainerId of Object.keys(filteredData)" :key="trainerId"
        :trainer-infos="filteredData[trainerId]" @refresh="refreshCourseSlots" />
    </div>
    <div v-else class="text-italic">Pas de créneaux correspondants aux filtres sur la période</div>
  </div>
</template>
<script>
import { watch, computed } from 'vue';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { useTrainerSingleCoursesBillingInfos } from '@composables/trainerSingleCoursesBillingInfos';
import SingleCoursesBillingCard from 'src/modules/vendor/components/billing/SingleCoursesBillingCard';

export default {
  name: 'TrainersSingleCoursesBillingFollowUp',
  components: {
    'ni-date-range': DateRange,
    'ni-select': Select,
    'ni-button': Button,
    'single-courses-billing-card': SingleCoursesBillingCard,
  },
  setup () {
    const {
      dateRange,
      selectedTrainer,
      selectedStatus,
      selectedProgram,
      filteredData,
      resetFilters,
      statusOptions,
      trainerOptions,
      programOptions,
      dateRangeErrorMessage,
      v$,
      input,
      goToPreviousMonth,
      goToNextMonth,
      refreshCourseSlots,
      slotsLoading,
    } = useTrainerSingleCoursesBillingInfos();

    const displaySlots = computed(() => {
      if (filteredData.value) {
        return Object.entries(filteredData.value).some(([, trainerInfos]) => trainerInfos.courses.length ||
          Object.values(trainerInfos.collectiveSlots.slots).flatMap(slotGroup => slotGroup.slots).length);
      }

      return false;
    });

    watch(dateRange, async () => {
      await refreshCourseSlots();
      resetFilters();
    });

    const created = async () => {
      await refreshCourseSlots();
    };

    created();

    return {
      // Data
      dateRange,
      selectedTrainer,
      selectedStatus,
      statusOptions,
      selectedProgram,
      slotsLoading,
      // Computed
      filteredData,
      dateRangeErrorMessage,
      trainerOptions,
      programOptions,
      v$,
      displaySlots,
      // Methods
      input,
      resetFilters,
      goToPreviousMonth,
      goToNextMonth,
      refreshCourseSlots,
    };
  },
};
</script>
