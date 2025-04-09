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
      <ni-select v-model="selectedTrainee" caption="Apprenant" :options="traineeOptions" clearable />
    </div>
    <completion-certificate-table v-if="completionCertificates.length" :columns="columns"
      :completion-certificates="filteredCompletionCertificates" :disabled-button="disableButton"
      @generate="generateCompletionCertificate" @remove-file="validateCompletionCertificateDeletion" />
    <template v-else>
      <span class="text-italic q-pa-lg">Aucun certificat de réalisation pour les mois sélectionnés.</span>
    </template>
  </q-page>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { ref, watch, computed } from 'vue';
import get from 'lodash/get';
import has from 'lodash/has';
import sortedUniqBy from 'lodash/sortedUniqBy';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import CompanySelect from '@components/form/CompanySelect';
import CompletionCertificateTable from '@components/table/CompletionCertificateTable';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import CompletionCertificates from '@api/CompletionCertificates';
import { MONTH, MM_YYYY } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { useCompletionCertificates } from '@composables/completionCertificates';
import {
  formatIdentity,
  sortStrings,
  formatAndSortCompanyOptions,
  formatAndSortOptions,
  formatAndSortIdentityOptions,
} from '@helpers/utils';
import { ascendingSort, descendingSortBy } from '@helpers/dates/utils';
import { composeCourseName } from '@helpers/courses';

export default {
  name: 'CompletionCertificatesDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'completion-certificate-table': CompletionCertificateTable,
    'company-select': CompanySelect,
  },
  setup () {
    const metaInfo = { title: 'Certificats réalisation mensuels' };
    useMeta(metaInfo);

    const $q = useQuasar();

    const selectedMonths = ref([]);
    const monthOptions = ref([]);
    const selectedCompany = ref('');
    const selectedHolding = ref('');
    const selectedTrainee = ref('');
    const columns = ref([
      {
        name: 'traineeName',
        label: 'Apprenant',
        field: row => formatIdentity(row.trainee.identity, 'FL'),
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
        style: 'width: 10%',
      },
      {
        name: 'actions',
        label: '',
        field: '',
        align: 'right',
        style: 'width: 15%',
      },
    ]);

    const displayFilters = computed(() => filteredCompletionCertificates.value.length ||
      selectedCompany.value || selectedHolding.value);

    const {
      completionCertificates,
      tableLoading,
      disableButton,
      getCompletionCertificates,
      generateCompletionCertificateFile,
    } = useCompletionCertificates({ months: selectedMonths.value });

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

    const traineeOptions = computed(() => {
      const traineeWithCertificates = formatAndSortIdentityOptions(completionCertificates.value.map(c => c.trainee));

      return [{ label: 'Tous les apprenants', value: '' }, ...sortedUniqBy(traineeWithCertificates, 'value')];
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

      if (selectedTrainee.value) {
        filteredCC = filteredCC.filter(c => c.trainee._id === selectedTrainee.value);
      }

      return filteredCC;
    });

    const refreshCompletionCertificates = async () => {
      try {
        await getCompletionCertificates({ months: selectedMonths.value });
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des certificats de réalisation.');
      }
    };

    const generateCompletionCertificate = async (completionCertificateId) => {
      try {
        await generateCompletionCertificateFile(completionCertificateId);

        await refreshCompletionCertificates();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la génération des certificats de réalisation.');
      }
    };

    const deleteCompletionCertificateFile = async (completionCertificateId) => {
      try {
        disableButton.value = true;
        await CompletionCertificates.deleteFile(completionCertificateId);
        NotifyPositive('Certificat de réalisation supprimé.');

        await refreshCompletionCertificates();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du certificat.');
      } finally {
        disableButton.value = false;
      }
    };

    const validateCompletionCertificateDeletion = async (completionCertificateId) => {
      try {
        $q.dialog({
          title: 'Confirmation',
          message: 'Êtes-vous sûr(e) de vouloir supprimer ce certificat&nbsp;?',
          html: true,
          ok: true,
          cancel: 'Annuler',
        }).onOk(() => deleteCompletionCertificateFile(completionCertificateId))
          .onCancel(() => NotifyPositive('Suppression annulée.'));
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du certificat de réalisation.');
      }
    };

    const getMonthOptions = () => {
      // can get monthly completion certificate from 03-2024
      const startDate = CompaniDate('2024-03-01T09:00:00.000Z').startOf(MONTH).toISO();
      const endDate = CompaniDate().startOf(MONTH).toISO();

      const monthDiff = CompaniDuration(CompaniDate(endDate).diff(startDate, MONTH)).asMonths();

      for (let i = 0; i <= monthDiff; i++) {
        const currentMonth = CompaniDate(startDate).add(`P${i}M`);
        const label = currentMonth.format('MMMM yyyy');
        const value = currentMonth.format(MM_YYYY);

        monthOptions.value.push({ label, value });
      }
      monthOptions.value.sort(descendingSortBy('value', MM_YYYY));
    };

    watch(completionCertificates, () => {
      if (!completionCertificates.value.length) {
        selectedCompany.value = '';
        selectedHolding.value = '';
        selectedTrainee.value = '';
      }
    });

    const updateSelectedMonths = months => (selectedMonths.value = months);

    const updateSelectedCompany = value => (selectedCompany.value = value);

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
      selectedCompany,
      selectedHolding,
      selectedTrainee,
      disableButton,
      completionCertificates,
      // Computed
      companyOptions,
      filteredCompletionCertificates,
      columns,
      holdingOptions,
      displayFilters,
      traineeOptions,
      // Methods
      updateSelectedMonths,
      updateSelectedCompany,
      generateCompletionCertificate,
      get,
      has,
      validateCompletionCertificateDeletion,
    };
  },
};
</script>
<style lang="sass" scoped>
.selector
  width: 50%
</style>
