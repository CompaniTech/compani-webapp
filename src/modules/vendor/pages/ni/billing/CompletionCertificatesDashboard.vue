<template>
  <q-page padding class="vendor-background q-pb-xl">
    <ni-profile-header title="Certificats de réalisation">
      <template #title>
        <ni-select caption="Mois de formation" :options="monthOptions" multiple :model-value="selectedMonths"
          @update:model-value="updateSelectedMonths" class="selector" />
      </template>
    </ni-profile-header>
    <div v-if="displayFilters" class="filters-container">
      <ni-select caption="Société mère" clearable :options="holdingOptions" v-model="selectedHolding" />
      <company-select label="Structure" clearable :company-options="companyOptions" :company="selectedCompany"
        @update="updateSelectedCompany" />
    </div>
    <ni-simple-table v-if="completionCertificates.length" :data="filteredCompletionCertificates" :columns="columns"
      :loading="tableLoading" v-model:pagination="pagination">
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td :props="props" v-for="col in props.cols" :key="col.name" :data-label="col.label" :class="col.name"
            :style="col.style">
              <template v-if="col.name === 'actions'">
                <div v-if="has(props, 'row.file.link')">
                  <ni-button icon="file_download" color="primary" type="a" :href="get(props.row, 'file.link')" />
                </div>
                <div v-else>
                  <ni-button label="Générer" icon="add" @click="generateCompletionCertificate(props.row._id)" />
                </div>
              </template>
              <template v-else>
                {{ col.value }}
              </template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
    <template v-else>
      <span class="text-italic q-pa-lg">Aucun certificat de réalisation pour les mois sélectionnés.</span>
    </template>
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { ref, watch, computed } from 'vue';
import get from 'lodash/get';
import has from 'lodash/has';
import sortedUniqBy from 'lodash/sortedUniqBy';
import CompletionCertificates from '@api/CompletionCertificates';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import SimpleTable from '@components/table/SimpleTable';
import CompanySelect from '@components/form/CompanySelect';
import Button from '@components/Button';
import { MONTH, MM_YYYY, GENERATION } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { useCompletionCertificates } from '@composables/completionCertificates';
import { formatIdentity, sortStrings, formatAndSortCompanyOptions, formatAndSortOptions } from '@helpers/utils';
import { ascendingSort } from '@helpers/dates/utils';
import { composeCourseName } from '@helpers/courses';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';

export default {
  name: 'CompletionCertificatesDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
    'company-select': CompanySelect,
    'ni-button': Button,
  },
  setup () {
    const metaInfo = { title: 'Certificats réalisation mensuels' };
    useMeta(metaInfo);

    const selectedMonths = ref([]);
    const monthOptions = ref([]);
    const selectedCompany = ref('');
    const completionCertificates = ref([]);
    const selectedHolding = ref('');
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
      {
        name: 'actions',
        label: '',
        field: '',
        align: 'right',
      },
    ]);

    const displayFilters = computed(() => filteredCompletionCertificates.value.length ||
      selectedCompany.value || selectedHolding.value);

    const companyOptions = computed(() => {
      const companiesCertificates = completionCertificates.value.map(c => get(c, 'course.companies', [])).flat();
      const formattedCompanies = [
        { label: 'Toutes les structures', value: '' },
        ...formatAndSortCompanyOptions(companiesCertificates),
      ];

      return sortedUniqBy(formattedCompanies, 'value');
    });

    const holdingOptions = computed(() => {
      const holdingCertificates = completionCertificates.value
        .map(c => get(c, 'course.companies', [])
          .filter(company => company.holding)
          .map(company => company.holding))
        .flat();
      const formattedHolding = [
        { label: 'Toutes les sociétés mères', value: '' },
        ...formatAndSortOptions(holdingCertificates, 'name'),
      ];

      return sortedUniqBy(formattedHolding, 'value');
    });

    const filteredCompletionCertificates = computed(() => {
      let filteredCC = completionCertificates.value;
      if (selectedCompany.value) {
        filteredCC = filteredCC.filter((cc) => {
          const companiesIds = get(cc, 'course.companies', []).map(company => company._id);

          return companiesIds.includes(selectedCompany.value);
        });
      }

      if (selectedHolding.value) {
        filteredCC = filteredCC.filter((cc) => {
          const holdingCertificates = get(cc, 'course.companies', [])
            .filter(company => company.holding).map(company => company.holding._id);

          return holdingCertificates.includes(selectedHolding.value);
        });
      }

      return filteredCC;
    });

    const {
      tableLoading,
      pagination,
      getCompletionCertificates,
    } = useCompletionCertificates(completionCertificates, monthOptions);

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

    watch(completionCertificates, () => {
      if (!completionCertificates.value.length) {
        selectedCompany.value = '';
        selectedHolding.value = '';
      }
    });

    const updateSelectedMonths = months => (selectedMonths.value = months);

    const updateSelectedCompany = value => (selectedCompany.value = value);

    const refreshCompletionCertificates = async () => {
      await getCompletionCertificates({ months: selectedMonths.value });
    };

    const generateCompletionCertificate = async (completionCertificateId) => {
      try {
        await CompletionCertificates.update(completionCertificateId, { action: GENERATION });
        NotifyPositive('Certificat de réalisation généré.');

        await refreshCompletionCertificates();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la génération du certificat.');
      }
    };

    const created = () => getMonthOptions();

    created();

    let timeout;
    watch(selectedMonths, () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (selectedMonths.value.length) {
          await getCompletionCertificates({ months: selectedMonths.value });
        } else {
          completionCertificates.value = [];
        }
      }, 1000);
    });

    return {
      // Data
      selectedMonths,
      monthOptions,
      tableLoading,
      pagination,
      selectedCompany,
      selectedHolding,
      // Computed
      companyOptions,
      filteredCompletionCertificates,
      columns,
      completionCertificates,
      holdingOptions,
      displayFilters,
      // Methods
      updateSelectedMonths,
      updateSelectedCompany,
      generateCompletionCertificate,
      get,
      has,
    };
  },
};
</script>
<style lang="sass" scoped>
.selector
  width: 50%
</style>
