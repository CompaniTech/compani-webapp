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
      <ni-select caption="Intervenant·e" clearable :options="trainerOptions" v-model="selectedTrainer" />
    </div>
    <div>{{ data }}</div>
  </q-page>
</template>
<script>
import { useMeta } from 'quasar';
import useVuelidate from '@vuelidate/core';
import pick from 'lodash/pick';
import { ref, computed, watch } from 'vue';
import CourseSlots from '@api/CourseSlots';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { MONTH } from '@data/constants';
import { formatAndSortIdentityOptions } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';

export default {
  name: 'TrainersBillingFollowUp',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-select': Select,
    'ni-button': Button,
  },
  setup () {
    const metaInfo = { title: 'A facturer' };
    useMeta(metaInfo);

    const slotsLoading = ref(false);
    const trainerBillingInfos = ref({});
    const dateRange = ref({
      startDate: CompaniDate().startOf(MONTH).toISO(),
      endDate: CompaniDate().endOf(MONTH).toISO(),
    });
    const min = ref(CompaniDate().endOf(MONTH).subtract('P1M').toISO());
    const max = ref(CompaniDate().startOf(MONTH).add('P1M').toISO());
    const selectedTrainer = ref('');

    const rules = computed(() => ({
      dateRange: {
        startDate: { minDate: minDate(min.value) },
        endDate: { maxDate: maxDate(max.value), minDate: minDate(dateRange.value.startDate) },
      },
    }));

    const v$ = useVuelidate(rules, { dateRange });

    const refreshCourseSlots = async () => {
      try {
        await v$.value.dateRange.$touch();
        if (v$.value.dateRange.$error) return NotifyWarning('Date(s) invalide(s)');

        slotsLoading.value = true;
        const slots = await CourseSlots.list({
          startDate: dateRange.value.startDate,
          endDate: dateRange.value.endDate,
        });
        trainerBillingInfos.value = slots;
        NotifyPositive('Créneaux de l\'intervenant·es récupérés.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des créneaux de l\'intervenant·es.');
      } finally {
        slotsLoading.value = false;
      }
    };

    const data = computed(() => {
      if (!selectedTrainer.value) return trainerBillingInfos.value;

      return pick(trainerBillingInfos.value, selectedTrainer.value);
    });

    const trainerOptions = computed(() => formatAndSortIdentityOptions(
      Object.entries(trainerBillingInfos.value).map(([trainerId, trainer]) => ({
        _id: trainerId,
        identity: trainer.identity,
      }))
    ));

    const dateRangeErrorMessage = computed(() => {
      if (CompaniDate(dateRange.value.endDate).isBefore(dateRange.value.startDate)) {
        return 'La date de fin doit être postérieure à la date de début';
      }
      if (CompaniDate(dateRange.value.startDate).add('P1M').isBefore(dateRange.value.endDate)) {
        return 'Date(s) invalide(s) : la période maximale est 1 mois';
      }

      return '';
    });

    const input = (date) => {
      min.value = CompaniDate(date.endDate).subtract('P1M').add('P1D').toISO();
      max.value = CompaniDate(date.startDate).add('P1M').subtract('P1D').toISO();
    };

    const updateSelectedTrainer = (value) => { selectedTrainer.value = value; };

    const resetFilters = () => {
      selectedTrainer.value = '';
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
      selectedTrainer.value = '';
      const promises = [refreshCourseSlots()];

      return Promise.all(promises);
    });

    const created = async () => {
      await Promise.all([refreshCourseSlots()]);
    };

    created();

    return {
      // Data
      dateRange,
      selectedTrainer,
      // Computed
      data,
      dateRangeErrorMessage,
      trainerOptions,
      v$,
      // Methods
      input,
      updateSelectedTrainer,
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
