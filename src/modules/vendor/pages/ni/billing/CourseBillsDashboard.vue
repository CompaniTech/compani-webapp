<template>
  <q-page padding class="vendor-background q-pb-xl">
     <ni-profile-header title="A facturer">
      <template #title>
        <ni-date-range class="col-md-6 col-xs-12" caption="Période" v-model="dateRange" :error="v$.dateRange.$error"
          @update:model-value="input" :error-message="dateRangeErrorMessage" @blur="v$.dateRange.$touch" />
      </template>
    </ni-profile-header>
    <q-card v-if="validatedCourseBills.length" class="q-px-md q-py-sm bg-peach-200">
      <q-item-section @click="showDetails" class="cursor-pointer details row copper-grey-700">
        {{ showValidatedCourseBills ? 'Masquer' : 'Afficher' }} les factures validées
        <q-icon size="xs" :name="showValidatedCourseBills ? 'expand_less' : 'expand_more'" color="copper-grey-700" />
      </q-item-section>
      <div v-if="showValidatedCourseBills">
        <div v-for="bill of validatedCourseBills" :key="bill._id">
          <ni-course-billing-card :course="bill.course" :payer-list="payerList" :loading="billsLoading"
          :billing-item-list="billingItemList" :course-bills="[bill]" is-dashboard
          @refresh-course-bills="refreshValidatedCourseBills" @unroll="unrollBill"
          :are-details-visible="areDetailsVisible" />
        </div>
      </div>
    </q-card>
    <div>
      <div v-for="bill of courseBillsToValidate" :key="bill._id">
        <ni-course-billing-card :course="bill.course" :payer-list="payerList" :loading="billsLoading"
          :billing-item-list="billingItemList" :course-bills="[bill]" is-dashboard
          @refresh-course-bills="refreshCourseBillsToValidate" @unroll="unrollBill" :selected-bills="selectedBills"
          :are-details-visible="areDetailsVisible" @update-selected-bills="updateSelectedBills" />
        </div>
    </div>
    <div v-if="!courseBillsToValidate.length && !validatedCourseBills.length" class="text-italic flex justify-center">
      Aucune facture ne correspond à votre recherche
    </div>
  </q-page>
</template>
<script>
import { useMeta } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { ref, computed } from 'vue';
import CourseBills from '@api/CourseBills';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { useCourseBilling } from '@composables/courseBills';
import { DASHBOARD } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import CourseBillingCard from 'src/modules/vendor/components/billing/CourseBillingCard';

export default {
  name: 'CourseBillsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-course-billing-card': CourseBillingCard,
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
      const promises = [refreshCourseBillsToValidate(), refreshValidatedCourseBills()];

      return Promise.all(promises);
    };

    const showDetails = async () => {
      showValidatedCourseBills.value = !showValidatedCourseBills.value;
    };

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
      // Computed
      dateRangeErrorMessage,
      v$,
      // Methods
      input,
      showDetails,
      refreshValidatedCourseBills,
      refreshCourseBillsToValidate,
      unrollBill,
      updateSelectedBills,
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
