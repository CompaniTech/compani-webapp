<template>
  <q-page padding class="vendor-background q-pb-xl">
     <ni-profile-header title="A facturer">
      <template #title>
        <ni-date-range class="col-md-6 col-xs-12" caption="Période" v-model="dateRange" :error="v$.dateRange.$error"
          @update:model-value="input" :error-message="dateRangeErrorMessage" @blur="v$.dateRange.$touch" />
      </template>
    </ni-profile-header>
    <div class="filters-container">
      <ni-select caption="Société mère" clearable :options="holdingOptions" v-model="selectedHolding" />
      <company-select label="Structure" clearable :company-options="companyOptions" :company="selectedCompany"
        @update="updateSelectedCompany" />
      <ni-select v-model="selectedTypes" multiple caption="Type" :options="typeOptions" clearable />
    </div>
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
  </q-page>
</template>
<script>
import { useMeta } from 'quasar';
import uniqBy from 'lodash/uniqBy';
import useVuelidate from '@vuelidate/core';
import { ref, computed, watch } from 'vue';
import CourseBills from '@api/CourseBills';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import CompanySelect from '@components/form/CompanySelect';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { useCourseBilling } from '@composables/courseBills';
import { DASHBOARD, COURSE_TYPES } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import { formatAndSortOptions, formatAndSortCompanyOptions } from '@helpers/utils';
import CourseBillingCard from 'src/modules/vendor/components/billing/CourseBillingCard';

export default {
  name: 'CourseBillsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-course-billing-card': CourseBillingCard,
    'company-select': CompanySelect,
    'ni-select': Select,
  },
  setup () {
    const metaInfo = { title: 'A facturer' };
    useMeta(metaInfo);

    const billsLoading = ref(false);
    const showValidatedCourseBills = ref(false);
    const courseBillsToValidate = ref([]);
    const validatedCourseBills = ref([]);
    const dateRange = ref({
      startDate: CompaniDate().startOf('month').toISO(),
      endDate: CompaniDate().endOf('month').toISO(),
    });
    const min = ref(CompaniDate().endOf('month').subtract('P1M').toISO());
    const max = ref(CompaniDate().startOf('month').add('P1M').toISO());

    const typeOptions = ref([{ label: 'Tous les types', value: '' }, ...COURSE_TYPES]);
    const selectedCompany = ref('');
    const selectedHolding = ref('');
    const selectedTypes = ref(['']);

    const billList = computed(() => [...validatedCourseBills.value, ...courseBillsToValidate.value]);

    const {
      payerList,
      billingItemList,
      areDetailsVisible,
      selectedBills,
      updateSelectedBills,
      refreshPayers,
      refreshBillingItems,
      unrollBill,
    } = useCourseBilling(billList);

    const rules = computed(() => ({
      dateRange: {
        startDate: { minDate: minDate(min.value) },
        endDate: { maxDate: maxDate(max.value), minDate: minDate(dateRange.value.startDate) },
      },
    }));

    const v$ = useVuelidate(rules, { dateRange });

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
      // Computed
      dateRangeErrorMessage,
      holdingOptions,
      companyOptions,
      typeOptions,
      filteredBillsToValidate,
      filteredValidatedBills,
      v$,
      // Methods
      input,
      showDetails,
      refreshValidatedCourseBills,
      refreshCourseBillsToValidate,
      unrollBill,
      updateSelectedBills,
      updateSelectedCompany,
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
