<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Formations de groupe" :display-search-bar="false" />
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select :options="holdingFilterOptions" :model-value="selectedHolding" clearable
        @update:model-value="updateSelectedHolding" />
      <company-select :options="companyFilterOptions" :company="selectedCompany" clearable
        @update="updateSelectedCompany" caption="" />
      <ni-select :options="trainerFilterOptions" :model-value="selectedTrainer" clearable
        @update:model-value="updateSelectedTrainer" />
      <ni-select :options="programFilterOptions" :model-value="selectedProgram" clearable
        @update:model-value="updateSelectedProgram" />
      <ni-select :options="operationsRepresentativeFilterOptions" :model-value="selectedOperationsRepresentative"
        @update:model-value="updateSelectedOperationsRepresentative" clearable />
      <ni-select :options="salesRepresentativeFilterOptions" :model-value="selectedSalesRepresentative"
        @update:model-value="updateSelectedSalesRepresentative" clearable />
      <ni-date-input :model-value="selectedStartDate" @update:model-value="updateSelectedStartDate"
        placeholder="Début de période" :max="selectedEndDate" :error="v$.selectedStartDate.$error"
        error-message="La date de début doit être antérieure à la date de fin" @blur="v$.selectedStartDate.$touch" />
      <ni-date-input :model-value="selectedEndDate" @update:model-value="updateSelectedEndDate"
        placeholder="Fin de période" :min="selectedStartDate" :error="v$.selectedEndDate.$error"
        error-message="La date de fin doit être postérieure à la date de début" @blur="v$.selectedEndDate.$touch" />
      <ni-select :options="typeFilterOptions" clearable :model-value="selectedType"
        @update:model-value="updateSelectedType" />
      <ni-select :options="statusOptions" :model-value="selectedStatus" @update:model-value="updateSelectedStatus" />
    </div>
    <div class="q-mb-lg filters-container checkboxes">
      <q-checkbox dense :model-value="selectedNoAddressInSlots" color="primary" label="Aucune adresse"
        @update:model-value="updateSelectedNoAddressInSlots" />
      <q-checkbox dense :model-value="selectedMissingTrainees" color="primary" label="Apprenant(s) manquant(s) (INTRA)"
        @update:model-value="updateSelectedMissingTrainees" />
    </div>
    <div class="upload-button">
      <ni-button color="primary" icon="upload" label="Ajouter une liste de formations" :disable="modalLoading"
        @click="openCsvUploadModal" />
    </div>
    <ni-trello :active-courses="activeCourses" :archived-courses="archivedCourses" />
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter une formation"
      @click="openCourseCreationModal" />

    <course-creation-modal v-model="courseCreationModal" v-model:new-course="newCourse" :programs="programs"
      :companies="companies" :validations="v$.newCourse" :loading="modalLoading" @hide="resetCreationModal"
      @submit="createCourse([INTRA, INTER_B2B, INTRA_HOLDING])" :admin-user-options="adminUserOptions"
      :holding-options="holdingOptions" />
    <upload-csv-modal v-model="csvUploadModal" @hide="resetCsvUploadModal" @submit="uploadCourseCsv" v-model:csv="csv"
      :loading="modalLoading" :validations="v$.csv" :constraints="constraints" />
  </q-page>
</template>

<script>
import { computed, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useStore } from 'vuex';
import { onBeforeRouteLeave } from 'vue-router';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required, requiredIf, or } from '@vuelidate/validators';
import Companies from '@api/Companies';
import Courses from '@api/Courses';
import Holdings from '@api/Holdings';
import Programs from '@api/Programs';
import Users from '@api/Users';
import DirectoryHeader from '@components/DirectoryHeader';
import DateInput from '@components/form/DateInput';
import Select from '@components/form/Select';
import Button from '@components/Button';
import CompanySelect from '@components/form/CompanySelect';
import CourseCreationModal from 'src/modules/vendor/components/courses/CourseCreationModal';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import UploadCsvModal from '@components/courses/UploadCsvModal';
import Trello from '@components/courses/Trello';
import { useCourseCreation } from '@composables/courseCreation';
import { useCourseFilters } from '@composables/courseFilters';
import {
  INTRA,
  INTRA_HOLDING,
  INTER_B2B,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  DIRECTORY,
  GLOBAL,
  GROUP_COURSE_TYPES,
} from '@data/constants';
import { formatAndSortOptions, formatAndSortIdentityOptions } from '@helpers/utils';
import { minDate, maxDate, strictPositiveNumber, integerNumber, positiveNumber } from '@helpers/vuelidateCustomVal';
import store from 'src/store/index';

export default {
  name: 'BlendedCoursesDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-select': Select,
    'ni-button': Button,
    'company-select': CompanySelect,
    'course-creation-modal': CourseCreationModal,
    'upload-csv-modal': UploadCsvModal,
    'ni-trello': Trello,
    'ni-date-input': DateInput,
  },
  setup () {
    const $q = useQuasar();
    const $store = useStore();
    const metaInfo = { title: 'Kanban formations mixtes' };
    useMeta(metaInfo);

    /* COURSE CREATION */
    const newCourse = ref({
      program: '',
      subProgram: '',
      company: '',
      holding: '',
      misc: '',
      type: INTRA,
      operationsRepresentative: '',
      estimatedStartDate: '',
      maxTrainees: '8',
      expectedBillsCount: '0',
      hasCertifyingTest: false,
      salesRepresentative: '',
      certificateGenerationMode: GLOBAL,
      prices: { global: '', trainerFees: '' },
      tradeName: '',
    });
    const companies = ref([]);
    const holdingOptions = ref([]);
    const programs = ref([]);
    const adminUserOptions = ref([]);
    const activeCourses = ref([]);
    const archivedCourses = ref([]);
    const csvUploadModal = ref(false);
    const csv = ref(null);
    const constraints = `
      <ul class="text-14">
        <li>Les champs <span class="text-weight-bold">subProgram</span>, <span class="text-weight-bold">type</span>,  
          <span class="text-weight-bold">hasCertifyingTest</span>, <span class="text-weight-bold">tradeName</span>,
          <span class="text-weight-bold">certificateGenerationMode</span> et
          <span class="text-weight-bold">operationsRepresentative</span> sont obligatoires.</li>
        <li>Les champs <span class="text-weight-bold">salesRepresentative</span>,
          <span class="text-weight-bold">misc</span> et <span class="text-weight-bold">estimatedStartDate</span> sont 
          optionnels.</li>  
        <li>Les autres champs (<span class="text-weight-bold">holding</span>,
          <span class="text-weight-bold">maxTrainees</span>, <span class="text-weight-bold">company</span>, 
          <span class="text-weight-bold">globalPrice</span>, <span class="text-weight-bold">trainerFees</span>, 
          <span class="text-weight-bold">expectedBillsCount</span>) sont conditionnés au type de la formation.</li>
        <li>Assurez-vous de rentrer un format valide :
          <ul>
            <li>sous-programme : id</li>
            <li>chargé des opérations/d'accompagnement : email</li>
            <li>type : intra/inter_b2b/intra_holding</li>
            <li>estimatedStartDate : AAAA-MM-JJ</li>
            <li>certificateGenerationMode : global/monthly</li>
            <li>hasCertifyingTest : true/false</li>
          <ul>
        </li>
      </ul>
    `;

    const isIntraCourse = computed(() => newCourse.value.type === INTRA);
    const isIntraHoldingCourse = computed(() => newCourse.value.type === INTRA_HOLDING);
    const loggedUser = computed(() => $store.state.main.loggedUser);

    const {
      typeFilterOptions,
      selectedHolding,
      holdingFilterOptions,
      selectedCompany,
      companyFilterOptions,
      selectedTrainer,
      trainerFilterOptions,
      selectedProgram,
      programFilterOptions,
      selectedOperationsRepresentative,
      operationsRepresentativeFilterOptions,
      selectedStartDate,
      selectedEndDate,
      selectedType,
      selectedNoAddressInSlots,
      selectedMissingTrainees,
      statusOptions,
      selectedStatus,
      updateSelectedHolding,
      updateSelectedCompany,
      updateSelectedTrainer,
      updateSelectedProgram,
      updateSelectedOperationsRepresentative,
      updateSelectedStartDate,
      updateSelectedEndDate,
      updateSelectedType,
      updateSelectedNoAddressInSlots,
      updateSelectedMissingTrainees,
      updateSelectedStatus,
      resetFilters,
      selectedSalesRepresentative,
      updateSelectedSalesRepresentative,
      salesRepresentativeFilterOptions,
    } = useCourseFilters(activeCourses, archivedCourses, holdingOptions, GROUP_COURSE_TYPES);

    const rules = computed(() => ({
      newCourse: {
        program: { required },
        subProgram: { required },
        tradeName: { required },
        type: { required },
        operationsRepresentative: { required },
        ...(isIntraCourse.value &&
          {
            maxTrainees: { required, strictPositiveNumber, integerNumber },
            expectedBillsCount: { required, positiveNumber, integerNumber },
            prices: {
              global: {
                strictPositiveNumber: or(strictPositiveNumber, value => value === ''),
                required: requiredIf(get(newCourse.value, 'prices.trainerFees')),
              },
              trainerFees: { strictPositiveNumber: or(strictPositiveNumber, value => value === '') },
            },
          }),
        company: { required: requiredIf(isIntraCourse.value) },
        ...(isIntraHoldingCourse.value && { maxTrainees: { required, strictPositiveNumber, integerNumber } }),
        holding: { required: requiredIf(isIntraHoldingCourse.value) },
        certificateGenerationMode: { required },
      },
      selectedStartDate: { maxDate: selectedEndDate.value ? maxDate(selectedEndDate.value) : '' },
      selectedEndDate: { minDate: selectedStartDate.value ? minDate(selectedStartDate.value) : '' },
      csv: { required },
    }));
    const v$ = useVuelidate(rules, { newCourse, selectedStartDate, selectedEndDate, csv });

    const {
      refreshActiveCourses,
      refreshArchivedCourses,
      createCourse,
      modalLoading,
      courseCreationModal,
    } = useCourseCreation(newCourse, activeCourses, archivedCourses, v$);

    const refreshPrograms = async () => {
      try {
        programs.value = await Programs.list();
      } catch (e) {
        console.error(e);
        programs.value = [];
      }
    };

    const refreshCompanies = async () => {
      try {
        companies.value = await Companies.list({ action: DIRECTORY });
      } catch (e) {
        console.error(e);
        companies.value = [];
      }
    };

    const refreshHoldings = async () => {
      try {
        const holdings = await Holdings.list();
        const companiesHoldings = holdings
          .flatMap(h => h.companies.map(c => ({ [c]: h._id })))
          .reduce((acc, obj) => ({ ...acc, ...obj }), {});
        $store.dispatch('course/setCompaniesHoldings', { companiesHoldings });
        holdingOptions.value = formatAndSortOptions(holdings, 'name');
      } catch (e) {
        console.error(e);
        holdingOptions.value = [];
      }
    };

    const refreshAdminUsers = async () => {
      try {
        const adminUsers = await Users.list({ role: [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN] });
        adminUserOptions.value = formatAndSortIdentityOptions(adminUsers);
      } catch (e) {
        console.error(e);
        adminUserOptions.value = [];
      }
    };

    const openCourseCreationModal = async () => {
      newCourse.value = { ...newCourse.value, operationsRepresentative: loggedUser.value._id };
      courseCreationModal.value = true;
    };

    const resetCreationModal = () => {
      v$.value.newCourse.$reset();
      newCourse.value = {
        program: '',
        tradeName: '',
        company: '',
        holding: '',
        misc: '',
        type: INTRA,
        operationsRepresentative: '',
        estimatedStartDate: '',
        maxTrainees: '8',
        expectedBillsCount: '0',
        hasCertifyingTest: false,
        salesRepresentative: '',
        certificateGenerationMode: GLOBAL,
        prices: { global: '', trainerFees: '' },
      };
    };

    const openCsvUploadModal = () => { csvUploadModal.value = true; };

    const resetCsvUploadModal = () => {
      v$.value.csv.$reset();
      csv.value = null;
    };

    const uploadCourseCsv = async () => {
      try {
        v$.value.csv.$touch();
        if (v$.value.csv.$error) return NotifyWarning('Champ(s) invalide(s)');

        modalLoading.value = true;
        const form = new FormData();
        form.append('file', csv.value);
        await Courses.uploadCollectiveCourseCsv(form);

        csvUploadModal.value = false;
        NotifyPositive('Liste de formations créées.');
        await refreshActiveCourses([INTRA, INTER_B2B, INTRA_HOLDING]);
      } catch (e) {
        console.error(e);
        if ([403, 400].includes(e.status) && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la création des formations.');
        const { errorsByCourse } = e.data;

        const message = Object.entries(errorsByCourse)
          .map(([key, values]) => `<li><span class="text-weight-bold">${key}</span> : ${values.join(', ')}</li>`)
          .join('<br>');

        $q.dialog({
          title: 'La création des formations a échoué',
          message: `<ul class="text-14">${message}</ul>`,
          html: true,
          ok: 'ok',
        });
      } finally {
        modalLoading.value = false;
      }
    };

    onBeforeRouteLeave((to) => {
      if (to.name !== 'ni management blended courses info') {
        resetFilters();
        $store.dispatch('course/resetCompaniesHoldings');
      }
    });

    /* MAIN */
    const created = async () => {
      await Promise.all([
        refreshActiveCourses([INTRA, INTER_B2B, INTRA_HOLDING]),
        refreshArchivedCourses([INTRA, INTER_B2B, INTRA_HOLDING]),
        refreshPrograms(),
        refreshCompanies(),
        refreshHoldings(),
        refreshAdminUsers(),
      ]);
    };

    created();

    return {
      // Validation
      v$,
      // Data
      INTRA,
      INTER_B2B,
      INTRA_HOLDING,
      courseCreationModal,
      modalLoading,
      newCourse,
      companies,
      holdingOptions,
      programs,
      adminUserOptions,
      activeCourses,
      archivedCourses,
      statusOptions,
      typeFilterOptions,
      constraints,
      csvUploadModal,
      csv,
      // Computed
      selectedHolding,
      holdingFilterOptions,
      selectedCompany,
      companyFilterOptions,
      selectedTrainer,
      trainerFilterOptions,
      selectedProgram,
      programFilterOptions,
      selectedOperationsRepresentative,
      operationsRepresentativeFilterOptions,
      selectedStartDate,
      selectedEndDate,
      selectedType,
      selectedNoAddressInSlots,
      selectedMissingTrainees,
      selectedStatus,
      selectedSalesRepresentative,
      salesRepresentativeFilterOptions,
      // Methods
      openCourseCreationModal,
      resetCreationModal,
      createCourse,
      openCsvUploadModal,
      resetCsvUploadModal,
      uploadCourseCsv,
      updateSelectedHolding,
      updateSelectedCompany,
      updateSelectedTrainer,
      updateSelectedProgram,
      updateSelectedOperationsRepresentative,
      updateSelectedStartDate,
      updateSelectedEndDate,
      updateSelectedType,
      updateSelectedNoAddressInSlots,
      updateSelectedMissingTrainees,
      updateSelectedStatus,
      resetFilters,
      updateSelectedSalesRepresentative,
    };
  },
  beforeRouteEnter (_, from) {
    if (!['ni management blended courses info', 'ni users trainers info'].includes(from.name)) {
      store.dispatch('course/resetFilters', { isClientInterfaceOrTrainer: false });
    }

    return true;
  },
};
</script>

<style lang="sass" scoped>
.checkboxes
  grid-gap: 12px 10px
.upload-button
  :deep(.q-btn__content)
    margin: 10px 0px !important
</style>
