<template>
  <q-page v-if="loggedUser" padding class="vendor-background">
    <ni-title-header title="Facturer" class="q-mb-xl" />
    <div class="row justify-end q-mb-md">
      <ni-button label="Facturer des frais annexes" @click="openTrainerFeesBillModal" />
    </div>
    <profile-tabs :profile-id="loggedUser._id" :tabs-content="tabsContent" />

    <trainer-fees-bill-modal v-model="trainerFeesBillModal" :bill="trainerFeesBill" :loading="trainerFeesBillLoading"
      :validations="validations.trainerFeesBill" @hide="resetTrainerFeesBillModal" @submit="validateTrainerFeesBill" />
  </q-page>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import TitleHeader from '@components/TitleHeader';
import Button from '@components/Button';
import ProfileTabs from '@components/ProfileTabs';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { formatPrice } from '@helpers/utils';
import TrainerBills from '@api/TrainerBills';
import CollectiveTrainerBillingInfos from 'src/modules/vendor/components/trainers/CollectiveTrainerBillingInfos';
import SingleTrainerBillingInfos from 'src/modules/vendor/components/trainers/SingleTrainerBillingInfos';
import TrainerFeesBillModal from 'src/modules/vendor/components/trainers/TrainerFeesBillModal';

export default {
  name: 'TrainerBillsDashboard',
  components: {
    'ni-title-header': TitleHeader,
    'ni-button': Button,
    'profile-tabs': ProfileTabs,
    'trainer-fees-bill-modal': TrainerFeesBillModal,
  },
  setup () {
    const metaInfo = { title: 'Facturer' };
    useMeta(metaInfo);

    const $store = useStore();
    const $q = useQuasar();

    const trainerFeesBillModal = ref(false);
    const trainerFeesBillLoading = ref(false);
    const trainerFeesBill = ref({ number: '', file: '', amount: '' });

    const rules = computed(() => ({
      trainerFeesBill: { number: { required }, file: { required }, amount: { required, strictPositiveNumber } },
    }));
    const validations = useVuelidate(rules, { trainerFeesBill });

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const tabsContent = computed(() => [
      ...loggedUser.value.isSingleCourseTrainer
        ? [{
          label: 'Formations individuelles',
          name: 'trainerSingleSlots',
          default: true,
          component: SingleTrainerBillingInfos,
        }]
        : [],
      ...loggedUser.value.isCollectiveCourseTrainer
        ? [{
          label: 'Formations collectives',
          name: 'trainerCollectiveSlots',
          default: !loggedUser.value.isSingleCourseTrainer,
          component: CollectiveTrainerBillingInfos,
        }]
        : [],
    ]);

    const openTrainerFeesBillModal = () => { trainerFeesBillModal.value = true; };

    const resetTrainerFeesBillModal = () => {
      trainerFeesBillModal.value = false;
      trainerFeesBill.value = { number: '', file: '', amount: '' };
      validations.value.trainerFeesBill.$reset();
    };

    const submitTrainerFeesBill = async () => {
      try {
        trainerFeesBillLoading.value = true;

        const form = new FormData();
        form.append('number', trainerFeesBill.value.number);
        form.append('file', trainerFeesBill.value.file);
        form.append('amount', trainerFeesBill.value.amount);

        await TrainerBills.create(form);
        trainerFeesBillModal.value = false;

        NotifyPositive('Facture transmise.');
      } catch (e) {
        console.error(e);
        if (e.data && e.data.statusCode === 409 && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'envoi de la facture.');
      } finally {
        trainerFeesBillLoading.value = false;
      }
    };

    const validateTrainerFeesBill = () => {
      validations.value.trainerFeesBill.$touch();
      if (validations.value.trainerFeesBill.$error) return NotifyWarning('Champ(s) invalide(s).');

      $q.dialog({
        title: 'Confirmation',
        message: 'Vous allez soumettre une facture d\'un montant de'
          + ` ${formatPrice(Number(trainerFeesBill.value.amount))}. Confirmez-vous ce montant&nbsp;?`,
        html: true,
        ok: 'Oui',
        cancel: 'Non',
      }).onOk(() => submitTrainerFeesBill());
    };

    return {
      // Data
      tabsContent,
      trainerFeesBillModal,
      trainerFeesBillLoading,
      trainerFeesBill,
      validations,
      // Computed
      loggedUser,
      // Methods
      openTrainerFeesBillModal,
      resetTrainerFeesBillModal,
      validateTrainerFeesBill,
    };
  },
};
</script>
