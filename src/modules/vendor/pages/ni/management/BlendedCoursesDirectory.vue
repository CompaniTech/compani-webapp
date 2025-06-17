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
    <ni-trello :active-courses="activeCourses" :archived-courses="archivedCourses" />
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter une formation"
      @click="openCourseCreationModal" />

    <course-creation-modal v-model="courseCreationModal" v-model:new-course="newCourse" :programs="programs"
      :companies="companies" :validations="v$.newCourse" :loading="modalLoading" @hide="resetCreationModal"
      @submit="createCourse([INTRA, INTER_B2B, INTRA_HOLDING])" :admin-user-options="adminUserOptions"
      :holding-options="holdingOptions" />
  </q-page>
</template>

<script>
import { computed, ref } from 'vue';
import { useMeta } from 'quasar';
import { useStore } from 'vuex';
import { onBeforeRouteLeave } from 'vue-router';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required, requiredIf, or } from '@vuelidate/validators';
import Companies from '@api/Companies';
import Holdings from '@api/Holdings';
import Programs from '@api/Programs';
import Users from '@api/Users';
import DirectoryHeader from '@components/DirectoryHeader';
import DateInput from '@components/form/DateInput';
import Select from '@components/form/Select';
import CompanySelect from '@components/form/CompanySelect';
import CourseCreationModal from 'src/modules/vendor/components/courses/CourseCreationModal';
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
    'company-select': CompanySelect,
    'course-creation-modal': CourseCreationModal,
    'ni-trello': Trello,
    'ni-date-input': DateInput,
  },
  setup () {
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
    });
    const companies = ref([]);
    const holdingOptions = ref([]);
    const programs = ref([]);
    const adminUserOptions = ref([]);
    const activeCourses = ref([]);
    const archivedCourses = ref([]);

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
    }));
    const v$ = useVuelidate(rules, { newCourse, selectedStartDate, selectedEndDate });

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
  beforeRouteEnter (_, from, next) {
    if (!['ni management blended courses info', 'ni users trainers info'].includes(from.name)) {
      store.dispatch('course/resetFilters', { isClientInterfaceOrTrainer: false });
    }

    next();
  },
};
</script>

<style lang="sass" scoped>
.checkboxes
  grid-gap: 12px 10px
</style>
