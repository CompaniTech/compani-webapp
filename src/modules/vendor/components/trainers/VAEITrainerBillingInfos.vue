<template>
  <q-page padding class="vendor-background q-pb-xl">
    <ni-banner icon="info_outline" class="bg-peach-200">
      <template #message>
        Veuillez sélectionner la période sur laquelle vous souhaitez afficher les créneaux de formation.
        Seuls les créneaux émargés sont affichés sur cette page.
      </template>
    </ni-banner>
    <div class="row justify-end">
      <ni-button icon="chevron_left" class="no-shadow" @click="goToPreviousMonth" />
      <ni-date-range class="col-md-6 col-xs-12" caption="Période" v-model="dateRange" :error="v$.dateRange.$error"
        @update:model-value="input" :error-message="dateRangeErrorMessage" @blur="v$.dateRange.$touch" />
      <ni-button icon="chevron_right" class="no-shadow" @click="goToNextMonth" />
    </div>
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select caption="Statut des créneaux" clearable :options="statusOptions" v-model="selectedStatus" />
    </div>
    <trainer-billing-infos-card v-if="filteredData[trainer._id]" :trainer-infos="filteredData[trainer._id]"
      @refresh="refreshCourseSlots" :trainer-id="trainer._id" :is-trainer="loggedUserIsTrainer" />
    <div v-else class="text-italic">Pas de créneaux sur la période</div>
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { useStore } from 'vuex';
import { computed, watch } from 'vue';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import Banner from '@components/Banner';
import { TRAINER } from '@data/constants';
import { useTrainerBillingInfos } from '@composables/trainerBillingInfos';
import TrainerBillingInfosCard from 'src/modules/vendor/components/billing/TrainerBillingInfosCard';

export default {
  name: 'VAEITrainerBillingInfos',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-select': Select,
    'ni-button': Button,
    'ni-banner': Banner,
    'trainer-billing-infos-card': TrainerBillingInfosCard,
  },
  setup () {
    const metaInfo = { title: 'Suivi de la facturation' };
    useMeta(metaInfo);

    const $store = useStore();

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const loggedUserIsTrainer = computed(() => loggedUser.value.role.vendor.name === TRAINER);

    const userProfile = computed(() => $store.state.userProfile.userProfile);

    const trainer = computed(() => {
      if (loggedUserIsTrainer.value) return loggedUser.value;
      return userProfile.value;
    });

    const {
      dateRange,
      selectedStatus,
      filteredData,
      statusOptions,
      dateRangeErrorMessage,
      v$,
      input,
      goToPreviousMonth,
      goToNextMonth,
      refreshCourseSlots,
    } = useTrainerBillingInfos(trainer, loggedUserIsTrainer);

    const resetFilters = () => {
      selectedStatus.value = '';
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
      selectedStatus,
      statusOptions,
      // Computed
      filteredData,
      dateRangeErrorMessage,
      v$,
      trainer,
      loggedUserIsTrainer,
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

<style lang="sass" scoped>
.details
  flex-direction: row
  justify-content: space-between
  padding: 16px 0px
</style>
