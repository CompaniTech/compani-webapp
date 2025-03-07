<template>
  <q-page padding class="vendor-background q-pb-xl">
    {{ selectedMonths }}
    <ni-title-header title="Certificats de réalisations" class="q-mb-xl" />
    <ni-select caption="Mois de formation" :options="monthOptions" multiple :blur-on-selection="false"
      :model-value="selectedMonths" @update:model-value="updateSelectedMonths" @blur="getCompletionCertificates" />
    <ni-simple-table :data="completionCertificates" :columns="columns" :loading="tableLoading"
      v-model:pagination="pagination" />
  </q-page>
</template>

<script>
import { ref } from 'vue';
import CompletionCertificates from '@api/CompletionCertificates';
import TitleHeader from '@components/TitleHeader';
import Select from '@components/form/Select';
import SimpleTable from '@components/table/SimpleTable';
import { MONTH, MM_YYYY } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { formatIdentity } from '@helpers/utils';
import { composeCourseName } from '@helpers/courses';

export default {
  name: 'CompletionCertificatesDashboard',
  components: {
    'ni-title-header': TitleHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
  },
  setup () {
    const selectedMonths = ref([]);
    const completionCertificates = ref([]);
    const monthOptions = ref([]);
    const tableLoading = ref(false);
    const pagination = ref({ page: 1, rowsPerPage: 15 });
    const columns = ref([
      {
        name: 'company',
        label: 'Structure',
        // triable,
        field: row => row.course.companies[0].name,
      },
      {
        name: 'traineeName',
        label: 'Nom / Prénom de l’apprenant',
        field: row => formatIdentity(row.trainee.identity, 'Lf'),
      },
      {
        name: 'course',
        label: 'Formation',
        field: row => composeCourseName(row.course),
      },
      {
        name: 'month',
        label: 'Mois',
        field: row => monthOptions.value.find(m => m.value === row.month).label,
      },
    ]);

    const getMonthOptions = () => {
      const startDate = CompaniDate('2025-02-01T09:00:00.000Z').startOf(MONTH).toISO();
      const endDate = CompaniDate().startOf(MONTH).toISO();

      const monthDiff = CompaniDuration(CompaniDate(endDate).diff(startDate, MONTH)).asMonths();

      for (let i = 0; i <= monthDiff; i++) {
        const currentMonth = CompaniDate(startDate).add(`P${i}M`);
        const label = currentMonth.format('MMMM yyyy');
        const value = currentMonth.format(MM_YYYY);

        monthOptions.value.push({ label, value });
      }
    };

    const getCompletionCertificates = async () => {
      try {
        console.log(Array.isArray(selectedMonths.value));
        const response = await CompletionCertificates.getCompletionCertificates(
          { months: [...selectedMonths.value] }
        );

        completionCertificates.value = response;
      } catch (error) {
        console.error('Erreur lors de la récupération des certificats', error);
      }
    };

    const updateSelectedMonths = (months) => {
      selectedMonths.value = months;
    };

    getMonthOptions();

    return {
      // Data
      selectedMonths,
      monthOptions,
      completionCertificates,
      columns,
      tableLoading,
      pagination,
      // Methods
      getCompletionCertificates,
      updateSelectedMonths,
    };
  },
};
</script>
