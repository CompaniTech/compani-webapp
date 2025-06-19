<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Formations individuelles" :display-search-bar="false" />
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select :options="holdingFilterOptions" :model-value="selectedHolding" clearable
        @update:model-value="updateSelectedHolding" />
      <company-select :options="companyFilterOptions" :company="selectedCompany" clearable
        @update="updateSelectedCompany" caption="" />
      <ni-select :options="trainerFilterOptions" :model-value="selectedTrainer" clearable
        @update:model-value="updateSelectedTrainer" />
      <ni-select :options="traineeFilterOptions" :model-value="selectedTrainee" clearable
        @update:model-value="updateSelectedTrainee" />
      <ni-select :options="programFilterOptions" :model-value="selectedProgram" clearable
        @update:model-value="updateSelectedProgram" />
      <ni-select :options="statusOptions" :model-value="selectedStatus" @update:model-value="updateSelectedStatus" />
    </div>
    <ni-table-list :data="courses" :columns="columns" v-model:pagination="pagination"
      :path="path">
      <template #body="{ col }">
        <q-item v-if="col.name === 'archived' && !!col.value" class="items-center">
          <q-icon size="12px" name="circle" class="info-archived" />
          Archivée
        </q-item>
        <q-item v-else-if="col.name === 'interrupted' && !!col.value" class="items-center">
          <q-icon size="12px" name="circle" class="info-warning" />
          En pause
        </q-item>
        <q-item v-else>{{ col.value }}</q-item>
      </template>
    </ni-table-list>
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter une formation"
      @click="openCourseCreationModal" />

    <course-creation-modal v-model="courseCreationModal" v-model:new-course="newCourse" :programs="programs"
      :validations="v$.newCourse" :loading="modalLoading" @hide="resetCreationModal"
      @submit="createCourse([SINGLE])" :admin-user-options="adminUserOptions"
      :trainee-options="traineeOptions" :course-types="SINGLE_TYPE" />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { computed, ref } from 'vue';
import TableList from '@components/table/TableList';
import DirectoryHeader from '@components/DirectoryHeader';
import {
  formatAndSortOptions,
  formatAndSortIdentityOptions,
  formatAndSortUserOptions,
  sortStrings,
  formatIdentity,
} from '@helpers/utils';
import { useStore } from 'vuex';
import { onBeforeRouteLeave } from 'vue-router';
import useVuelidate from '@vuelidate/core';
import { required, requiredIf, or } from '@vuelidate/validators';
import compact from 'lodash/compact';
import get from 'lodash/get';
import Holdings from '@api/Holdings';
import Programs from '@api/Programs';
import Users from '@api/Users';
import Select from '@components/form/Select';
import CompanySelect from '@components/form/CompanySelect';
import CourseCreationModal from 'src/modules/vendor/components/courses/CourseCreationModal';
import { useCourseCreation } from '@composables/courseCreation';
import { useCourseFilters } from '@composables/courseFilters';
import {
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  MONTHLY,
  SINGLE,
  ARCHIVED_COURSES,
  SINGLE_TYPE,
  WITHOUT_TRAINER,
  UNARCHIVED_COURSES,
  DD_MM_YYYY,
  INTERRUPTED_COURSES,
} from '@data/constants';
import { integerNumber, positiveNumber, strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import CompaniDate from '@helpers/dates/companiDates';
import { ascendingSort } from '@helpers/dates/utils';
import store from 'src/store/index';

export default {
  name: 'SingleCourseDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'company-select': CompanySelect,
    'ni-select': Select,
    'ni-table-list': TableList,
    'course-creation-modal': CourseCreationModal,
  },
  setup () {
    const $store = useStore();
    const metaInfo = { title: 'Kanban formations individuelles' };
    useMeta(metaInfo);

    const path = { name: 'ni management blended courses info', params: 'courseId' };

    const newCourse = ref({
      program: '',
      subProgram: '',
      misc: '',
      type: SINGLE,
      operationsRepresentative: '',
      estimatedStartDate: '',
      expectedBillsCount: '21',
      hasCertifyingTest: false,
      salesRepresentative: '',
      certificateGenerationMode: MONTHLY,
      trainee: '',
      prices: { global: '', trainerFees: '' },
    });
    const holdingOptions = ref([]);
    const programs = ref([]);
    const adminUserOptions = ref([]);
    const traineeOptions = ref([]);
    const companiesHoldings = ref([]);
    const activeCourses = ref([]);
    const archivedCourses = ref([]);

    const pagination = ref({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 15 });
    const columns = ref([
      {
        name: 'traineeName',
        label: 'Nom de l\'apprenant',
        field: row => row.trainees[0],
        format: value => formatIdentity(value.identity, 'FL'),
        align: 'left',
        sortable: true,
        style: 'width: 20%',
        sort: (a, b) => sortStrings(a.identity.lastname, b.identity.lastname),
      },
      {
        name: 'program',
        label: 'Programme',
        field: row => row.subProgram.program,
        format: value => value.name,
        align: 'left',
        sortable: true,
        style: 'width: 25%',
        sort: (a, b) => sortStrings(a.name, b.name),
      },
      {
        name: 'company',
        label: 'Structure',
        align: 'left',
        field: row => row.companies[0],
        format: value => value.name,
        sortable: true,
        style: 'width: 25%',
        sort: (a, b) => sortStrings(a.name, b.name),
      },
      {
        name: 'startDate',
        label: 'Date de début',
        align: 'left',
        field: row => row.startDate,
        sort: (a, b) => {
          if (!a && !b) return 0;
          if (!a) return 1;
          if (!b) return -1;
          return ascendingSort(CompaniDate(a, DD_MM_YYYY), CompaniDate(b, DD_MM_YYYY));
        },
        sortable: true,
        style: 'width: 15%',
      },
      { name: 'archived', label: '', align: 'right', field: 'archivedAt' },
      { name: 'interrupted', label: '', align: 'right', field: 'interruptedAt' },
    ]);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const rules = computed(() => ({
      newCourse: {
        program: { required },
        subProgram: { required },
        type: { required },
        operationsRepresentative: { required },
        certificateGenerationMode: { required },
        trainee: { required },
        expectedBillsCount: { required, positiveNumber, integerNumber },
        prices: {
          global: {
            strictPositiveNumber: or(strictPositiveNumber, value => value === ''),
            required: requiredIf(get(newCourse.value, 'prices.trainerFees')),
          },
          trainerFees: { strictPositiveNumber: or(strictPositiveNumber, value => value === '') },
        },
      },
    }));
    const v$ = useVuelidate(rules, { newCourse });

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

    const refreshHoldings = async () => {
      try {
        const holdings = await Holdings.list();
        companiesHoldings.value = holdings
          .flatMap(h => h.companies.map(c => ({ [c]: h._id })))
          .reduce((acc, obj) => ({ ...acc, ...obj }), {});
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

    const refreshTrainees = async () => {
      try {
        const trainees = await Users.list({ withCompanyUsers: true });
        traineeOptions.value = formatAndSortUserOptions(trainees, true);
      } catch (e) {
        console.error(e);
        traineeOptions.value = [];
      }
    };

    const openCourseCreationModal = async () => {
      newCourse.value = { ...newCourse.value, operationsRepresentative: loggedUser.value._id };
      courseCreationModal.value = true;

      if (!traineeOptions.value.length) await refreshTrainees();
    };

    const resetCreationModal = () => {
      v$.value.newCourse.$reset();
      newCourse.value = {
        program: '',
        subProgram: '',
        misc: '',
        type: SINGLE,
        operationsRepresentative: '',
        estimatedStartDate: '',
        expectedBillsCount: '21',
        hasCertifyingTest: false,
        salesRepresentative: '',
        certificateGenerationMode: MONTHLY,
        trainee: '',
        prices: { global: '', trainerFees: '' },
      };
    };

    const courses = computed(() => [...activeCourses.value, ...archivedCourses.value]
      .filter(isDisplayed)
      .map((c) => {
        let startDate = '';
        if (c.slots.length) startDate = CompaniDate(c.slots[0].startDate).format(DD_MM_YYYY);
        if (c.estimatedStartDate) startDate = CompaniDate(c.estimatedStartDate).format(DD_MM_YYYY);
        return { ...c, startDate };
      }));

    const {
      selectedHolding,
      holdingFilterOptions,
      selectedCompany,
      companyFilterOptions,
      selectedTrainer,
      trainerFilterOptions,
      selectedTrainee,
      traineeFilterOptions,
      selectedProgram,
      programFilterOptions,
      statusOptions,
      selectedStatus,
      updateSelectedHolding,
      updateSelectedCompany,
      updateSelectedTrainer,
      updateSelectedTrainee,
      updateSelectedProgram,
      updateSelectedStatus,
      resetFilters,
    } = useCourseFilters(activeCourses, archivedCourses, holdingOptions, SINGLE_TYPE);

    const isDisplayed = (course) => {
      if (selectedProgram.value && course.subProgram.program._id !== selectedProgram.value) return false;
      if (selectedTrainer.value) {
        const courseTrainerIds = course.trainers ? course.trainers.map(trainer => trainer._id) : [];

        if (selectedTrainer.value === WITHOUT_TRAINER && courseTrainerIds.length) return false;
        if (selectedTrainer.value !== WITHOUT_TRAINER && !courseTrainerIds.includes(selectedTrainer.value)) {
          return false;
        }
      }
      if (selectedTrainee.value && course.trainees[0]._id !== selectedTrainee.value) return false;
      const companiesIds = course.companies.map(company => company._id);
      if (selectedCompany.value && !companiesIds.includes(selectedCompany.value)) return false;

      const holdingId = get(course, 'holding._id');
      const holdingsLinkedToCourse = compact(
        [...new Set(companiesIds.map(companyId => companiesHoldings.value[companyId]))]
      );
      if (selectedHolding.value && holdingId !== selectedHolding.value &&
          !holdingsLinkedToCourse.includes(selectedHolding.value)) {
        return false;
      }
      if (selectedStatus.value === UNARCHIVED_COURSES && course.archivedAt) return false;

      if (selectedStatus.value === ARCHIVED_COURSES && !course.archivedAt) return false;

      if (selectedStatus.value === INTERRUPTED_COURSES && !course.interruptedAt) return false;

      return true;
    };

    onBeforeRouteLeave((to) => {
      if (to.name !== 'ni management blended courses info') {
        resetFilters();
      }
    });

    /* MAIN */
    const created = async () => {
      await Promise.all([
        refreshActiveCourses([SINGLE]),
        refreshArchivedCourses([SINGLE]),
        refreshPrograms(),
        refreshHoldings(),
        refreshAdminUsers(),
      ]);
    };

    created();

    return {
      // Validation
      v$,
      // Data
      SINGLE_TYPE,
      SINGLE,
      path,
      pagination,
      columns,
      courseCreationModal,
      modalLoading,
      newCourse,
      programs,
      adminUserOptions,
      statusOptions,
      traineeOptions,
      // Computed
      selectedHolding,
      holdingFilterOptions,
      selectedCompany,
      companyFilterOptions,
      selectedTrainer,
      trainerFilterOptions,
      selectedTrainee,
      traineeFilterOptions,
      selectedProgram,
      programFilterOptions,
      selectedStatus,
      courses,
      // Methods
      openCourseCreationModal,
      resetCreationModal,
      createCourse,
      updateSelectedHolding,
      updateSelectedCompany,
      updateSelectedTrainer,
      updateSelectedTrainee,
      updateSelectedProgram,
      updateSelectedStatus,
      resetFilters,
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
