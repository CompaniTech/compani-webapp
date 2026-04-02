<template>
  <q-page padding class="vendor-background q-pb-xl">
     <ni-profile-header title="Suivi de la facturation des intervenant·es">
      <template #title>
        <ni-button icon="chevron_left" class="no-shadow" @click="goToPreviousMonth" />
        <ni-date-range class="col-md-6 col-xs-12" caption="Période" v-model="dateRange" :error="v$.dateRange.$error"
          @update:model-value="input" :error-message="dateRangeErrorMessage" @blur="v$.dateRange.$touch" />
        <ni-button icon="chevron_right" class="no-shadow" @click="goToNextMonth" />
      </template>
    </ni-profile-header>
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
      <trainer-billing-infos-card v-for="trainerId of Object.keys(filteredData)" :key="trainerId"
        :trainer-infos="filteredData[trainerId]" @refresh="refreshCourseSlots" :trainer-id="trainerId" />
    </div>
    <div v-else class="text-italic">Pas de créneaux correspondants aux filtres sur la période</div>
  </q-page>
</template>
<script>
import { useMeta } from 'quasar';
import { watch, computed } from 'vue';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { useTrainerBillingInfos } from '@composables/trainerBillingInfos';
import TrainerBillingInfosCard from 'src/modules/vendor/components/billing/TrainerBillingInfosCard';

export default {
  name: 'TrainersBillingFollowUp',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-select': Select,
    'ni-button': Button,
    'trainer-billing-infos-card': TrainerBillingInfosCard,
  },
  setup () {
    const metaInfo = { title: 'Suivi de la facturation des intervenant·es' };
    useMeta(metaInfo);

    const {
      dateRange,
      selectedTrainer,
      selectedStatus,
      selectedProgram,
      filteredData,
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
    } = useTrainerBillingInfos();

    const displaySlots = computed(() => {
      if (filteredData.value) {
        return Object.entries(filteredData.value).some(([, trainerInfos]) => trainerInfos.courses.length ||
          Object.values(trainerInfos.collectiveSlots.slots).flatMap(slotGroup => slotGroup.slots).length);
      }

      return false;
    });

    const updateSelectedTrainer = (value) => { selectedTrainer.value = value; };

    const resetFilters = () => {
      selectedTrainer.value = '';
      selectedStatus.value = '';
      selectedProgram.value = '';
    };

    watch(dateRange, async () => {
      await refreshCourseSlots();
      resetFilters();
    });

    const created = async () => {
      await Promise.all([refreshCourseSlots()]);
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
      updateSelectedTrainer,
      resetFilters,
      goToPreviousMonth,
      goToNextMonth,
      refreshCourseSlots,
    };
  },
};
</script>

<style lang="sass" scoped>
.details
  flex-direction: row
  justify-content: space-between
  padding: 16px 0px
</style>
