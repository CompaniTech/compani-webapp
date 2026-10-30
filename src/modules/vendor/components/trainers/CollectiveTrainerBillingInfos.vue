<template>
  <q-page padding class="vendor-background q-pb-xl">
    <ni-banner icon="info_outline" class="bg-peach-200">
      <template #message>
        Honoraires prévus : {{ formatPrice(totals.plannedSalary) }} / Facturé : {{ formatPrice(totals.invoiced) }} /
        Réglé : {{ formatPrice(totals.paid) }}
      </template>
    </ni-banner>
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select caption="Statut des groupes" clearable :options="statusOptions" v-model="selectedStatus" />
      <ni-select caption="Programme de formation" clearable :options="programOptions" v-model="selectedProgram" />
    </div>
    <q-inner-loading v-if="coursesLoading" :showing="coursesLoading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
    <template v-else-if="filteredData.length">
      <trainer-course-billing-item v-for="course of filteredData" :key="course._id" :course="course"
        @bill="openBillModal" />
    </template>
    <div v-else class="text-italic">Pas de groupes de formation correspondant aux filtres</div>

    <trainer-fees-bill-modal v-model="billModal" :bill="bill" :loading="billLoading" :course="selectedCourse"
      :validations="validations.bill" @hide="resetBillModal" @submit="validateBill" />
  </q-page>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { useStore } from 'vuex';
import { computed, ref } from 'vue';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import Select from '@components/form/Select';
import Banner from '@components/Banner';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import TrainerBills from '@api/TrainerBills';
import { formatPrice } from '@helpers/utils';
import { add } from '@helpers/numbers';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import { useTrainerCollectiveCoursesBillingInfos } from '@composables/trainerCollectiveCoursesBillingInfos';
import TrainerCourseBillingItem from 'src/modules/vendor/components/trainers/TrainerCourseBillingItem';
import TrainerFeesBillModal from 'src/modules/vendor/components/trainers/TrainerFeesBillModal';

export default {
  name: 'CollectiveTrainerBillingInfos',
  components: {
    'ni-banner': Banner,
    'ni-select': Select,
    'trainer-course-billing-item': TrainerCourseBillingItem,
    'trainer-fees-bill-modal': TrainerFeesBillModal,
  },
  setup () {
    useMeta({ title: 'Suivi de la facturation' });

    const $store = useStore();
    const $q = useQuasar();

    const loggedUser = computed(() => $store.state.main.loggedUser);
    const trainer = loggedUser;

    const {
      trainerCourses,
      coursesLoading,
      selectedStatus,
      selectedProgram,
      statusOptions,
      filteredData,
      programOptions,
      refreshCourses,
      resetFilters,
    } = useTrainerCollectiveCoursesBillingInfos(trainer);

    const totals = computed(() => trainerCourses.value.reduce((acc, course) => ({
      plannedSalary: add(acc.plannedSalary, course.plannedSalary || 0),
      invoiced: add(acc.invoiced, course.invoicedAmount),
      paid: add(acc.paid, course.paidAmount),
    }), { plannedSalary: 0, invoiced: 0, paid: 0 }));

    const billModal = ref(false);
    const billLoading = ref(false);
    const selectedCourse = ref(null);
    const bill = ref({ number: '', file: '', amount: '' });

    const rules = computed(() => ({
      bill: { number: { required }, file: { required }, amount: { required, strictPositiveNumber } },
    }));
    const validations = useVuelidate(rules, { bill });

    const openBillModal = (course) => {
      selectedCourse.value = course;
      billModal.value = true;
    };

    const resetBillModal = () => {
      billModal.value = false;
      selectedCourse.value = null;
      bill.value = { number: '', file: '', amount: '' };
      validations.value.bill.$reset();
    };

    const submitBill = async () => {
      try {
        billLoading.value = true;

        const form = new FormData();
        form.append('number', bill.value.number);
        form.append('file', bill.value.file);
        form.append('amount', bill.value.amount);
        form.append('course', selectedCourse.value._id);

        await TrainerBills.create(form);
        resetBillModal();
        await refreshCourses();

        NotifyPositive('Facture transmise.');
      } catch (e) {
        console.error(e);
        if (e.data && e.data.statusCode === 409 && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'envoi de la facture.');
      } finally {
        billLoading.value = false;
      }
    };

    const validateBill = () => {
      validations.value.bill.$touch();
      if (validations.value.bill.$error) return NotifyWarning('Champ(s) invalide(s).');

      $q.dialog({
        title: 'Confirmation',
        message: 'Vous allez soumettre une facture d\'un montant de'
          + ` ${formatPrice(Number(bill.value.amount))}. Confirmez-vous ce montant&nbsp;?`,
        html: true,
        ok: 'Oui',
        cancel: 'Non',
      }).onOk(() => submitBill());
    };

    const created = async () => { await refreshCourses(); };

    created();

    return {
      // Data
      selectedStatus,
      selectedProgram,
      statusOptions,
      coursesLoading,
      billModal,
      billLoading,
      selectedCourse,
      bill,
      validations,
      // Computed
      filteredData,
      programOptions,
      totals,
      // Methods
      formatPrice,
      resetFilters,
      openBillModal,
      resetBillModal,
      validateBill,
    };
  },
};
</script>
