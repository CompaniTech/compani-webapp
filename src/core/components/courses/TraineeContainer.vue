<template>
  <div>
    <div class="q-mb-xl">
      <div class="row">
        <p class="text-weight-bold table-title">{{ tableTitle }}</p>
      </div>
      <div class="row" v-if="isIntraCourse || isIntraHoldingCourse">
        <ni-input v-if="isRofOrAdmin && !isClientInterface" caption="Nombre max de stagiaires" :disable="isArchived"
          :model-value="maxTrainees" @update:model-value="inputTmpMaxTrainees($event)"
          :error="validations.maxTrainees.$error" :error-message="maxTraineesErrorMessage" @blur="updateMaxTrainees" />
        <div v-else class="q-mb-sm">{{ maxTrainees }} stagiaires max</div>
      </div>
      <q-card>
        <div v-if="!hasLinkedCompanies" class="text-center text-italic no-data">
          Aucune structure n'est rattachée à cette formation
        </div>
        <template v-else-if="displayCompanyNames">
          <ni-trainee-table />
          <ni-expanding-table :data="course.companies" table-class="q-pb-md"
            :columns="companyColumns" :visible-columns="companyVisibleColumns" hide-header :expanded="courseCompanyIds"
            separator="none" hide-bottom :loading="loading" v-model:pagination="companyPagination">
            <template #row="{ props }">
              <div class="company-name-container">
                <q-td v-for="col in props.cols" :key="col.name" :props="props" :class="[col.class, 'company']">
                  <template v-if="col.name === 'company'">
                    <div v-if="canAccessCompany" @click="$event.stopPropagation()">
                      <router-link :to="goToCompany(props.row)">{{ col.value }}</router-link>
                    </div>
                    <div v-else>{{ col.value }}</div>
                  </template>
                  <template v-else-if="col.name === 'actions'">
                    <ni-button v-if="canUpdateCompanies && !traineesGroupedByCompanies[props.row._id]"
                      icon="close" @click="validateCompanyDeletion(col.value)" :disable="!!course.archivedAt" />
                  </template>
                </q-td>
            </div>
            </template>
            <template #expanding-row="{ props }">
              <ni-trainee-table v-if="!!traineesGroupedByCompanies[props.row._id]"
                :trainees="traineesGroupedByCompanies[props.row._id]" @refresh="refresh" hide-header />
              <div class="text-center text-italic no-data" v-else>
                Aucun(e) apprenant(e) de cette structure n'a été ajouté(e)
              </div>
            </template>
          </ni-expanding-table>
        </template>
        <ni-trainee-table v-else :trainees="course.trainees" @refresh="refresh" :loading="loading"
          table-class="q-pb-md" />
        <q-card-actions v-if="canUpdateTrainees" align="right" class="q-pa-sm">
          <ni-button v-if="canUpdateUploadCsv" color="primary" icon="upload" label="Ajouter une liste d'apprenants"
            :disable="loading" @click="openCsvUploadModal" />
          <ni-button v-if="canUpdateCompanies" color="primary" icon="add" label="Rattacher une structure"
            :disable="loading" @click="openCompanyAdditionModal" />
          <ni-button v-if="course.companies.length && course.type !== SINGLE" color="primary" icon="add"
            label="Ajouter une personne" :disable="loading" @click="openTraineeCreationModal" />
          <ni-button v-if="displayCertificationEdition" color="primary" icon="edit" label="Modifier les certifications"
            :disable="loading" @click="openCertificationsUpdateModal" />
        </q-card-actions>
      </q-card>
    </div>

    <user-addition-modal v-model="traineeAdditionModal" v-model:new-user-registration="newTraineeRegistration"
      @submit="addTrainee" :validations="traineeRegistrationValidation.newTraineeRegistration"
      :loading="traineeModalLoading" @hide="resetTraineeAdditionForm" :users-options="traineesOptions"
      @open-user-creation-modal="openLearnerCreationModal" :users-company-options="traineesCompanyOptions"
      :display-company-select="!isIntraCourse" display-no-options-slot label="Stagiaire"
      :display-is-certified="course.hasCertifyingTest && canUpdateCertifyingTest" />

    <learner-creation-modal v-model="learnerCreationModal" v-model:new-user="newLearner"
      @hide="resetLearnerCreationModal" :first-step="firstStep" @next-step="nextStepLearnerCreationModal"
      :company-options="companyOptions" :disable-company="isIntraCourse" :learner-edition="learnerAlreadyExists"
      :validations="learnerValidation.newLearner" :loading="learnerCreationModalLoading"
      @submit="submitLearnerCreationModal" :disable-user-info="disableUserInfoEdition" />

    <company-addition-modal v-model="companyAdditionModal" v-model:selected-company="selectedCompany"
      @submit="addCompany" :validations="companyValidation.selectedCompany" :loading="companyModalLoading"
      @hide="resetCompanyAdditionModal" :company-options="selectCompanyOptions" />

    <certifications-update-modal v-model="certificationsUpdateModal" @hide="resetCertificationUpdateModal"
      v-model:certified-trainees="editedCertifications" :trainee-options="traineeOptions"
      :loading="certificationUpdateLoading" @submit="updateCertifications" />

    <upload-csv-modal v-model="csvUploadModal" @hide="resetCsvUploadModal" @submit="uploadCsv" v-model:csv="csv"
      :loading="csvLoading" :validations="csvValidations.csv" :constraints="constraints" />
  </div>
</template>

<script>
import { subject } from '@casl/ability';
import { computed, ref, toRefs } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import pick from 'lodash/pick';
import groupBy from 'lodash/groupBy';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import Courses from '@api/Courses';
import { TRAINER, INTRA, SINGLE } from '@data/constants';
import { defineAbilitiesForCourse } from '@helpers/ability';
import {
  formatAndSortUserOptions,
  formatAndSortIdentityOptions,
  formatAndSortCompanyOptions,
} from '@helpers/utils';
import { getCurrentAndFutureCompanies } from '@helpers/userCompanies';
import Button from '@components/Button';
import Input from '@components/form/Input';
import UserAdditionModal from '@components/courses/UserAdditionModal';
import LearnerCreationModal from '@components/courses/LearnerCreationModal';
import TraineeTable from '@components/courses/TraineeTable';
import ExpandingTable from '@components/table/ExpandingTable';
import CompanyAdditionModal from '@components/courses/CompanyAdditionModal';
import UploadCsvModal from '@components/courses/UploadCsvModal';
import CertificationsUpdateModal from '@components/courses/CertificationsUpdateModal';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { useLearnersCreation } from '@composables/learnersCreation';
import { useCourses } from '@composables/courses';
import { useCompaniesCoursesLink } from '@composables/companiesCoursesLink';

export default {
  name: 'TraineeContainer',
  props: {
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    maxTrainees: { type: [Number, String], default: '' },
    potentialTrainees: { type: Array, default: () => [] },
  },
  components: {
    'ni-button': Button,
    'ni-input': Input,
    'ni-trainee-table': TraineeTable,
    'user-addition-modal': UserAdditionModal,
    'learner-creation-modal': LearnerCreationModal,
    'ni-expanding-table': ExpandingTable,
    'company-addition-modal': CompanyAdditionModal,
    'certifications-update-modal': CertificationsUpdateModal,
    'upload-csv-modal': UploadCsvModal,
  },
  emits: ['refresh', 'update', 'update:maxTrainees'],
  setup (props, { emit }) {
    const { validations, potentialTrainees } = toRefs(props);

    const $store = useStore();

    const editedCertifications = ref([]);
    const certificationsUpdateModal = ref(false);
    const certificationUpdateLoading = ref(false);
    const csvUploadModal = ref(false);
    const csvLoading = ref(false);

    const canUpdateTrainees = ref(false);
    const canUpdateCompanies = ref(false);
    const canAccessCompany = ref(false);
    const canAccessEveryTrainee = ref(false);
    const canUpdateCertifyingTest = ref(false);
    const canUpdateUploadCsv = ref(false);

    const traineeOptions = computed(() => formatAndSortIdentityOptions(course.value.trainees));

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const course = computed(() => $store.state.course.course);

    const csv = ref(null);
    const constraints = `
      <ul class="text-14">
        <li>Les champs <span class="text-weight-bold">firstname</span>, <span class="text-weight-bold">lastname</span>
          et <span class="text-weight-bold">company</span> sont obligatoires.</li>
        <li>Les autres champs sont optionnels.
        <li>Assurez-vous de rentrer un format d'email, d'indicatif téléphonique (+33) ou de téléphone (10 chiffres)
          valide.</li>
        <li>Si vous ne connaissez pas l'email d'un apprenant, pensez à remplir le champ <span class="text-weight-bold">
          suffix</span> (@xxx.xx).</li>
      </ul>
    `;

    const traineeModalLoading = ref(false);

    const csvUploadRules = computed(() => ({
      csv: { required },
    }));

    const v$ = useVuelidate(csvUploadRules, { csv });

    const companyColumns = computed(() => [
      {
        name: 'company',
        label: 'Structure',
        align: 'left',
        classes: canAccessCompany.value ? 'clickable-name cursor-pointer' : 'company-name',
        field: row => get(row, 'name') || '',
      },
      { name: 'actions', label: '', align: 'right', field: '_id' },
    ]);

    const companyPagination = ref({ rowsPerPage: 0, sortBy: 'company' });

    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    const isTrainer = ref(vendorRole.value === TRAINER);

    const traineesNumber = computed(() => (course.value.trainees ? course.value.trainees.length : 0));

    const tableTitle = computed(() => (canAccessEveryTrainee.value || isTrainer.value
      ? `Stagiaires (${traineesNumber.value})`
      : `Stagiaires de votre structure (${traineesNumber.value})`));

    const traineesOptions = computed(() => formatAndSortUserOptions(potentialTrainees.value, !isIntraCourse.value));

    const maxTraineesErrorMessage = computed(() => {
      if (get(validations.value, 'maxTrainees.strictPositiveNumber.$response') === false ||
        get(validations.value, 'maxTrainees.integerNumber.$response') === false) {
        return 'Nombre non valide';
      }
      return '';
    });

    const companyOptions = computed(() => formatAndSortCompanyOptions(course.value.companies));

    const traineesGroupedByCompanies = computed(() => groupBy(course.value.trainees, t => t.registrationCompany));

    const companyVisibleColumns = computed(() => (canUpdateCompanies.value ? ['company', 'actions'] : ['company']));

    const courseCompanyIds = computed(() => course.value.companies.map(c => c._id));

    const hasLinkedCompanies = computed(() => !!course.value.companies.length);

    const traineesCompanyOptions = computed(() => {
      const options = {};
      for (let i = 0; i < potentialTrainees.value.length; i++) {
        const currentAndFutureCompanyList = getCurrentAndFutureCompanies(potentialTrainees.value[i].userCompanyList);
        options[potentialTrainees.value[i]._id] = formatAndSortCompanyOptions(
          currentAndFutureCompanyList.filter(company => courseCompanyIds.value.includes(company._id))
        );
      }
      return options;
    });

    const displayCompanyNames =
      computed(() => !(isIntraCourse.value || isSingleCourse.value) &&
        (!isClientInterface || !!loggedUser.value.role.holding));

    const displayCertificationEdition =
      computed(() => course.value.hasCertifyingTest && canUpdateCertifyingTest.value && course.value.trainees.length);

    const refresh = () => emit('refresh');

    const { isIntraCourse, isSingleCourse, isClientInterface, isArchived, isIntraHoldingCourse } = useCourses(course);

    const {
      newLearner,
      newTraineeRegistration,
      traineeAdditionModal,
      learnerCreationModal,
      learnerCreationModalLoading,
      firstStep,
      learnerAlreadyExists,
      isRofOrAdmin,
      learnerValidation,
      traineeRegistrationValidation,
      nextStepLearnerCreationModal,
      submitLearnerCreationModal,
      resetLearnerCreationModal,
      tableLoading,
      disableUserInfoEdition,
    } = useLearnersCreation(refresh, isClientInterface, false, courseCompanyIds, !isIntraCourse.value);

    const {
      selectedCompany,
      companyAdditionModal,
      companyValidation,
      companyModalLoading,
      resetCompanyAdditionModal,
      openCompanyAdditionModal,
      addCompany,
      selectCompanyOptions,
      validateCompanyDeletion,
      getPotentialCompanies,
    } = useCompaniesCoursesLink(course, emit);

    const defineCourseAbilities = () => {
      const ability = defineAbilitiesForCourse(pick(loggedUser.value, ['role']));

      canUpdateTrainees.value = ability.can('update', subject('Course', course.value), 'trainees');
      canUpdateCompanies.value = ability.can('update', subject('Course', course.value), 'companies');
      canAccessCompany.value = ability.can('read', subject('Course', course.value), 'companies');
      canAccessEveryTrainee.value = ability.can('read', subject('Course', course.value), 'all_trainees');
      canUpdateCertifyingTest.value = ability.can('update', subject('Course', course.value), 'certifying_test');
      canUpdateUploadCsv.value = ability.can('set', subject('Course', course.value), 'learner_list');
    };

    const resetTraineeAdditionForm = () => {
      newTraineeRegistration.value = {
        user: '',
        ...(!isIntraCourse.value && { company: '' }),
        isCertified: false,
      };
      traineeRegistrationValidation.value.newTraineeRegistration.$reset();
    };

    const addTrainee = async () => {
      try {
        traineeModalLoading.value = true;
        traineeRegistrationValidation.value.newTraineeRegistration.$touch();
        if (traineeRegistrationValidation.value.newTraineeRegistration.$error) {
          return NotifyWarning('Champ(s) invalide(s)');
        }

        const payload = {
          trainee: newTraineeRegistration.value.user,
          ...(!isIntraCourse.value && { company: newTraineeRegistration.value.company }),
          ...(newTraineeRegistration.value.isCertified && { isCertified: true }),
        };
        await Courses.addTrainee(course.value._id, payload);

        traineeAdditionModal.value = false;
        refresh();
        NotifyPositive('Stagiaire ajouté(e).');
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        if (e.status === 403) return NotifyWarning(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout du/de la stagiaire.');
      } finally {
        traineeModalLoading.value = false;
      }
    };
    const openTraineeCreationModal = () => {
      if (course.value.archivedAt) {
        return NotifyWarning('Vous ne pouvez pas ajouter de stagiaire à une formation archivée.');
      }

      traineeAdditionModal.value = true;
    };
    const openLearnerCreationModal = async () => {
      traineeAdditionModal.value = false;
      learnerCreationModal.value = true;
    };

    const openCertificationsUpdateModal = () => {
      if (course.value.archivedAt) {
        return NotifyWarning('Vous ne pouvez pas modifier les certifications d’une formation archivée.');
      }
      editedCertifications.value = course.value.certifiedTrainees;
      certificationsUpdateModal.value = true;
    };

    const resetCertificationUpdateModal = () => {
      editedCertifications.value = [];
    };

    const updateCertifications = async () => {
      try {
        certificationUpdateLoading.value = true;

        await Courses.update(course.value._id, { certifiedTrainees: editedCertifications.value });

        certificationsUpdateModal.value = false;
        refresh();
        NotifyPositive('Certifications modifiées.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification des certifications.');
      } finally {
        certificationUpdateLoading.value = false;
      }
    };

    const updateMaxTrainees = () => emit('update');

    const inputTmpMaxTrainees = event => emit('update:maxTrainees', event);

    const goToCompany = row => ({
      name: 'ni users companies info', params: { companyId: row._id }, query: { defaultTab: 'infos' },
    });

    const openCsvUploadModal = () => {
      csvUploadModal.value = true;
    };

    const resetCsvUploadModal = () => {
      v$.value.csv.$reset();
      csv.value = null;
    };

    const uploadCsv = async () => {
      try {
        v$.value.csv.$touch();
        if (v$.value.csv.$error) return NotifyWarning('Champ(s) invalide(s)');
        csvLoading.value = true;
        const form = new FormData();
        form.append('file', csv.value);
        await Courses.uploadCsv(course.value._id, form);

        csvUploadModal.value = false;
        NotifyPositive('Liste d\'apprenants ajoutée.');
        refresh();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'ajout des apprenants.');
      } finally {
        csvLoading.value = false;
      }
    };

    const created = async () => {
      defineCourseAbilities();
      if (![INTRA, SINGLE].includes(course.value.type) && canUpdateCompanies.value) await getPotentialCompanies();
    };

    created();

    return {
      // Data
      SINGLE,
      newLearner,
      firstStep,
      learnerCreationModalLoading,
      learnerCreationModal,
      learnerAlreadyExists,
      traineeAdditionModal,
      newTraineeRegistration,
      traineeModalLoading,
      companyOptions,
      companyColumns,
      companyVisibleColumns,
      companyAdditionModal,
      selectedCompany,
      selectCompanyOptions,
      companyModalLoading,
      companyPagination,
      disableUserInfoEdition,
      canUpdateCompanies,
      canAccessCompany,
      canUpdateTrainees,
      canUpdateCertifyingTest,
      canUpdateUploadCsv,
      editedCertifications,
      certificationsUpdateModal,
      certificationUpdateLoading,
      csv,
      csvUploadModal,
      csvLoading,
      constraints,
      // Validations
      learnerValidation,
      traineeRegistrationValidation,
      companyValidation,
      tableLoading,
      // Computed
      tableTitle,
      traineesOptions,
      course,
      isIntraCourse,
      isIntraHoldingCourse,
      isClientInterface,
      isArchived,
      isRofOrAdmin,
      maxTraineesErrorMessage,
      traineesGroupedByCompanies,
      courseCompanyIds,
      hasLinkedCompanies,
      traineesCompanyOptions,
      displayCompanyNames,
      displayCertificationEdition,
      traineeOptions,
      // Methods
      nextStepLearnerCreationModal,
      submitLearnerCreationModal,
      resetLearnerCreationModal,
      resetTraineeAdditionForm,
      addTrainee,
      openTraineeCreationModal,
      openLearnerCreationModal,
      updateMaxTrainees,
      inputTmpMaxTrainees,
      refresh,
      goToCompany,
      openCompanyAdditionModal,
      addCompany,
      resetCompanyAdditionModal,
      validateCompanyDeletion,
      openCertificationsUpdateModal,
      resetCertificationUpdateModal,
      updateCertifications,
      resetCsvUploadModal,
      uploadCsv,
      openCsvUploadModal,
      // Validations
      csvValidations: v$,
    };
  },
};
</script>

<style lang="sass" scoped>
.table-title
  flex: 1
.company-name-container
  padding: 0px 24px
.company-name
  color: $primary
  width: fit-content
  cursor: default
.company
  border-top: 1px solid $copper-grey-200
  width: 100vw
  padding-top: 8px
.no-data
  font-size: 13px
  padding: 12px
.q-table
  & tbody
    & td
      height: 25px
</style>
