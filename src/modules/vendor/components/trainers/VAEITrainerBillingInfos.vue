<template>
  <q-page padding class="vendor-background q-pb-xl">
    <div v-if="loggedUserIsTrainer" class="row justify-end q-mb-md">
      <ni-primary-button label="Facturer mes frais annexes" @click="openTrainerFeesBillModal" />
    </div>
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
      <ni-select caption="Programme de formation" clearable :options="programOptions" v-model="selectedProgram" />
    </div>
    <q-inner-loading v-if="slotsLoading" :showing="slotsLoading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
    <trainer-billing-infos-card v-else-if="displaySlots" :trainer-infos="filteredData[trainer._id]"
      @refresh="refreshCourseSlots" :is-trainer="loggedUserIsTrainer" />
    <div v-else class="text-italic">Pas de créneaux correspondants aux filtres sur la période</div>

    <trainer-fees-bill-modal v-model="trainerFeesBillModal" :invoice="trainerFeesBill" :loading="trainerFeesBillLoading"
      :validations="validations.trainerFeesBill" @hide="resetTrainerFeesBillModal" @submit="submitTrainerFeesBill" />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { useStore } from 'vuex';
import { computed, ref, watch } from 'vue';
import get from 'lodash/get';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import PrimaryButton from '@components/PrimaryButton';
import Banner from '@components/Banner';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { useTrainerBillingInfos } from '@composables/trainerBillingInfos';
import TrainerBillingInfosCard from 'src/modules/vendor/components/billing/TrainerBillingInfosCard';
import TrainerFeesBillModal from 'src/modules/vendor/components/trainers/TrainerFeesBillModal';
import Email from '@api/Email';

export default {
  name: 'VAEITrainerBillingInfos',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-select': Select,
    'ni-button': Button,
    'ni-primary-button': PrimaryButton,
    'ni-banner': Banner,
    'trainer-billing-infos-card': TrainerBillingInfosCard,
    'trainer-fees-bill-modal': TrainerFeesBillModal,
  },
  setup () {
    const metaInfo = { title: 'Suivi de la facturation' };
    useMeta(metaInfo);

    const $store = useStore();

    const trainerFeesBillModal = ref(false);
    const trainerFeesBillLoading = ref(false);
    const trainerFeesBill = ref({ number: '', file: '' });

    const rules = computed(() => ({ trainerFeesBill: { number: { required }, file: { required } } }));
    const validations = useVuelidate(rules, { trainerFeesBill });

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const userProfile = computed(() => $store.state.userProfile.userProfile);

    const trainer = computed(() => (get(userProfile.value, '_id') ? userProfile.value : loggedUser.value));

    const loggedUserIsTrainer = computed(() => trainer.value._id === loggedUser.value._id);

    const {
      dateRange,
      selectedStatus,
      selectedProgram,
      filteredData,
      statusOptions,
      programOptions,
      dateRangeErrorMessage,
      v$,
      input,
      goToPreviousMonth,
      goToNextMonth,
      refreshCourseSlots,
      slotsLoading,
    } = useTrainerBillingInfos(trainer, loggedUserIsTrainer);

    const displaySlots = computed(() => {
      const trainerInfos = filteredData.value[trainer.value._id];
      if (trainerInfos) {
        const hasSingleSlots = trainerInfos.courses.length;
        const hasCollectiveSlots = Object.values(trainerInfos.collectiveSlots.slots)
          .flatMap(slotGroup => slotGroup.slots).length;

        return hasSingleSlots || hasCollectiveSlots;
      }

      return false;
    });

    const resetFilters = () => {
      selectedStatus.value = '';
      selectedProgram.value = '';
    };

    const openTrainerFeesBillModal = () => { trainerFeesBillModal.value = true; };

    const resetTrainerFeesBillModal = () => {
      trainerFeesBillModal.value = false;
      trainerFeesBill.value = { number: '', file: '' };
      validations.value.trainerFeesBill.$reset();
    };

    const submitTrainerFeesBill = async () => {
      try {
        validations.value.trainerFeesBill.$touch();
        if (validations.value.trainerFeesBill.$error) return NotifyWarning('Champ(s) invalide(s).');

        trainerFeesBillLoading.value = true;

        const form = new FormData();
        form.append('number', trainerFeesBill.value.number);
        form.append('file', trainerFeesBill.value.file);

        await Email.sendTrainerFeesBill(form);
        trainerFeesBillModal.value = false;

        NotifyPositive('Facture envoyée.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'envoi de la facture.');
      } finally {
        trainerFeesBillLoading.value = false;
      }
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
      selectedProgram,
      slotsLoading,
      // Computed
      filteredData,
      dateRangeErrorMessage,
      v$,
      trainer,
      loggedUserIsTrainer,
      programOptions,
      displaySlots,
      trainerFeesBillModal,
      trainerFeesBillLoading,
      trainerFeesBill,
      validations,
      // Methods
      input,
      resetFilters,
      goToPreviousMonth,
      goToNextMonth,
      refreshCourseSlots,
      openTrainerFeesBillModal,
      resetTrainerFeesBillModal,
      submitTrainerFeesBill,
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
