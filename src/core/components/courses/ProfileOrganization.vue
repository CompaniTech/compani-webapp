<template>
  <div v-if="course">
    <div class="profile-container q-mb-xl">
      <ni-bi-color-button v-if="canReadHistory" class="button-history" icon="history" label="Historique"
        @click="toggleHistory" />
      <div v-if="isIntraOrIntraHoldingOrVendor" class="row gutter-profile">
        <ni-input caption="Informations complémentaires" v-model.trim="tmpCourse.misc"
          @blur="updateCourse('misc')" :disable="isArchived" />
        <q-checkbox v-if="canUpdateCertifyingTest" v-model="tmpCourse.hasCertifyingTest" class="certifying-checkbox"
          label="La formation est certifiante" @update:model-value="updateCourse('hasCertifyingTest')"
          :disable="!!get(course, 'certifiedTrainees.length') || isArchived" />
      </div>
      <div class="row justify-between align-center q-mt-md">
        <p class="text-weight-bold">Interlocuteurs</p>
        <ni-secondary-button v-if="canUpdateInterlocutor" icon="edit" class="q-mb-lg"
          label="Modifier le contact pour la formation" @click="openContactAdditionModal" />
      </div>
      <div v-if="isClientInterface" class="text-italic text-copper-grey-500 q-mb-md">
        Des questions sur votre parcours de formation ou sur la facturation ? Retrouvez vos contacts Compani sur
        <a class="clickable-name cursor-pointer" @click="goToContactProfile">la page dédiée</a> .
      </div>
      <div class="interlocutor-container">
        <interlocutor-cell :interlocutor="course.operationsRepresentative" caption="Chargé des opérations"
          :can-update="canUpdateInterlocutor" :contact="course.contact" :disable="isArchived"
          @open-modal="openOperationsRepresentativeModal" />
        <interlocutor-cell :interlocutor="course.companyRepresentative" caption="Chargé de formation structure"
          :contact="course.contact" :can-update="canUpdateCompanyRepresentative" :disable="isArchived"
          label="Ajouter un chargé de formation structure" @open-modal="openCompanyRepresentativeModal" />
        <interlocutor-cell v-if="canReadAndUpdateSalesRepresentative" :interlocutor="course.salesRepresentative"
          caption="Chargé d'accompagnement" can-update label="Ajouter un chargé d'accompagnement"
          @open-modal="openSalesRepresentativeModal" clearable :disable="isArchived" />
      </div>
      <p class="text-weight-bold table-title q-mt-xl">Intervenants</p>
      <p v-if="!get(course, 'trainers', []).some(t => t._id)" class="text-italic q-mb-lg">
        Aucun intervenant n'est défini pour cette formation.
      </p>
      <div class="interlocutor-container">
        <interlocutor-cell v-for="trainer in course.trainers" :key="trainer._id" :interlocutor="trainer"
          caption="Intervenant" :contact="course.contact" :can-update="canUpdateInterlocutor"
          :disable="isArchived" clearable interlocutor-is-trainer-or-tutor @open-modal="openTrainerModal" />
        <ni-secondary-button v-if="canUpdateInterlocutor" class="button-trainer" label="Ajouter un intervenant"
          @click="() => openTrainerModal({ action: CREATION })" />
      </div>
      <div v-if="isSingleCourse">
        <p class="text-weight-bold table-title q-mt-xl">Tuteurs</p>
        <p v-if="!get(course, 'tutors', []).some(t => t._id)" class="text-italic q-mb-lg">
          Aucun tuteur n'est défini pour cette formation.
        </p>
        <div class="interlocutor-container">
          <interlocutor-cell v-for="tutor in course.tutors" :key="tutor._id" :interlocutor="tutor" caption="Tuteur"
            :can-update="canUpdateInterlocutor" :disable="isArchived" interlocutor-is-trainer-or-tutor clearable
            @open-modal="openTutorModal" />
          <ni-secondary-button v-if="canUpdateInterlocutor" class="button-trainer" label="Ajouter un tuteur"
            @click="() => openTutorModal({ action: CREATION })" />
        </div>
      </div>
    </div>
    <ni-slot-container :can-edit="canEditSlots" :loading="courseLoading" @refresh="refreshCourse"
      :is-rof-or-vendor-admin="isRofOrVendorAdmin" @update="updateCourse('estimatedStartDate')"
      v-model:estimated-start-date="tmpCourse.estimatedStartDate" />
    <ni-trainee-container :loading="courseLoading" @refresh="refreshTraineeTable" @update="updateCourse('maxTrainees')"
      :validations="v$.tmpCourse" :potential-trainees="potentialTrainees"
      v-model:max-trainees="tmpCourse.maxTrainees" />
    <q-page-sticky class="container-history" expand position="right">
      <course-history-feed v-if="displayHistory" @toggle-history="toggleHistory" :course-histories="courseHistories"
        @load="updateCourseHistories" ref="courseHistoryFeed" />
    </q-page-sticky>
    <div v-if="canUpdateSMS">
      <div class="q-mb-xl">
        <p class="text-weight-bold">Contacter les stagiaires</p>
        <ni-banner v-if="missingTraineesPhone.length" icon="info_outline">
          <template #message>
            Il manque le numéro de téléphone de {{ formatQuantity('stagiaire', missingTraineesPhone.length) }} sur
            {{ course.trainees.length }} : {{ missingTraineesPhone.join(', ') }}.
          </template>
        </ni-banner>
        <div class="row">
          <ni-banner v-if="!!smsMissingInfo.length">
            <template #message>
              Il manque {{ formatQuantity('information', smsMissingInfo.length ) }}
              pour envoyer des SMS : {{ smsMissingInfo.join(', ') }}.
            </template>
          </ni-banner>
          <ni-bi-color-button icon="mdi-cellphone-message" :disable="disableSms" @click="openHistoryModal"
            label="Envoyer un SMS aux stagiaires" size="16px" />
          <ni-button color="primary" :disable="!smsHistoryList.length" icon="history" label="Historique d'envoi"
            @click="smsHistoriesModal = true" />
        </div>
        <ni-bi-color-button class="q-my-sm" icon="content_copy" label="Copier les adresses e-mail" @click="copy"
          size="16px" :disable="!traineesEmails" />
      </div>
    </div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Documents utiles</p>
      <div class="q-mb-sm">
        <ni-banner v-if="followUpDisabled">
          <template #message>
            Il manque {{ formatQuantity('information', followUpMissingInfo.length ) }}
            pour assurer le suivi de la formation : {{ followUpMissingInfo.join(', ') }}.
          </template>
        </ni-banner>
        <ni-course-info-link :disable-link="disableDocDownload" @download="downloadConvocation" />
      </div>
      <div v-if="isIntraOrIntraHoldingOrVendor">
        <ni-bi-color-button icon="file_download" label="Feuilles d'émargement vierges"
          :disable="disableDocDownload || isArchived" @click="downloadAttendanceSheet" size="16px" />
      </div>
    </div>
    <training-contract-container v-if="canGetTrainingContracts" :course="course" :has-holding-role="hasHoldingRole"
      :is-rof-or-vendor-admin="isRofOrVendorAdmin" :training-contracts="trainingContracts"
      :training-contract-table-loading="trainingContractTableLoading" @refresh="refreshTrainingContracts" />

    <sms-sending-modal v-model="smsModal" :filtered-message-type-options="filteredMessageTypeOptions" :loading="loading"
      v-model:new-sms="newSms" @send="sendMessage" @update-type="updateMessage" :error="v$.newSms"
      @hide="resetSmsModal" />

    <sms-history-modal v-model="smsHistoriesModal" :sms-history-list="smsHistoryList" :send-sms="sendSms"
      :message-type-options="messageTypeOptions" @submit="openSmsModal" @hide="sendSms = false" />

    <interlocutor-modal v-model="operationsRepresentativeEditionModal" v-model:interlocutor="tmpInterlocutorId"
      @submit="updateInterlocutor(OPERATIONS_REPRESENTATIVE)" :validations="v$.operationsRepresentative"
      :loading="interlocutorModalLoading" @hide="resetInterlocutor(OPERATIONS_REPRESENTATIVE)"
      :interlocutors-options="adminUserOptions" :label="interlocutorLabel" />

    <interlocutor-modal v-model="trainerModal" v-model:interlocutor="tmpInterlocutorId"
      @hide="resetInterlocutor(TRAINER)" @submit="addTrainer()" :loading="interlocutorModalLoading"
      :label="interlocutorLabel" :validations="v$.trainer" :interlocutors-options="trainerOptions" />

    <interlocutor-modal v-model="companyRepresentativeModal" v-model:interlocutor="tmpInterlocutorId"
      @submit="updateInterlocutor(COMPANY_REPRESENTATIVE)" :validations="v$.companyRepresentative"
      :loading="interlocutorModalLoading" @hide="resetInterlocutor(COMPANY_REPRESENTATIVE)" :label="interlocutorLabel"
      :interlocutors-options="companyRepresentativeOptions" />

    <interlocutor-modal v-model="salesRepresentativeModal" v-model:interlocutor="tmpInterlocutorId"
      @submit="updateInterlocutor(SALES_REPRESENTATIVE)" :loading="interlocutorModalLoading" @hide="resetInterlocutor"
      :interlocutors-options="adminUserOptions" :label="interlocutorLabel" clearable />

    <contact-addition-modal v-model="contactAdditionModal" v-model:contact="tmpContactId"
      @submit="updateContact" :validations="v$.tmpContactId" :loading="contactModalLoading"
      @hide="resetContactAddition" :contact-options="contactOptions" />

    <interlocutor-modal v-model="tutorModal" v-model:interlocutor="tmpInterlocutorId" :validations="v$.tutor"
      @submit="validateTutorAddition" :loading="interlocutorModalLoading" @hide="resetInterlocutor(TUTOR)"
      :label="interlocutorLabel" :interlocutors-options="traineesOptions" display-no-options-slot
      @open-user-creation-modal="openLearnerCreationModal" />

    <learner-creation-modal v-model="learnerCreationModal" v-model:new-user="newLearner" :first-step="firstStep"
      @hide="resetLearnerCreationModal" @next-step="nextStepLearnerCreationModal" :company-options="companyOptions"
      :learner-edition="learnerAlreadyExists" :validations="learnerValidation.newLearner"
      :loading="learnerCreationModalLoading" @submit="submitLearnerCreationModal" />
  </div>
</template>

<script>
import { subject } from '@casl/ability';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { computed, ref, toRefs, watch, useTemplateRef } from 'vue';
import { useQuasar, copyToClipboard } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import get from 'lodash/get';
import pick from 'lodash/pick';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import Users from '@api/Users';
import CourseHistories from '@api/CourseHistories';
import Roles from '@api/Roles';
import Courses from '@api/Courses';
import TrainingContracts from '@api/TrainingContracts';
import Input from '@components/form/Input';
import Button from '@components/Button';
import SlotContainer from '@components/courses/SlotContainer';
import TraineeContainer from '@components/courses/TraineeContainer';
import CourseInfoLink from '@components/courses/CourseInfoLink';
import CourseHistoryFeed from '@components/courses/CourseHistoryFeed';
import SmsSendingModal from '@components/courses/SmsSendingModal';
import CourseSmsHistoryModal from '@components/courses/CourseSmsHistoryModal';
import InterlocutorCell from '@components/courses/InterlocutorCell';
import TrainingContractContainer from '@components/courses/TrainingContractContainer';
import InterlocutorModal from '@components/courses/InterlocutorModal';
import CourseContactAdditionModal from '@components/courses/CourseContactAdditionModal';
import Banner from '@components/Banner';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import BiColorButton from '@components/BiColorButton';
import SecondaryButton from '@components/SecondaryButton';
import LearnerCreationModal from '@components/courses/LearnerCreationModal';
import {
  INTER_B2B,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
  CONVOCATION,
  REMINDER,
  OTHER,
  COACH,
  CLIENT_ADMIN,
  INTRA,
  DEFAULT_AVATAR,
  DD_MM,
  HH_MM,
  COURSE,
  EDITION,
  HOLDING_ADMIN,
  INTRA_HOLDING,
  DELETION,
  CREATION,
  TUTOR,
  SINGLE,
} from '@data/constants';
import { defineAbilitiesForCourse } from '@helpers/ability';
import { composeCourseName } from '@helpers/courses';
import {
  formatQuantity,
  formatIdentity,
  formatDownloadName,
  formatAndSortUserOptions,
  formatAndSortCompanyOptions,
} from '@helpers/utils';
import { downloadFile } from '@helpers/file';
import CompaniDate from '@helpers/dates/companiDates';
import { descendingSortBy, ascendingSortBy } from '@helpers/dates/utils';
import { strictPositiveNumber, integerNumber } from '@helpers/vuelidateCustomVal';
import { useCourses } from '@composables/courses';
import { useLearnersCreation } from '@composables/learnersCreation';

export default {
  name: 'ProfileOrganization',
  props: {
    profileId: { type: String, required: true },
  },
  components: {
    'ni-input': Input,
    'ni-slot-container': SlotContainer,
    'ni-trainee-container': TraineeContainer,
    'ni-course-info-link': CourseInfoLink,
    'ni-banner': Banner,
    'course-history-feed': CourseHistoryFeed,
    'ni-bi-color-button': BiColorButton,
    'sms-sending-modal': SmsSendingModal,
    'sms-history-modal': CourseSmsHistoryModal,
    'ni-button': Button,
    'ni-secondary-button': SecondaryButton,
    'interlocutor-cell': InterlocutorCell,
    'interlocutor-modal': InterlocutorModal,
    'contact-addition-modal': CourseContactAdditionModal,
    'training-contract-container': TrainingContractContainer,
    'learner-creation-modal': LearnerCreationModal,
  },
  setup (props) {
    const { profileId } = toRefs(props);

    const SINGLE_COURSES_SUBPROGRAM_IDS = process.env.SINGLE_COURSES_SUBPROGRAM_IDS.split(';');

    const $store = useStore();
    const $router = useRouter();
    const $q = useQuasar();

    const trainerOptions = ref([]);
    const adminUserOptions = ref([]);
    const companyRepresentativeOptions = ref([]);
    const courseLoading = ref(false);
    const tmpInput = ref('');
    const displayHistory = ref(false);
    const courseHistories = ref([]);
    const smsModal = ref(false);
    const messageTypeOptions = ref([
      { label: 'Convocation', value: CONVOCATION },
      { label: 'Rappel', value: REMINDER },
      { label: 'Autre', value: OTHER },
    ]);
    const newSms = ref({ content: '', type: '' });
    const loading = ref(false);
    const smsHistoryList = ref([]);
    const smsLoading = ref(false);
    const smsHistoriesModal = ref(false);
    const tmpInterlocutorId = ref('');
    const tmpCourse = ref({ misc: '', estimateStartDate: '', maxTrainees: 0, hasCertifyingTest: false });
    const operationsRepresentativeEditionModal = ref(false);
    const interlocutorModalLoading = ref(false);
    const interlocutorLabel = ref({ action: '', interlocutor: '' });
    const trainerModal = ref(false);
    const sendSms = ref(false);
    const companyRepresentativeModal = ref(false);
    const contactModalLoading = ref(false);
    const contactAdditionModal = ref(false);
    const salesRepresentativeModal = ref(false);
    const tmpContactId = ref('');
    const potentialTrainees = ref([]);
    const trainingContracts = ref([]);
    const trainingContractTableLoading = ref(false);
    const canUpdateCompanyRepresentative = ref(false);
    const canGetTrainingContracts = ref(false);
    const canGetTrainersAndAdminUsers = ref(false);
    const canUpdateInterlocutor = ref(false);
    const canUpdateTrainees = ref(false);
    const canUpdateSMS = ref(false);
    const canReadHistory = ref(false);
    const canUpdateCertifyingTest = ref(false);
    const canReadAndUpdateSalesRepresentative = ref(false);
    const courseHistoryFeed = useTemplateRef('courseHistoryFeed');
    const OPERATIONS_REPRESENTATIVE = 'operationsRepresentative';
    const COMPANY_REPRESENTATIVE = 'companyRepresentative';
    const SALES_REPRESENTATIVE = 'salesRepresentative';
    const urlAndroid = 'https://bit.ly/3en5OkF';
    const urlIos = 'https://apple.co/33kKzcU';

    const course = computed(() => $store.state.course.course);

    const courseCompanyIds = computed(() => course.value.companies.map(c => c._id));

    const {
      vendorRole,
      disableDocDownload,
      pdfLoading,
      isClientInterface,
      isVendorInterface,
      isIntraOrIntraHoldingOrVendor,
      followUpDisabled,
      isArchived,
      followUpMissingInfo,
      downloadAttendanceSheet,
      isIntraCourse,
    } = useCourses(course);

    const refreshTraineeTable = async () => {
      await refreshCourse();
      await refreshPotentialTrainees();
    };

    const {
      newLearner,
      resetLearnerCreationModal,
      firstStep,
      nextStepLearnerCreationModal,
      learnerAlreadyExists,
      learnerValidation,
      learnerCreationModal,
      learnerCreationModalLoading,
      submitLearnerCreationModal,
      traineeAdditionModal: tutorModal,
      newTraineeRegistration: newTutorRegistration,
    } = useLearnersCreation(refreshTraineeTable, false, false, courseCompanyIds);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const rules = computed(() => ({
      tmpContactId: { required },
      tmpCourse: { maxTrainees: { strictPositiveNumber, integerNumber } },
      newSms: { content: { required }, type: { required } },
      companyRepresentative: { required },
      operationsRepresentative: { required },
      trainer: { required },
      tutor: { required },
    }));

    const v$ = useVuelidate(
      rules,
      {
        tmpContactId,
        tmpCourse,
        newSms,
        companyRepresentative: tmpInterlocutorId,
        operationsRepresentative: tmpInterlocutorId,
        trainer: tmpInterlocutorId,
        tutor: tmpInterlocutorId,
      }
    );

    const loggedUserIsTrainer = computed(() => vendorRole.value === TRAINER);

    const isRofOrVendorAdmin = computed(() => [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole.value));

    const hasHoldingRole = computed(() => !!get(loggedUser.value, 'role.holding'));

    const isCourseInter = computed(() => course.value.type === INTER_B2B);

    const isIntraHoldingCourse = computed(() => course.value.type === INTRA_HOLDING);

    const singleCourse = computed(() => course.value.type === SINGLE);

    const canEditSlots = computed(() => !(isClientInterface && (isCourseInter.value || singleCourse.value)));

    const isFinished = computed(() => {
      const slotsToCome = course.value.slots.filter(slot => CompaniDate().isBefore(slot.endDate));
      return !slotsToCome.length && !course.value.slotsToPlan.length;
    });

    const courseNotStartedYet = computed(() => {
      const slots = course.value.slots.filter(slot => CompaniDate().isAfter(slot.endDate));
      return !slots.length;
    });

    const filteredMessageTypeOptions = computed(() => {
      if (courseNotStartedYet.value) return messageTypeOptions.value;
      if (isFinished.value || noFuturSlotIsPlanned.value) {
        return messageTypeOptions.value.filter(t => t.value === OTHER);
      }
      return messageTypeOptions.value.filter(t => t.value !== CONVOCATION);
    });

    const missingTraineesPhone = computed(() => course.value.trainees.filter(trainee => !get(trainee, 'contact.phone'))
      .map(trainee => formatIdentity(trainee.identity, 'FL')));

    const courseName = computed(() => composeCourseName(course.value));

    const noFuturSlotIsPlanned = computed(() => {
      const futurSlots = course.value.slots.filter(s => s.startDate).filter(s => CompaniDate().isBefore(s.startDate));
      return !!course.value.slotsToPlan.length && !futurSlots.length;
    });

    const smsMissingInfo = computed(() => {
      const missingInfo = [];
      if (!course.value.slots || !course.value.slots.length) missingInfo.push('minimum 1 créneau');
      if (!course.value.trainees || !course.value.trainees.length) missingInfo.push('minimum 1 stagiaire');

      return missingInfo;
    });

    const disableSms = computed(() => {
      const noPhoneNumber = missingTraineesPhone.value.length === course.value.trainees.length;

      return !!smsMissingInfo.value.length || noPhoneNumber;
    });

    const traineesEmails = computed(() => {
      if (!course.value.trainees) return '';

      return course.value.trainees.map(trainee => trainee.local.email).reduce((acc, value) => `${acc}${value},`, '');
    });

    const contactOptions = computed(() => {
      const interlocutors = [
        { interlocutor: course.value.operationsRepresentative, role: 'Chargé(e) des opérations' },
        ...(get(course.value, 'trainers', []).some(t => t._id)
          ? course.value.trainers.map(trainer => ({ interlocutor: trainer, role: 'Intervenant(e)' }))
          : []),
        ...(course.value.companyRepresentative._id
          ? [{ interlocutor: course.value.companyRepresentative, role: 'Chargé(e) de formation structure' }]
          : []),
      ];
      return Object.freeze(interlocutors.map(interlocutor => formatContactOption(interlocutor)));
    });

    const isSingleCourse = computed(() => SINGLE_COURSES_SUBPROGRAM_IDS.includes(course.value.subProgram._id));

    watch(course, async (newValue, oldValue) => {
      tmpCourse.value = pick(course.value, ['misc', 'estimatedStartDate', 'maxTrainees', 'hasCertifyingTest']);

      if (!oldValue) return;

      if (displayHistory.value) {
        await getCourseHistories();
        courseHistoryFeed.value.resumeScroll();
      }

      if (newValue.companies.length !== oldValue.companies.length) await refreshTrainingContracts();
      else {
        const oldValueCompaniesIds = oldValue.companies.map(c => c._id);
        if (!newValue.companies.every(c => oldValueCompaniesIds.includes(c._id))) await refreshTrainingContracts();
      }
    }, { immediate: true });

    const traineesOptions = computed(() => formatAndSortUserOptions(potentialTrainees.value, !isIntraCourse.value));

    const companyOptions = computed(() => formatAndSortCompanyOptions(course.value.companies));

    const defineCourseAbilities = () => {
      const ability = defineAbilitiesForCourse(pick(loggedUser.value, ['role']));

      canUpdateCompanyRepresentative.value = ability
        .can('update', subject('Course', course.value), 'company_representative');
      canUpdateInterlocutor.value = ability.can('update', subject('Course', course.value), 'interlocutor');
      canUpdateTrainees.value = ability.can('update', subject('Course', course.value), 'trainees');
      canUpdateSMS.value = ability.can('update', subject('Course', course.value), 'sms');
      canReadHistory.value = ability.can('read', subject('Course', course.value), 'history');
      canGetTrainingContracts.value = ability.can('read', subject('Course', course.value), 'training_contracts');
      canGetTrainersAndAdminUsers.value = ability
        .can('read', subject('Course', course.value), 'interlocutor');
      canUpdateCertifyingTest.value = ability.can('update', subject('Course', course.value), 'certifying_test');
      canReadAndUpdateSalesRepresentative.value = ability
        .can('read', subject('Course', course.value), 'sales_representative');
    };

    const toggleHistory = async () => {
      displayHistory.value = !displayHistory.value;
    };

    const getCourseHistories = async (createdAt = null) => {
      const courseHistoriesTmp = cloneDeep(courseHistories.value);
      try {
        let olderCourseHistories;
        if (createdAt) {
          olderCourseHistories = await CourseHistories.getCourseHistories({ course: profileId.value, createdAt });
          courseHistories.value.push(...olderCourseHistories);
        } else {
          olderCourseHistories = await CourseHistories.getCourseHistories({ course: profileId.value });
          courseHistories.value = olderCourseHistories;
        }

        return olderCourseHistories;
      } catch (e) {
        courseHistories.value = courseHistoriesTmp;
        console.error(e);
        NotifyNegative('Erreur lors de la récupération de l\'historique d\'activité');
      }
    };

    const updateCourseHistories = async ({ index, done }) => {
      if (index === 1) {
        await getCourseHistories();
        done(courseHistories.value.length);
      } else {
        const lastCreatedAt = courseHistories.value.length
          ? courseHistories.value[courseHistories.value.length - 1].createdAt
          : null;
        const olderCourseHistories = await getCourseHistories(lastCreatedAt);

        return done(!olderCourseHistories.length);
      }
    };

    const refreshPotentialTrainees = async () => {
      try {
        if (isClientInterface && course.value.type === INTER_B2B) return;

        potentialTrainees.value = !isEmpty(courseCompanyIds.value)
          ? Object.freeze(await Users.learnerList(
            { companies: courseCompanyIds.value, startDate: CompaniDate().toISO(), action: COURSE }
          ))
          : [];
      } catch (error) {
        potentialTrainees.value = [];
        console.error(error);
      }
    };

    const refreshCourse = async () => {
      try {
        courseLoading.value = true;
        await $store.dispatch('course/fetchCourse', { courseId: profileId.value });
      } catch (e) {
        console.error(e);
      } finally {
        courseLoading.value = false;
      }
    };

    const formatInterlocutorOption = interlocutor => ({
      value: interlocutor._id,
      label: formatIdentity(interlocutor.identity, 'FL'),
      email: interlocutor.local.email || '',
      picture: get(interlocutor, 'picture.link') || DEFAULT_AVATAR,
      additionalFilters: [interlocutor.local.email],
    });

    const formatContactOption = contact => ({
      value: contact.interlocutor._id,
      label: `${formatIdentity(contact.interlocutor.identity, 'FL')} - ${contact.role}`,
    });

    const refreshCompanyRepresentatives = async () => {
      try {
        if (course.value.type === INTER_B2B) {
          companyRepresentativeOptions.value = [];
          return;
        }
        const loggedUserCompany = get(loggedUser.value, 'company._id');
        const loggedUserHoldingRole = get(loggedUser.value, 'role.holding.name');

        if (loggedUserIsTrainer.value && !loggedUserHoldingRole &&
        !courseCompanyIds.value.includes(loggedUserCompany)) {
          companyRepresentativeOptions.value = [];
          return;
        }

        const clientsUsersAllowedtoAccessCompany = ([INTRA, SINGLE].includes(course.value.type))
          ? await Users.list(
            { role: [COACH, CLIENT_ADMIN], company: courseCompanyIds.value[0], includeHoldingAdmins: true }
          )
          : await Users.list({ role: [HOLDING_ADMIN], holding: course.value.holding });

        companyRepresentativeOptions.value = Object.freeze(clientsUsersAllowedtoAccessCompany
          .map(user => formatInterlocutorOption(user)).sort((a, b) => a.label.localeCompare(b.label)));
      } catch (e) {
        console.error(e);
      }
    };

    const refreshTrainersAndAdminUsers = async () => {
      try {
        const vendorUsers = await Users.list({ role: [TRAINER, TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN] });
        trainerOptions.value = Object.freeze(
          vendorUsers.map(vu => formatInterlocutorOption(vu)).sort((a, b) => a.label.localeCompare(b.label))
        );

        const [trainerRole] = await Roles.list({ name: [TRAINER] });
        const adminUsers = vendorUsers.filter(t => t.role.vendor !== trainerRole._id);
        adminUserOptions.value = adminUsers
          .map(sr => formatInterlocutorOption(sr))
          .sort((a, b) => a.label.localeCompare(b.label));
      } catch (e) {
        console.error(e);
        trainerOptions.value = [];
        adminUserOptions.value = [];
      }
    };

    const setDefaultMessageType = () => {
      if (courseNotStartedYet.value) newSms.value.type = CONVOCATION;
      else if (isFinished.value || noFuturSlotIsPlanned.value) newSms.value.type = OTHER;
      else newSms.value.type = REMINDER;
    };

    const refreshSms = async () => {
      try {
        smsLoading.value = true;
        const smsList = await Courses.getSMSHistory(course.value._id);
        smsHistoryList.value = smsList.sort(descendingSortBy('date'));
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du chargement des sms');
        smsHistoryList.value = [];
      } finally {
        smsLoading.value = false;
      }
    };

    const openHistoryModal = async () => {
      if (smsHistoryList.value.length) {
        smsHistoriesModal.value = true;
        sendSms.value = true;
      } else {
        openSmsModal();
      }
    };

    const openSmsModal = () => {
      setDefaultMessageType();
      updateMessage(newSms.value.type);
      smsHistoriesModal.value = false;
      sendSms.value = false;
      smsModal.value = true;
    };

    const resetSmsModal = () => v$.value.newSms.$reset();

    const setConvocationMessage = () => {
      const slots = course.value.slots
        .filter(s => !!s.startDate)
        .sort(ascendingSortBy('startDate'));
      const date = CompaniDate(slots[0].startDate).format(DD_MM);
      const hour = CompaniDate(slots[0].startDate).format(HH_MM);

      newSms.value.content = `Bonjour,\nVous êtes inscrit(e) à la formation ${courseName.value}.\n`
      + `La première session a lieu le ${date} à ${hour}.\nPour le bon déroulement et le suivi `
      + 'de cette formation, veuillez télécharger notre application Compani :\n'
      + `Pour android : ${urlAndroid} \nPour iPhone : ${urlIos}\n`
      + 'Bonne formation,\nCompani';
    };

    const setReminderMessage = () => {
      const slots = course.value.slots
        .filter(s => !!s.startDate)
        .filter(slot => CompaniDate().isBefore(slot.endDate))
        .sort(ascendingSortBy('startDate'));
      const date = CompaniDate(slots[0].startDate).format(DD_MM);
      const hour = CompaniDate(slots[0].startDate).format(HH_MM);

      newSms.value.content = `Bonjour,\nRAPPEL : vous êtes inscrit(e) à la formation ${courseName.value}.\n`
      + `Votre prochaine session a lieu le ${date} à ${hour}.\nPour le bon déroulement et le suivi `
      + 'de cette formation, veuillez télécharger notre application Compani :\n'
      + `Pour android : ${urlAndroid} \nPour iPhone : ${urlIos} `
      + '\nBonne formation,\nCompani';
    };

    const setOtherMessage = () => (newSms.value.content = '');

    const updateMessage = (newMessageType) => {
      if (newMessageType === CONVOCATION) setConvocationMessage();
      else if (newMessageType === REMINDER) setReminderMessage();
      else if (newMessageType === OTHER) setOtherMessage();
    };

    const sendMessage = async () => {
      try {
        v$.value.newSms.$touch();
        if (v$.value.newSms.$error) return NotifyWarning('Champ(s) invalide(s)');

        loading.value = true;
        await Courses.sendSMS(course.value._id, newSms.value);
        await refreshSms();

        smsModal.value = false;

        return NotifyPositive('SMS bien envoyé(s).');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'envoi des SMS');
      } finally {
        loading.value = false;
        setDefaultMessageType();
      }
    };

    const downloadConvocation = async () => {
      if (disableDocDownload.value) return;

      try {
        pdfLoading.value = true;
        const pdf = await Courses.downloadConvocation(course.value._id);
        const formattedName = formatDownloadName(`convocation ${composeCourseName(course.value, true)}`);
        const pdfName = `${formattedName}.pdf`;
        downloadFile(pdf, pdfName, 'application/octet-stream');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement de la convocation.');
      } finally {
        pdfLoading.value = false;
      }
    };

    const updateInterlocutor = async (interlocutorType) => {
      try {
        interlocutorModalLoading.value = true;

        if (v$.value[interlocutorType]) {
          v$.value[interlocutorType].$touch();
          if (v$.value[interlocutorType].$error) return NotifyWarning('Champ(s) invalide(s)');
        }

        const isContact = get(course.value, 'contact._id')
          ? course.value.contact._id === get(course.value, `${interlocutorType}._id`)
          : false;

        const payload = {
          [interlocutorType]: tmpInterlocutorId.value,
          ...(isContact && { contact: tmpInterlocutorId.value }
          ),
        };

        await Courses.update(profileId.value, payload);

        switch (interlocutorType) {
          case OPERATIONS_REPRESENTATIVE:
            operationsRepresentativeEditionModal.value = false;
            break;
          case TRAINER:
            trainerModal.value = false;
            break;
          case COMPANY_REPRESENTATIVE:
            companyRepresentativeModal.value = false;
            break;
          case SALES_REPRESENTATIVE:
            salesRepresentativeModal.value = false;
            break;
        }
        await refreshCourse();
        NotifyPositive('Interlocuteur mis à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'édition de l\'interlocuteur.');
      } finally {
        interlocutorModalLoading.value = false;
      }
    };

    const addTrainer = async () => {
      try {
        v$.value.trainer.$touch();
        if (v$.value.trainer.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Courses.addTrainer(course.value._id, { trainer: tmpInterlocutorId.value });

        trainerModal.value = false;
        await refreshCourse();
        NotifyPositive('Intervenant ajouté.');
      } catch (e) {
        console.error(e);
        if ([409, 403].includes(e.status)) return NotifyNegative(e.data.message);

        NotifyNegative('Erreur lors de l\'ajout de l\'intervenant.');
      }
    };

    const removeTrainer = async (interlocutorId) => {
      try {
        await Courses.deleteTrainer(course.value._id, interlocutorId);

        await refreshCourse();
        NotifyPositive('Intervenant détaché.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du détachement de l\'intervenant.');
      }
    };

    const validateTrainerDeletion = async (interlocutorId) => {
      const hasTrainerMission = !!course.value.trainerMissions
        .find(trainerMission => trainerMission.trainer === interlocutorId);

      if (hasTrainerMission) {
        const message = 'Un ordre de mission est associé au formateur actuel et sera annulé.'
          + ' Êtes-vous sûr(e) de vouloir continuer&nbsp;?';
        $q.dialog({
          title: 'Confirmation',
          message,
          html: true,
          ok: true,
          cancel: 'Annuler',
        }).onOk(() => removeTrainer(interlocutorId))
          .onCancel(() => NotifyPositive('Détachement annulé.'));
      } else {
        await removeTrainer(interlocutorId);
      }
    };

    const updateContact = async () => {
      try {
        contactModalLoading.value = true;
        v$.value.tmpContactId.$touch();
        if (v$.value.tmpContactId.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Courses.update(profileId.value, { contact: tmpContactId.value });
        contactAdditionModal.value = false;
        await refreshCourse();
        NotifyPositive('Contact mis à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'édition du contact.');
      } finally {
        contactModalLoading.value = false;
      }
    };

    const resetContactAddition = () => {
      tmpContactId.value = '';
      v$.value.tmpContactId.$reset();
    };

    const resetInterlocutor = (interlocutorType = '') => {
      tmpInterlocutorId.value = '';
      interlocutorLabel.value = { action: '', interlocutor: '' };

      if (v$.value[interlocutorType]) v$.value[interlocutorType].$reset();
    };

    const openOperationsRepresentativeModal = () => {
      tmpInterlocutorId.value = course.value.operationsRepresentative._id;

      interlocutorLabel.value = { action: 'Modifier le ', interlocutor: 'chargé des opérations' };
      operationsRepresentativeEditionModal.value = true;
    };

    const openTrainerModal = (event) => {
      if (isArchived.value) {
        return NotifyWarning('Vous ne pouvez pas ajouter d’intervenant(e) à une formation archivée.');
      }

      const { action, interlocutorId: trainerId } = event;

      if (action === DELETION) {
        const trainerToRemove = course.value.trainers.find(t => t._id === trainerId);
        openInterlocutorDeletionValidationModal(get(trainerToRemove, 'identity'), TRAINER, trainerId);
      } else {
        tmpInterlocutorId.value = trainerId;
        interlocutorLabel.value = { action: 'Ajouter un ', interlocutor: 'intervenant' };
        trainerModal.value = true;
      }
    };

    const openCompanyRepresentativeModal = (event) => {
      const { action: eventAction } = event;
      const action = eventAction === EDITION ? 'Modifier le ' : 'Ajouter un ';

      tmpInterlocutorId.value = course.value.companyRepresentative._id;
      interlocutorLabel.value = { action, interlocutor: 'chargé de formation structure' };
      companyRepresentativeModal.value = true;
    };

    const openContactAdditionModal = () => {
      if (isArchived.value) {
        return NotifyWarning('Vous ne pouvez pas modifier le contact d’une formation archivée.');
      }

      tmpContactId.value = course.value.contact._id;
      contactAdditionModal.value = true;
    };

    const removeTutor = async (interlocutorId) => {
      try {
        await Courses.deleteTutor(course.value._id, interlocutorId);

        await refreshCourse();
        NotifyPositive('Tuteur détaché.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du détachement du tuteur.');
      }
    };

    const removeInterlocutor = (interlocutorType, interlocutorId) => {
      tmpInterlocutorId.value = '';

      if (interlocutorType === TRAINER) validateTrainerDeletion(interlocutorId);
      else if (interlocutorType === TUTOR) removeTutor(interlocutorId);
      else updateInterlocutor(interlocutorType);
    };

    const openInterlocutorDeletionValidationModal = (identity, interlocutorType, interlocutorId = '') => {
      const message = `Êtes-vous sûr(e) de vouloir détacher ${formatIdentity(identity, 'FL')} de la formation&nbsp;?`;
      $q.dialog({
        title: 'Confirmation',
        message,
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => removeInterlocutor(interlocutorType, interlocutorId))
        .onCancel(() => NotifyPositive('Détachement annulé.'));
    };

    const openSalesRepresentativeModal = (event) => {
      const { action: eventAction } = event;
      if (eventAction === DELETION) {
        openInterlocutorDeletionValidationModal(
          get(course.value, 'salesRepresentative.identity'),
          SALES_REPRESENTATIVE
        );
      } else {
        const action = eventAction === EDITION ? 'Modifier le ' : 'Ajouter un ';

        tmpInterlocutorId.value = get(course.value, 'salesRepresentative._id') || '';
        interlocutorLabel.value = { action, interlocutor: 'chargé d\'accompagnement' };
        salesRepresentativeModal.value = true;
      }
    };

    const copy = () => {
      copyToClipboard(traineesEmails.value)
        .then(() => NotifyPositive('Adresses mail copiées !'))
        .catch(() => NotifyNegative('Erreur lors de la copie des emails.'));
    };

    const updateCourse = async (path) => {
      try {
        let value = get(tmpCourse.value, path);
        if (path === 'maxTrainees') value = Number(value);

        if (get(course.value, path) === value) return;

        const vAttribute = get(v$.value, `tmpCourse.${path}`);
        if (vAttribute) {
          vAttribute.$touch();
          if (vAttribute.$error) return NotifyWarning('Champ(s) invalide(s).');
        }

        await Courses.update(profileId.value, { [path]: value });
        NotifyPositive('Modification enregistrée.');

        await refreshCourse();
      } catch (e) {
        console.error(e);
        if (e.message === 'Champ(s) invalide(s)') return NotifyWarning(e.message);
        if (e.status === 403 && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        tmpInput.value = null;
      }
    };

    const refreshTrainingContracts = async () => {
      try {
        if (!isRofOrVendorAdmin.value && isVendorInterface) return;

        trainingContractTableLoading.value = true;
        const loggedUserHolding = get(loggedUser.value, 'holding._id');
        const trainingContractList = await TrainingContracts.list({
          course: course.value._id,
          ...(isClientInterface && {
            ...loggedUserHolding ? { holding: loggedUserHolding } : { company: loggedUser.value.company._id },
          }),
        });

        trainingContracts.value = trainingContractList;
      } catch (e) {
        console.error(e);
        trainingContracts.value = [];
        NotifyNegative('Erreur lors de la récupération des conventions de formation.');
      } finally {
        trainingContractTableLoading.value = false;
      }
    };

    const openTutorModal = (event) => {
      if (isArchived.value) {
        return NotifyWarning('Vous ne pouvez pas ajouter de tuteur à une formation archivée.');
      }

      if (!course.value.companies.length) {
        return NotifyWarning('Vous ne pouvez pas ajouter de tuteur à une formation sans structure.');
      }

      const { action, interlocutorId: tutorId } = event;

      if (action === DELETION) {
        const tutorToRemove = course.value.tutors.find(t => t._id === tutorId);
        openInterlocutorDeletionValidationModal(get(tutorToRemove, 'identity'), TUTOR, tutorId);
      } else {
        tmpInterlocutorId.value = tutorId;
        interlocutorLabel.value = { action: 'Ajouter un ', interlocutor: 'tuteur' };
        tutorModal.value = true;
      }
    };

    const addTutor = async () => {
      try {
        interlocutorModalLoading.value = true;

        await Courses.addTutor(course.value._id, { tutor: tmpInterlocutorId.value });

        await refreshCourse();
        tutorModal.value = false;
        NotifyPositive('Tuteur ajouté.');
        NotifyPositive('Email envoyé.');
      } catch (e) {
        console.error(e);
        if ([409, 403].includes(e.status)) return NotifyNegative(e.data.message);

        NotifyNegative('Erreur lors de l\'ajout du tuteur.');
      } finally {
        interlocutorModalLoading.value = false;
      }
    };

    const validateTutorAddition = () => {
      v$.value.tutor.$touch();
      if (v$.value.tutor.$error) return NotifyWarning('Champ(s) invalide(s).');

      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir ajouter l\'utilisateur comme tuteur de la formation&nbsp;? <br /><br />'
        + ' Un email lui sera envoyé.',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => addTutor())
        .onCancel(() => NotifyPositive('Ajout annulé.'));
    };

    const openLearnerCreationModal = async () => {
      tutorModal.value = false;
      learnerCreationModal.value = true;
    };

    const goToContactProfile = () => $router.push({ name: 'ni courses contacts' });

    watch(tutorModal, () => {
      if (tutorModal.value && newTutorRegistration.value.user) {
        tmpInterlocutorId.value = newTutorRegistration.value.user;
        interlocutorLabel.value = { action: 'Ajouter un ', interlocutor: 'tuteur' };
        newTutorRegistration.value.user = '';
      }
    });

    const created = async () => {
      const promises = [];
      defineCourseAbilities();
      if (canUpdateCompanyRepresentative.value) promises.push(refreshCompanyRepresentatives());
      if (canUpdateSMS.value) promises.push(refreshSms());
      if (canUpdateTrainees.value) promises.push(refreshPotentialTrainees());
      if (canGetTrainingContracts.value) promises.push(refreshTrainingContracts());
      if (canGetTrainersAndAdminUsers.value) promises.push(refreshTrainersAndAdminUsers());
      else {
        adminUserOptions.value = [formatInterlocutorOption(course.value.operationsRepresentative)];
      }

      await Promise.all(promises);
    };

    created();

    return {
      // Data
      INTRA,
      trainerOptions,
      potentialTrainees,
      adminUserOptions,
      companyRepresentativeOptions,
      courseLoading,
      displayHistory,
      courseHistories,
      smsModal,
      messageTypeOptions,
      newSms,
      loading,
      smsHistoryList,
      smsHistoriesModal,
      tmpInterlocutorId,
      operationsRepresentativeEditionModal,
      interlocutorModalLoading,
      interlocutorLabel,
      trainerModal,
      sendSms,
      companyRepresentativeModal,
      contactModalLoading,
      contactAdditionModal,
      salesRepresentativeModal,
      tmpContactId,
      courseHistoryFeed,
      tmpCourse,
      trainingContractTableLoading,
      trainingContracts,
      canUpdateInterlocutor,
      canUpdateCompanyRepresentative,
      canUpdateSMS,
      canReadHistory,
      canGetTrainingContracts,
      canUpdateCertifyingTest,
      canReadAndUpdateSalesRepresentative,
      COMPANY_REPRESENTATIVE,
      OPERATIONS_REPRESENTATIVE,
      TRAINER,
      SALES_REPRESENTATIVE,
      CREATION,
      TUTOR,
      tutorModal,
      newLearner,
      firstStep,
      learnerAlreadyExists,
      learnerValidation,
      learnerCreationModalLoading,
      learnerCreationModal,
      // Computed
      course,
      v$,
      isRofOrVendorAdmin,
      hasHoldingRole,
      canEditSlots,
      filteredMessageTypeOptions,
      missingTraineesPhone,
      smsMissingInfo,
      disableSms,
      traineesEmails,
      contactOptions,
      isIntraOrIntraHoldingOrVendor,
      disableDocDownload,
      followUpDisabled,
      isArchived,
      followUpMissingInfo,
      isClientInterface,
      isCourseInter,
      isVendorInterface,
      isIntraHoldingCourse,
      isSingleCourse,
      traineesOptions,
      companyOptions,
      // Methods
      get,
      formatQuantity,
      toggleHistory,
      updateCourseHistories,
      refreshCourse,
      formatContactOption,
      openHistoryModal,
      openSmsModal,
      resetSmsModal,
      updateMessage,
      sendMessage,
      downloadConvocation,
      updateInterlocutor,
      validateTrainerDeletion,
      updateContact,
      resetContactAddition,
      openOperationsRepresentativeModal,
      resetInterlocutor,
      openTrainerModal,
      openCompanyRepresentativeModal,
      openContactAdditionModal,
      openSalesRepresentativeModal,
      copy,
      updateCourse,
      downloadAttendanceSheet,
      refreshTraineeTable,
      refreshTrainingContracts,
      goToContactProfile,
      addTrainer,
      openTutorModal,
      openLearnerCreationModal,
      resetLearnerCreationModal,
      nextStepLearnerCreationModal,
      submitLearnerCreationModal,
      validateTutorAddition,
    };
  },
};
</script>

<style lang="sass" scoped>
.profile-container
  display: flex
  flex-direction: column
.button-history
  align-self: flex-end
.certifying-checkbox
  @media screen and (max-width: 767px)
    padding: 0px 0px 16px 16px
.button-trainer
  justify-self: start
.container-history
  z-index: 10
</style>
