<template>
  <q-page padding class="vendor-background q-pb-xl">
    <ni-profile-header title="Certificats de réalisation">
      <template #title>
          <ni-select caption="Mois de formation" :options="monthOptions" multiple :model-value="selectedMonths"
            @update:model-value="updateSelectedMonths" class="selector" />
      </template>
    </ni-profile-header>
    <company-select v-if="filteredCompletionCertificates.length" label="Structure" clearable class="company-select"
      :company-options="companyOptions" :company="selectedCompany" @update="updateSelectedCompany" />
    <ni-simple-table v-if="completionCertificates.length" :data="filteredCompletionCertificates" :columns="columns"
      :loading="tableLoading" v-model:pagination="pagination" />
    <template v-else>
      <span class="text-italic q-pa-lg">Aucun certificat de réalisation pour les mois sélectionnés.</span>
    </template>
  </q-page>
</template>

<script>
import { ref, watch, computed } from 'vue';
import sortedUniqBy from 'lodash/sortedUniqBy';
import CompletionCertificates from '@api/CompletionCertificates';
import { NotifyNegative } from '@components/popup/notify';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import SimpleTable from '@components/table/SimpleTable';
import CompanySelect from '@components/form/CompanySelect';
import { MONTH, MM_YYYY } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { formatIdentity, sortStrings, formatAndSortCompanyOptions } from '@helpers/utils';
import { ascendingSort } from '@helpers/dates/utils';
import { composeCourseName } from '@helpers/courses';

export default {
  name: 'CompletionCertificatesDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
    'company-select': CompanySelect,
  },
  setup () {
    const selectedMonths = ref([]);
    const completionCertificates = ref([]);
    const monthOptions = ref([]);
    const selectedCompany = ref('');
    const tableLoading = ref(false);
    const pagination = ref({ page: 1, rowsPerPage: 15 });
    const columns = ref([
      {
        name: 'traineeName',
        label: 'Nom / Prénom de l’apprenant',
        field: row => formatIdentity(row.trainee.identity, 'Lf'),
        align: 'left',
        sortable: true,
        sort: sortStrings,
      },
      {
        name: 'company',
        label: 'Structure',
        field: row => row.course.companies[0].name,
        sortable: true,
        sort: sortStrings,
        align: 'left',
      },
      {
        name: 'course',
        label: 'Formation',
        field: row => composeCourseName(row.course),
        align: 'left',
      },
      {
        name: 'month',
        label: 'Mois',
        field: row => monthOptions.value.find(m => m.value === row.month).label,
        sortable: true,
        sort: (a, b) => {
          const valueA = monthOptions.value.find(m => m.label === a).value;
          const valueB = monthOptions.value.find(m => m.label === b).value;

          return ascendingSort(valueA, valueB);
        },
        align: 'left',
      },
    ]);

    const companyOptions = computed(() => {
      const companiesCertificates = completionCertificates.value.map(c => c.course.companies).flat();
      const formattedCompanies = [
        { label: 'Toutes les structures', value: '' },
        ...formatAndSortCompanyOptions(companiesCertificates),
      ];

      return sortedUniqBy(formattedCompanies, 'value');
    });

    const filteredCompletionCertificates = computed(() => {
      if (!selectedCompany.value) { return completionCertificates.value; }

      return completionCertificates.value.filter((c) => {
        const companiesIds = c.course.companies.map(company => company._id);
        return companiesIds.includes(selectedCompany.value);
      });
    });

    const getMonthOptions = () => {
      // can get monthly completion certificate from 02-2025
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
        const certificates = await CompletionCertificates.list({ months: selectedMonths.value });

        completionCertificates.value = certificates;
      } catch (error) {
        console.error(error);
        NotifyNegative('Erreur lors de la récupération des certificats.');
      }
    };

    const updateSelectedMonths = (months) => {
      selectedMonths.value = months;
      selectedCompany.value = null;
    };

    const updateSelectedCompany = value => (selectedCompany.value = value);

    const created = () => {
      getMonthOptions();
    };

    created();

    let timeout;
    watch(selectedMonths, () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => { await getCompletionCertificates(); }, 1000);
    });

    return {
      // Data
      selectedMonths,
      monthOptions,
      completionCertificates,
      columns,
      tableLoading,
      pagination,
      selectedCompany,
      // Computed
      companyOptions,
      filteredCompletionCertificates,
      // Methods
      updateSelectedMonths,
      updateSelectedCompany,
    };
  },
};
</script>
<style lang="sass" scoped>
.selector
  width: 50%

.company-select
  width: 30%
</style>
