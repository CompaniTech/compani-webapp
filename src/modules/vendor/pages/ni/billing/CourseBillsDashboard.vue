<template>
  <q-page padding class="vendor-background q-pb-xl">
     <ni-profile-header title="A facturer">
      <template #title>
        <ni-button icon="chevron_left" class="no-shadow" @click="goToPreviousMonth" />
        <ni-date-range class="col-md-6 col-xs-12" caption="Période" v-model="dateRange" :error="v$.dateRange.$error"
          @update:model-value="input" :error-message="dateRangeErrorMessage" @blur="v$.dateRange.$touch" />
         <ni-button icon="chevron_right" class="no-shadow" @click="goToNextMonth" />
      </template>
    </ni-profile-header>
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select caption="Société mère" clearable :options="holdingOptions" v-model="selectedHolding" />
      <company-select label="Structure" clearable :company-options="companyOptions" :company="selectedCompany"
        @update="updateSelectedCompany" />
    </div>
    <ni-select v-model="selectedTypes" multiple caption="Type" :options="typeOptions" clearable />
    <q-card v-if="filteredValidatedBills.length" class="q-px-md q-py-sm bg-peach-200">
      <q-item-section @click="showDetails" class="cursor-pointer details row copper-grey-700">
        {{ showValidatedCourseBills ? 'Masquer' : 'Afficher' }} les factures validées
        <q-icon size="xs" :name="showValidatedCourseBills ? 'expand_less' : 'expand_more'" color="copper-grey-700" />
      </q-item-section>
      <div v-if="showValidatedCourseBills">
        <div v-for="bill of filteredValidatedBills" :key="bill._id">
          <ni-course-billing-card :course="bill.course" :payer-list="payerList" :loading="billsLoading" is-dashboard
            :billing-item-list="billingItemList" :course-bills="[bill]" :are-details-visible="areDetailsVisible"
            @refresh-course-bills="refreshValidatedCourseBills" @unroll="unrollBill" />
        </div>
      </div>
    </q-card>
    <div>
      <div v-for="bill of filteredBillsToValidate" :key="bill._id">
        <ni-course-billing-card :course="bill.course" :payer-list="payerList" :loading="billsLoading"
          :billing-item-list="billingItemList" :course-bills="[bill]" is-dashboard
          @refresh-course-bills="refreshCourseBillsToValidate" @unroll="unrollBill" :selected-bills="selectedBills"
          :are-details-visible="areDetailsVisible" @update-selected-bills="updateSelectedBills" />
      </div>
    </div>
    <div v-if="!filteredBillsToValidate.length && !filteredValidatedBills.length"
      class="text-italic flex justify-center">
      Aucune facture ne correspond à votre recherche
    </div>

    <div class="fixed fab-custom">
      <q-btn class="q-ma-sm" no-caps rounded icon="payment" label="Valider les factures"
        @click="openCourseBillValidationModal" color="primary" :disable="!selectedBills.length" />
      <q-btn class="q-ma-sm" no-caps rounded icon="delete" label="Supprimer les factures"
        @click="openBillDeletionModal" color="primary" :disable="!selectedBills.length" />
    </div>

    <ni-course-bill-validation-modal v-model="courseBillValidationModal" v-model:bill-to-validate="billsToValidate"
      @submit="validateBills" @hide="resetCourseBillValidationModal" :loading="billValidationLoading"
      :validations="v$.billsToValidate" @cancel="cancelBillsValidation" :course-infos="courseInfos" />
  </q-page>
</template>
<script>
import { useMeta, useQuasar } from 'quasar';
import uniqBy from 'lodash/uniqBy';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { ref, computed, watch } from 'vue';
import CourseBills from '@api/CourseBills';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import CompanySelect from '@components/form/CompanySelect';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { useCourseBilling } from '@composables/courseBills';
import { DASHBOARD, COURSE_TYPES, MONTH } from '@data/constants';
import { composeCourseName } from '@helpers/courses';
import CompaniDate from '@helpers/dates/companiDates';
import { minDate, maxDate, minArrayLength } from '@helpers/vuelidateCustomVal';
import { formatAndSortOptions, formatAndSortCompanyOptions, formatQuantity, formatName } from '@helpers/utils';
import CourseBillingCard from 'src/modules/vendor/components/billing/CourseBillingCard';
import CourseBillValidationModal from 'src/modules/vendor/components/billing/CourseBillValidationModal';

export default {
  name: 'CourseBillsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-course-billing-card': CourseBillingCard,
    'ni-course-bill-validation-modal': CourseBillValidationModal,
    'company-select': CompanySelect,
    'ni-select': Select,
    'ni-button': Button,
  },
  setup () {
    const metaInfo = { title: 'A facturer' };
    useMeta(metaInfo);

    const $q = useQuasar();

    const billsLoading = ref(false);
    const showValidatedCourseBills = ref(false);
    const courseBillsToValidate = ref([]);
    const validatedCourseBills = ref([]);
    const dateRange = ref({
      startDate: CompaniDate().startOf(MONTH).toISO(),
      endDate: CompaniDate().endOf(MONTH).toISO(),
    });
    const min = ref(CompaniDate().endOf(MONTH).subtract('P1M').toISO());
    const max = ref(CompaniDate().startOf(MONTH).add('P1M').toISO());

    const typeOptions = ref([{ label: 'Tous les types', value: '' }, ...COURSE_TYPES]);
    const selectedCompany = ref('');
    const selectedHolding = ref('');
    const selectedTypes = ref(['']);
    const courseBillValidationModal = ref(false);
    const billValidationLoading = ref(false);
    const billsToValidate = ref({ _ids: [], billedAt: '' });

    const billList = computed(() => [...validatedCourseBills.value, ...courseBillsToValidate.value]);

    const rules = computed(() => ({
      dateRange: {
        startDate: { minDate: minDate(min.value) },
        endDate: { maxDate: maxDate(max.value), minDate: minDate(dateRange.value.startDate) },
      },
      billsToValidate: {
        _ids: { minArrayLength: minArrayLength(1) },
        billedAt: { required },
      },
    }));

    const v$ = useVuelidate(rules, { dateRange, billsToValidate });

    const refreshCourseBillsToValidate = async () => {
      try {
        await v$.value.dateRange.$touch();
        if (v$.value.dateRange.$error) return NotifyWarning('Date(s) invalide(s)');

        billsLoading.value = true;
        const bills = await CourseBills.list({
          action: DASHBOARD,
          startDate: dateRange.value.startDate,
          endDate: dateRange.value.endDate,
          isValidated: false,
        });
        courseBillsToValidate.value = bills;
        NotifyPositive('Factures à valider récupérées.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des factures à valider.');
      } finally {
        billsLoading.value = false;
      }
    };

    const {
      payerList,
      billingItemList,
      areDetailsVisible,
      selectedBills,
      updateSelectedBills,
      refreshPayers,
      refreshBillingItems,
      unrollBill,
      openBillDeletionModal,
    } = useCourseBilling(billList, v$, refreshCourseBillsToValidate);

    const companyOptions = computed(() => {
      const billsCompanies = billList.value.map(bill => bill.companies).flat();
      return [
        { label: 'Toutes les structures', value: '' },
        ...formatAndSortCompanyOptions(uniqBy(billsCompanies, '_id')),
      ];
    });

    const holdingOptions = computed(() => {
      const billsHolding = billList.value
        .flatMap(bill => bill.companies)
        .filter(company => company.holding)
        .map(company => company.holding)
        .flat();
      return [
        { label: 'Toutes les sociétés mères', value: '' },
        ...formatAndSortOptions(uniqBy(billsHolding, '_id'), 'name'),
      ];
    });

    const filteredBillsToValidate = computed(() => {
      let filteredBills = courseBillsToValidate.value;
      if (selectedCompany.value) {
        filteredBills = filteredBills.filter((bill) => {
          const companiesIds = bill.companies.map(company => company._id);

          return companiesIds.includes(selectedCompany.value);
        });
      }

      if (selectedHolding.value) {
        filteredBills = filteredBills.filter((bill) => {
          const holdingsIds = bill.companies
            .filter(company => company.holding).map(company => company.holding._id);

          return holdingsIds.includes(selectedHolding.value);
        });
      }

      if (selectedTypes.value.length && !selectedTypes.value.includes('')) {
        filteredBills = filteredBills.filter(bill => selectedTypes.value.includes(bill.course.type));
      }

      return filteredBills;
    });

    const filteredValidatedBills = computed(() => {
      let filteredBills = validatedCourseBills.value;
      if (selectedCompany.value) {
        filteredBills = filteredBills.filter((bill) => {
          const companiesIds = bill.companies.map(company => company._id);

          return companiesIds.includes(selectedCompany.value);
        });
      }

      if (selectedHolding.value) {
        filteredBills = filteredBills.filter((bill) => {
          const holdingsIds = bill.companies
            .filter(company => company.holding).map(company => company.holding._id);

          return holdingsIds.includes(selectedHolding.value);
        });
      }

      if (selectedTypes.value.length && !selectedTypes.value.includes('')) {
        filteredBills = filteredBills.filter(bill => selectedTypes.value.includes(bill.course.type));
      }

      return filteredBills;
    });

    const dateRangeErrorMessage = computed(() => {
      if (CompaniDate(dateRange.value.endDate).isBefore(dateRange.value.startDate)) {
        return 'La date de fin doit être postérieure à la date de début';
      }
      if (CompaniDate(dateRange.value.startDate).add('P1M').isBefore(dateRange.value.endDate)) {
        return 'Date(s) invalide(s) : la période maximale est 1 mois';
      }

      return '';
    });

    const courseInfos = computed(() => {
      const bills = courseBillsToValidate.value
        .filter(bill => billsToValidate.value._ids.includes(bill._id));

      return bills.map(bill => ({
        courseType: bill.course.type,
        companiesName: formatName(bill.companies),
        courseName: composeCourseName(bill.course),
        traineesQuantity: bill.course.trainees
          .filter(trainee => bill.companies.map(c => c._id).includes(trainee.registrationCompany))
          .length,
      }));
    });

    const refreshValidatedCourseBills = async () => {
      try {
        await v$.value.dateRange.$touch();
        if (v$.value.dateRange.$error) return NotifyWarning('Date(s) invalide(s)');

        billsLoading.value = true;
        const bills = await CourseBills.list({
          action: DASHBOARD,
          startDate: dateRange.value.startDate,
          endDate: dateRange.value.endDate,
          isValidated: true,
        });
        validatedCourseBills.value = bills;
        NotifyPositive('Factures validées récupérées.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des factures validées.');
      } finally {
        billsLoading.value = false;
      }
    };

    const input = (date) => {
      min.value = CompaniDate(date.endDate).subtract('P1M').add('P1D').toISO();
      max.value = CompaniDate(date.startDate).add('P1M').subtract('P1D').toISO();
    };

    const showDetails = async () => {
      showValidatedCourseBills.value = !showValidatedCourseBills.value;
    };

    const updateSelectedCompany = (value) => { selectedCompany.value = value; };

    const openCourseBillValidationModal = () => {
      billsToValidate.value._ids = selectedBills.value;
      const bills = courseBillsToValidate.value
        .filter(bill => billsToValidate.value._ids.includes(bill._id));
      if (bills.some(bill => bill.course.interruptedAt)) {
        const message = 'La formation d\'une des factures est en pause.'
          + ' Êtes-vous sûr(e) de vouloir valider les factures&nbsp;?';
        $q.dialog({
          title: 'Confirmation',
          message,
          html: true,
          ok: 'Oui',
          cancel: 'Non',
        }).onOk(() => { courseBillValidationModal.value = true; })
          .onCancel(() => NotifyPositive('Facturation annulée.'));
      } else {
        courseBillValidationModal.value = true;
      }
    };

    const validateBills = async() => {
      try {
        v$.value.billsToValidate.$touch();
        if (v$.value.billsToValidate.$error) return NotifyWarning('Champ(s) invalide(s)');

        billValidationLoading.value = true;

        await CourseBills.updateBillList(billsToValidate.value);
        NotifyPositive(`${formatQuantity('facture validée', billsToValidate.value._ids.length)}.`);

        courseBillValidationModal.value = false;
        selectedBills.value = [];
        const promises = [refreshCourseBillsToValidate(), refreshValidatedCourseBills()];
        await Promise.all(promises);
      } catch (e) {
        console.error(e);
        if (e.status === 403) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la validation des factures brouillon.');
      } finally {
        billValidationLoading.value = false;
      }
    };

    const resetCourseBillValidationModal = () => {
      billsToValidate.value = { _ids: [], billedAt: '' };
      v$.value.billsToValidate.$reset();
    };

    const cancelBillsValidation = () => {
      resetCourseBillValidationModal();
      courseBillValidationModal.value = false;
      NotifyPositive('Validation des factures annulée.');
    };

    const resetFilters = () => {
      selectedHolding.value = '';
      selectedCompany.value = '';
      selectedTypes.value = [''];
    };

    const goToPreviousMonth = () => {
      const date = CompaniDate(dateRange.value.startDate).startOf(MONTH).subtract('P1M');
      dateRange.value = { startDate: date.toISO(), endDate: date.endOf(MONTH).toISO() };
      input(dateRange.value);
    };

    const goToNextMonth = () => {
      const date = CompaniDate(dateRange.value.startDate).startOf(MONTH).add('P1M');
      dateRange.value = { startDate: date.toISO(), endDate: date.endOf(MONTH).toISO() };
      input(dateRange.value);
    };

    watch(dateRange, async () => {
      selectedBills.value = [];
      const promises = [refreshCourseBillsToValidate(), refreshValidatedCourseBills()];

      return Promise.all(promises);
    });

    watch(selectedTypes, (newValue, oldValue) => {
      if (Array.isArray(newValue) && newValue.length === 0) {
        selectedTypes.value = [''];
        return;
      }
      if (!oldValue.includes('') && newValue.includes('')) {
        selectedTypes.value = [''];
        return;
      }

      if (newValue.includes('') && newValue.length > 1) selectedTypes.value = newValue.filter(v => v !== '');
    });

    const created = async () => {
      await Promise.all([
        refreshCourseBillsToValidate(),
        refreshValidatedCourseBills(),
        refreshPayers(),
        refreshBillingItems(),
      ]);
    };

    created();

    return {
      // Data
      dateRange,
      courseBillsToValidate,
      validatedCourseBills,
      showValidatedCourseBills,
      payerList,
      billsLoading,
      billingItemList,
      areDetailsVisible,
      selectedBills,
      selectedHolding,
      selectedTypes,
      selectedCompany,
      courseBillValidationModal,
      billValidationLoading,
      // Computed
      dateRangeErrorMessage,
      holdingOptions,
      companyOptions,
      typeOptions,
      filteredBillsToValidate,
      filteredValidatedBills,
      courseInfos,
      v$,
      // Methods
      input,
      showDetails,
      refreshValidatedCourseBills,
      refreshCourseBillsToValidate,
      unrollBill,
      updateSelectedBills,
      updateSelectedCompany,
      openBillDeletionModal,
      openCourseBillValidationModal,
      billsToValidate,
      validateBills,
      resetCourseBillValidationModal,
      cancelBillsValidation,
      resetFilters,
      goToPreviousMonth,
      goToNextMonth,
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
