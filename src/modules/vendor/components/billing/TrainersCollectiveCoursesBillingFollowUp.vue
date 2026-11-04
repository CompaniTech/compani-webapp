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
    </div>
    <ni-select caption="Statut des groupes" multiple :options="statusOptions" :model-value="selectedStatus"
      @update:model-value="updateSelectedStatus" :blur-on-selection="false" />
    <q-inner-loading v-if="coursesLoading" :showing="coursesLoading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
    <div v-else-if="filteredData.length">
      <trainer-courses-billing-card v-for="trainer of filteredData" :key="trainer._id" :trainer="trainer" />
    </div>
    <div v-else class="text-italic">Pas de groupes de formation correspondant aux filtres sur la période</div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue';
import useVuelidate from '@vuelidate/core';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { NotifyWarning } from '@components/popup/notify';
import { MONTH } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import { useTrainerCollectiveCoursesBillingInfos } from '@composables/trainerCollectiveCoursesBillingInfos';
import TrainerCoursesBillingInfosCard from 'src/modules/vendor/components/billing/TrainerCoursesBillingInfosCard';

export default {
  name: 'TrainersCollectiveCoursesBillingFollowUp',
  components: {
    'ni-date-range': DateRange,
    'ni-select': Select,
    'ni-button': Button,
    'trainer-courses-billing-card': TrainerCoursesBillingInfosCard,
  },
  setup () {
    const maxMonthsPeriod = 4;
    const dateRange = ref({
      startDate: CompaniDate().subtract('P1M').startOf(MONTH).toISO(),
      endDate: CompaniDate().subtract('P1M').endOf(MONTH).toISO(),
    });
    const min = ref(CompaniDate().subtract(`P${maxMonthsPeriod}M`).startOf(MONTH).toISO());
    const max = ref(CompaniDate().add(`P${maxMonthsPeriod}M`).endOf(MONTH).toISO());

    const rules = computed(() => ({
      dateRange: {
        startDate: { minDate: minDate(min.value) },
        endDate: { maxDate: maxDate(max.value), minDate: minDate(dateRange.value.startDate) },
      },
    }));
    const v$ = useVuelidate(rules, { dateRange });

    const {
      coursesLoading,
      selectedTrainer,
      selectedStatus,
      selectedProgram,
      statusOptions,
      filteredData,
      trainerOptions,
      programOptions,
      refreshCourses,
      updateSelectedStatus,
      resetFilters,
    } = useTrainerCollectiveCoursesBillingInfos();

    const dateRangeErrorMessage = computed(() => {
      if (CompaniDate(dateRange.value.endDate).isBefore(dateRange.value.startDate)) {
        return 'La date de fin doit être postérieure à la date de début';
      }

      if (CompaniDate(dateRange.value.startDate).add(`P${maxMonthsPeriod}M`).isBefore(dateRange.value.endDate)) {
        return `Date(s) invalide(s) : la période maximale est ${maxMonthsPeriod} mois`;
      }

      return '';
    });

    const refreshCoursesOnPeriod = async () => {
      await v$.value.dateRange.$touch();
      if (v$.value.dateRange.$error) return NotifyWarning('Date(s) invalide(s)');

      await refreshCourses({ startDate: dateRange.value.startDate, endDate: dateRange.value.endDate });
    };

    const input = (date) => {
      min.value = CompaniDate(date.endDate).subtract(`P${maxMonthsPeriod}M`).add('P1D').toISO();
      max.value = CompaniDate(date.startDate).add(`P${maxMonthsPeriod}M`).subtract('P1D').toISO();
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
      await refreshCoursesOnPeriod();
      resetFilters();
    });

    const created = async () => { await refreshCoursesOnPeriod(); };

    created();

    return {
      // Data
      dateRange,
      coursesLoading,
      selectedTrainer,
      selectedStatus,
      selectedProgram,
      statusOptions,
      // Computed
      v$,
      filteredData,
      trainerOptions,
      programOptions,
      dateRangeErrorMessage,
      // Methods
      input,
      goToPreviousMonth,
      goToNextMonth,
      resetFilters,
      updateSelectedStatus,
    };
  },
};
</script>
