<template>
  <div>
    <div class="q-mt-lg q-mb-xl">
      <p class="text-weight-bold">Émargements</p>
      <div v-if="isIntraOrIntraHoldingOrVendor" class="q-mb-md">
        <ni-banner v-if="followUpDisabled">
          <template #message>
            Il manque {{ formatQuantity('information', followUpMissingInfo.length ) }}
            pour assurer le suivi de la formation : {{ followUpMissingInfo.join(', ') }}.
          </template>
        </ni-banner>
        <ni-bi-color-button icon="file_download" label="Feuilles d'émargement vierges"
          :disable="disableAttendanceSheetDownload || isArchived" @click="downloadAttendanceSheet" size="16px" />
      </div>
      <attendance-table :course="course" />
    </div>
    <div v-if="areQuestionnaireVisible" class="q-mb-xl">
      <p class="text-weight-bold">Questionnaires</p>
      <div v-if="areQuestionnaireQRCodeVisible" class="questionnaire-link-container">
        <ni-questionnaire-qrcode-cell v-for="(qrCode, idx) in questionnaireQRCodes" :key="`qrCode-${idx}`"
          :img="qrCode.img" :types="filterQuestionnaireTypes(qrCode.courseTimeline)"
          @click="goToQuestionnaireProfile(qrCode.courseTimeline)" />
      </div>
      <div v-if="loggedUserIsCourseTrainer && endSelfPositionningQuestionnaireId">
        <ni-banner icon="edit">
          <template #message>
            Pour valider les réponses aux questionnaires d’auto-positionnement de fin de formation, veuillez
            <a class="clickable-name cursor-pointer" @click="goToSelfPositionningAnswers">cliquer ici</a>
          </template>
        </ni-banner>
      </div>
      <div v-if="isRofOrVendorAdmin && endSelfPositionningHistoryCount">
        <ni-banner icon="info_outline">
          <template #message>
            {{ formatQuantity('réponse', selfPositionningHistoryValidatedCount) }} au questionnaire
            d'auto-positionnement de fin
            {{ formatQuantity('validée', selfPositionningHistoryValidatedCount, 's', false) }} sur
            {{ endSelfPositionningHistoryCount }}.
          </template>
        </ni-banner>
      </div>
      <div v-if="areQuestionnaireAnswersVisible" class="questionnaires-container">
        <router-link v-for="questionnaire in filteredQuestionnaires" :key="questionnaire._id"
          :to="goToQuestionnaireAnswers(questionnaire.type)">
          <questionnaire-answers-cell :questionnaire="questionnaire" />
        </router-link>
      </div>
    </div>
    <elearning-follow-up-table v-if="courseHasElearningStep" :learners="learners" :loading="learnersLoading"
      class="q-mb-xl" is-blended />
    <div class="q-mb-sm">
      <p class="text-weight-bold" v-if="!isMonthlyCertificateMode || canReadCompletionCertificate">
        Attestations / Certificats de réalisation
      </p>
      <ni-banner v-if="!get(course, 'subProgram.program.learningGoals') && isRofOrVendorAdmin && isVendorInterface">
        <template #message>
          Merci de renseigner les objectifs pédagogiques du programme pour pouvoir télécharger
          les attestations de fin de formation.
        </template>
      </ni-banner>
      <div v-if="!isMonthlyCertificateMode">
        <ni-bi-color-button icon="file_download" label="Attestations" size="16px"
          :disable="disableDownloadCompletionCertificates" @click="downloadCompletionCertificates(CUSTOM)" />
        <ni-bi-color-button v-if="canReadCompletionCertificate" icon="file_download" class="q-my-md"
          label="Certificats de réalisation" size="16px" :disable="disableDownloadCompletionCertificates"
          @click="downloadCompletionCertificates(OFFICIAL)" />
      </div>
      <div v-else-if="canReadCompletionCertificate">
        <completion-certificate-table v-if="completionCertificates.length" :disabled-button="disableButton"
          :completion-certificates="completionCertificates" :columns="completionCertificateColumns"
          @generate="generateCompletionCertificate" @remove-file="validateCompletionCertificateDeletion" />
        <template v-else>
          <span class="text-italic q-pa-lg">Aucun certificat de réalisation n'existe pour cette formation.</span>
        </template>
        <div class="flex justify-end q-mt-md">
          <ni-primary-button v-if="isRofOrVendorAdmin && isVendorInterface" label="Ajouter un certificat de réalisation"
            icon="add" @click="openCompletionCertificatesModal" />
        </div>
      </div>
    </div>
    <div v-if="unsubscribedAttendances.length">
      <div class="text-italic q-ma-xs">
        Certains stagiaires inscrits à cette formation ont émargé dans d’autres formations du même programme
      </div>
      <ni-expanding-table :data="unsubscribedAttendances" :columns="columns" :pagination="pagination"
        :hide-bottom="false">
        <template #expanding-row="{ props }">
          <q-td colspan="100%">
            <div v-for="attendance in props.row.attendances" :key="attendance._id" :props="props"
              class="q-ma-sm expanding-table-expanded-row">
              <div class="dates">{{ attendance.date }}</div>
              <div class="hours">{{ attendance.hours }}</div>
              <div class="misc">{{ attendance.misc }}</div>
              <div class="trainers">{{ attendance.trainers }}</div>
            </div>
          </q-td>
        </template>
      </ni-expanding-table>
    </div>

    <completion-certificate-addition-modal v-model="completionCertificateAdditionModal" :loading="modalLoading"
      @hide="resetCompletionCertificateAdditionModal" v-model:new-completion-certificate="newCompletionCertificate"
      @submit="addCompletionCertificate" :validations="v$.newCompletionCertificate" :trainee-options="traineeOptions"
      :month-options="monthOptions" />
  </div>
</template>

<script>
import { subject } from '@casl/ability';
import get from 'lodash/get';
import pick from 'lodash/pick';
import groupBy from 'lodash/groupBy';
import { computed, ref, toRefs } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { useQuasar } from 'quasar';
import CompletionCertificates from '@api/CompletionCertificates';
import Courses from '@api/Courses';
import Attendances from '@api/Attendances';
import Questionnaires from '@api/Questionnaires';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import AttendanceTable from '@components/table/AttendanceTable';
import ExpandingTable from '@components/table/ExpandingTable';
import ElearningFollowUpTable from '@components/courses/ElearningFollowUpTable';
import QuestionnaireAnswersCell from '@components/courses/QuestionnaireAnswersCell';
import BiColorButton from '@components/BiColorButton';
import Banner from '@components/Banner';
import PrimaryButton from '@components/PrimaryButton';
import QuestionnaireQRCodeCell from '@components/courses/QuestionnaireQRCodeCell';
import CompletionCertificateTable from '@components/table/CompletionCertificateTable';
import {
  E_LEARNING,
  SHORT_DURATION_H_MM,
  DD_MM_YYYY,
  END_OF_COURSE,
  EXPECTATIONS,
  OFFICIAL,
  CUSTOM,
  ALL_PDF,
  ALL_WORD,
  SELF_POSITIONNING,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  START_COURSE,
  END_COURSE,
  MONTHLY,
  MM_YYYY,
} from '@data/constants';
import CompletionCertificateAdditionModal
  from 'src/modules/vendor/components/courses/CompletionCertificateAdditionModal';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';
import { getISOTotalDuration, ascendingSort, descendingSortBy } from '@helpers/dates/utils';
import {
  formatIdentity,
  formatQuantity,
  formatDownloadName,
  sortStrings,
  formatAndSortIdentityOptions,
} from '@helpers/utils';
import { composeCourseName, formatSlotSchedule } from '@helpers/courses';
import { downloadZip } from '@helpers/file';
import { defineAbilitiesForCourse } from '@helpers/ability';
import { useCourses } from '@composables/courses';
import { useTraineeFollowUp } from '@composables/traineeFollowUp';
import { useCompletionCertificates } from '@composables/completionCertificates';

export default {
  name: 'ProfileTraineeFollowUp',
  components: {
    'elearning-follow-up-table': ElearningFollowUpTable,
    'attendance-table': AttendanceTable,
    'ni-expanding-table': ExpandingTable,
    'questionnaire-answers-cell': QuestionnaireAnswersCell,
    'ni-bi-color-button': BiColorButton,
    'ni-banner': Banner,
    'ni-questionnaire-qrcode-cell': QuestionnaireQRCodeCell,
    'completion-certificate-table': CompletionCertificateTable,
    'ni-primary-button': PrimaryButton,
    'completion-certificate-addition-modal': CompletionCertificateAdditionModal,
  },
  props: {
    profileId: { type: String, required: true },
  },
  setup (props) {
    const { profileId } = toRefs(props);
    const $store = useStore();
    const $router = useRouter();
    const $q = useQuasar();

    const questionnaires = ref([]);
    const unsubscribedAttendances = ref([]);
    const columns = ref([
      { name: 'name', label: 'Nom', field: 'trainee', align: 'left' },
      { name: 'unexpectedAttendances', label: 'Emargements imprévus', field: 'attendancesCount', align: 'center' },
      { name: 'duration', label: 'Durée', field: 'duration', align: 'center' },
      { name: 'expand', label: '', field: '' },
    ]);
    const pagination = ref({ sortBy: 'name', ascending: true, page: 1, rowsPerPage: 15 });
    const questionnaireQRCodes = ref([]);
    const questionnaireTypes = ref([]);
    const completionCertificateColumns = ref([
      {
        name: 'traineeName',
        label: 'Prénom / Nom de l’apprenant',
        field: row => formatIdentity(row.trainee.identity, 'FL'),
        align: 'left',
        sortable: true,
        sort: sortStrings,
      },
      {
        name: 'month',
        label: 'Mois',
        sortable: true,
        field: 'month',
        sort: (a, b) => ascendingSort(CompaniDate(a, MM_YYYY), CompaniDate(b, MM_YYYY)),
        format: row => CompaniDate(row, MM_YYYY).format('LLLL yyyy'),
        align: 'left',
      },
      { name: 'actions', label: '', field: '', align: 'right' },
    ]);
    const newCompletionCertificate = ref({ trainee: '', month: '' });
    const completionCertificateAdditionModal = ref(false);
    const modalLoading = ref(false);

    const course = computed(() => $store.state.course.course);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const {
      isClientInterface,
      pdfLoading,
      isIntraOrIntraHoldingOrVendor,
      isArchived,
      disableAttendanceSheetDownload,
      followUpDisabled,
      followUpMissingInfo,
      downloadAttendanceSheet,
      vendorRole,
      isVendorInterface,
      isSingleCourse,
    } = useCourses(course);
    const { learners, getFollowUp, learnersLoading } = useTraineeFollowUp(profileId);

    const isRofOrVendorAdmin = computed(() => [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole.value));

    const areQuestionnaireAnswersVisible = computed(() => questionnaires.value.length);

    const areQuestionnaireQRCodeVisible = computed(() => questionnaireQRCodes.value.length);

    const areQuestionnaireVisible = computed(() => (!isClientInterface && !isSingleCourse.value &&
      (areQuestionnaireAnswersVisible.value || areQuestionnaireQRCodeVisible.value)));

    const courseHasElearningStep = computed(() => course.value.subProgram.steps.some(step => step.type === E_LEARNING));

    const canReadCompletionCertificate = computed(() => {
      const ability = defineAbilitiesForCourse(pick(loggedUser.value, ['role']));

      return ability.can('read', subject('Course', course.value), 'certificates');
    });

    const disableDownloadCompletionCertificates =
      computed(() => disableAttendanceSheetDownload.value || !get(course.value, 'subProgram.program.learningGoals'));

    const {
      completionCertificates,
      tableLoading,
      disableButton,
      getCompletionCertificates,
      generateCompletionCertificateFile,
    } = useCompletionCertificates();

    const hasCompletionCertificate = computed(() => (completionCertificates.value || []).length);

    const rules = computed(() => ({ newCompletionCertificate: { trainee: { required }, month: { required } } }));
    const v$ = useVuelidate(rules, { newCompletionCertificate });

    const loggedUserIsCourseTrainer = computed(() => course.value.trainers
      .map(t => t._id)
      .includes(loggedUser.value._id));

    const filteredQuestionnaires = computed(() => (loggedUserIsCourseTrainer.value
      ? questionnaires.value.filter(q => q.type !== SELF_POSITIONNING)
      : questionnaires.value));

    const endSelfPositionningQuestionnaireId = computed(() => {
      const selfPositionningQ = questionnaires.value.find(q => q.type === SELF_POSITIONNING && q.histories.length);

      return get(selfPositionningQ, '_id') || '';
    });

    const endSelfPositionningHistoryCount = computed(() => questionnaires.value
      .flatMap(q => q.histories.filter(h => h.timeline === END_COURSE))
      .length);

    const selfPositionningHistoryValidatedCount = computed(() => questionnaires.value
      .flatMap(q => q.histories.filter(h => !!h.isValidated))
      .length);

    const isMonthlyCertificateMode = computed(() => course.value.certificateGenerationMode === MONTHLY);

    const monthOptions = computed(() => {
      const monthWithHistories = [
        ...new Set(
          learners.value
            .flatMap(l => l.steps
              .flatMap(s => s.activities
                .flatMap(a => a.activityHistories.map(ah => CompaniDate(ah.date).format(MM_YYYY)))))
        ),
      ];
      const monthWithSlots = [
        ...new Set(
          course.value.slots
            .filter(slot => CompaniDate().isSameOrAfter(CompaniDate(slot.startDate).startOf('month')))
            .map(slot => CompaniDate(slot.startDate).format(MM_YYYY))
        ),
      ];
      const completionCertificatesByMonth = groupBy(completionCertificates.value, 'month');

      return [...new Set([...monthWithSlots, ...monthWithHistories])]
        .filter(month => !completionCertificatesByMonth[month] ||
          course.value.trainees.length !== completionCertificatesByMonth[month].length)
        .map(month => ({ label: CompaniDate(month, MM_YYYY).format('MMMM yyyy'), value: month }))
        .sort(descendingSortBy('value', MM_YYYY));
    });

    const traineeOptions = computed(() => formatAndSortIdentityOptions(course.value.trainees));

    const loggedUserHolding = computed(() => get(loggedUser.value, 'holding._id'));

    const refreshQuestionnaires = async () => {
      try {
        questionnaires.value = await Courses.getCourseQuestionnaires(course.value._id);
      } catch (e) {
        console.error(e);
        questionnaires.value = [];
        NotifyNegative('Erreur lors de la récupération des questionnaires.');
      }
    };

    const goToQuestionnaireAnswers = questionnaireType => ({
      name: 'ni pedagogy questionnaire answers',
      query: { courseId: course.value._id, questionnaireType },
    });

    const formatTraineeAttendances = (attendancesGroupedByTrainee, traineeId) => ({
      _id: traineeId,
      trainee: formatIdentity(attendancesGroupedByTrainee[traineeId][0].trainee.identity, 'FL'),
      attendancesCount: attendancesGroupedByTrainee[traineeId].length,
      duration: CompaniDuration(getISOTotalDuration(attendancesGroupedByTrainee[traineeId].map(a => a.courseSlot)))
        .format(SHORT_DURATION_H_MM),
      attendances: [...attendancesGroupedByTrainee[traineeId]]
        .sort((a, b) => ascendingSort(a.courseSlot.startDate, b.courseSlot.startDate))
        .map(a => ({
          _id: a._id,
          date: CompaniDate(a.courseSlot.startDate).format(DD_MM_YYYY),
          hours: formatSlotSchedule(a.courseSlot),
          trainers: a.trainers.map(t => formatIdentity(t.identity, 'FL')).join(', '),
          misc: a.misc,
        })),
    });

    const getUnsubscribedAttendances = async () => {
      try {
        const query = {
          course: course.value._id,
          ...(isClientInterface && {
            ...loggedUserHolding.value
              ? { holding: loggedUserHolding.value }
              : { company: loggedUser.value.company._id },
          }),
        };
        const unsubscribedAttendancesGroupedByTrainees = await Attendances.listUnsubscribed(query);
        unsubscribedAttendances.value = Object.keys(unsubscribedAttendancesGroupedByTrainees)
          .map(traineeId => formatTraineeAttendances(unsubscribedAttendancesGroupedByTrainees, traineeId));
      } catch (e) {
        console.error(e);
        unsubscribedAttendances.value = [];
        NotifyNegative('Erreur lors de la récupération des émargements annexes.');
      }
    };

    const downloadCCFile = async (format, type, zipName) => {
      try {
        const zip = await Courses.downloadCompletionCertificates(course.value._id, { format, type, isClientInterface });
        downloadZip(zip, zipName);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement du document.');
      } finally {
        pdfLoading.value = false;
      }
    };

    const downloadCompletionCertificates = async (type) => {
      if (disableDownloadCompletionCertificates.value) return;

      try {
        pdfLoading.value = true;
        const docType = type === OFFICIAL ? 'certificats' : 'attestations';
        const formattedName = formatDownloadName(`${docType} ${composeCourseName(course.value, true)}`);
        const zipName = `${formattedName}.zip`;

        if (isClientInterface || !isRofOrVendorAdmin.value) {
          await downloadCCFile(ALL_PDF, type, zipName);
        } else {
          $q.dialog({
            title: 'Définir le format des documents',
            message: `<div class="text-copper-grey-600 q-mt-sm">
              Choisir l'extension des documents que vous souhaitez télécharger
              </div>`,
            options: {
              type: 'radio',
              model: ALL_WORD,
              items: [
                { label: 'Format Word (.docx)', value: ALL_WORD },
                { label: 'Format PDF (.pdf)', value: ALL_PDF },
              ],
            },
            html: true,
            ok: 'OK',
            cancel: 'Annuler',
          }).onOk(value => downloadCCFile(value, type, zipName))
            .onCancel(() => {
              NotifyPositive('Téléchargement annulé.');
              pdfLoading.value = false;
            });
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement des attestations.');
      }
    };

    const getQuestionnaireQRCode = async () => {
      try {
        const publishedQuestionnaires = await Questionnaires.list({ course: profileId.value });
        questionnaireTypes.value = publishedQuestionnaires.map(q => q.type).sort((a, b) => sortStrings(a, b));

        if (publishedQuestionnaires.length) {
          if (questionnaireTypes.value.includes(EXPECTATIONS)) {
            const img = await Questionnaires.getQRCode({ course: profileId.value, courseTimeline: START_COURSE });
            questionnaireQRCodes.value.push({ img, courseTimeline: START_COURSE });
          }
          if (questionnaireTypes.value.includes(END_OF_COURSE)) {
            const img = await Questionnaires.getQRCode({ course: profileId.value, courseTimeline: END_COURSE });
            questionnaireQRCodes.value.push({ img, courseTimeline: END_COURSE });
          }
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des questionnaires et des QR codes associés.');
      }
    };

    const filterQuestionnaireTypes = courseTimeline => questionnaireTypes.value
      .filter(qType => (courseTimeline === START_COURSE ? qType !== END_OF_COURSE : qType !== EXPECTATIONS));

    const goToQuestionnaireProfile = (courseTimeline) => {
      const questionnaire = $router.resolve({
        name: 'ni questionnaires',
        query: { courseId: profileId.value, courseTimeline },
      });

      window.open(questionnaire.href, '_blank');
    };

    const goToSelfPositionningAnswers = () => $router.push(
      {
        name: 'trainers questionnaire answers',
        params: { questionnaireId: endSelfPositionningQuestionnaireId.value },
        query: { courseId: course.value._id },
      }
    );

    const refreshCompletionCertificates = async () => {
      try {
        await getCompletionCertificates({ course: course.value._id });
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
        NotifyPositive('Document supprimé.');

        await refreshCompletionCertificates();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du document.');
      } finally {
        disableButton.value = false;
      }
    };

    const validateCompletionCertificateDeletion = async (completionCertificateId) => {
      try {
        $q.dialog({
          title: 'Confirmation',
          message: 'Êtes-vous sûr(e) de vouloir supprimer ce document&nbsp;?',
          html: true,
          ok: true,
          cancel: 'Annuler',
        }).onOk(() => deleteCompletionCertificateFile(completionCertificateId))
          .onCancel(() => NotifyPositive('Suppression annulée.'));
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du document.');
      }
    };

    const openCompletionCertificatesModal = () => {
      const hasCourseSlots = course.value.slots.length;
      const hasCourseTrainees = course.value.trainees.length;
      if (!hasCourseSlots) return NotifyWarning('Au moins un créneau doit être rattaché à la formation.');
      if (!hasCourseTrainees) return NotifyWarning('Au moins un·e apprenant·e doit être rattaché·e à la formation.');
      if (!monthOptions.value.length) {
        return NotifyWarning('Il existe déjà un certificat par apprenant pour tous les mois de formation.');
      }

      if (course.value.trainees.length === 1) newCompletionCertificate.value.trainee = course.value.trainees[0]._id;
      if (monthOptions.value.length === 1) newCompletionCertificate.value.month = monthOptions.value[0].value;

      completionCertificateAdditionModal.value = true;
    };

    const resetCompletionCertificateAdditionModal = () => {
      newCompletionCertificate.value = { trainee: '', month: '' };
      v$.value.newCompletionCertificate.$reset();
    };

    const addCompletionCertificate = async () => {
      try {
        v$.value.newCompletionCertificate.$touch();
        if (v$.value.newCompletionCertificate.$error) return NotifyWarning('Champs requis');

        modalLoading.value = true;
        await CompletionCertificates.create({ ...newCompletionCertificate.value, course: course.value._id });

        completionCertificateAdditionModal.value = false;
        await refreshCompletionCertificates();
      } catch (e) {
        console.error(e);
        if (!!e.data.message && (e.status === 403 || e.status === 409)) NotifyNegative(e.data.message);
        else NotifyNegative('Erreur lors de l\'ajout du certificat.');
      } finally {
        modalLoading.value = false;
      }
    };

    const created = async () => {
      const promises = [getFollowUp()];
      if (!isSingleCourse.value) {
        promises.push(getUnsubscribedAttendances());
        if (!isClientInterface) promises.push(refreshQuestionnaires(), getQuestionnaireQRCode());
      }

      if (isMonthlyCertificateMode.value && canReadCompletionCertificate.value) {
        const params = { course: course.value._id };

        if (isClientInterface) {
          if (loggedUserHolding.value) {
            params.companies = loggedUserHolding.value.companies;
          } else {
            params.companies = [loggedUser.value.company._id];
          }
        }

        promises.push(getCompletionCertificates(params));
      }

      await Promise.all(promises);
    };

    created();

    return {
      // Validation
      v$,
      // Data
      questionnaires,
      unsubscribedAttendances,
      columns,
      pagination,
      isIntraOrIntraHoldingOrVendor,
      learners,
      learnersLoading,
      questionnaireQRCodes,
      isClientInterface,
      questionnaireTypes,
      EXPECTATIONS,
      END_OF_COURSE,
      OFFICIAL,
      CUSTOM,
      START_COURSE,
      completionCertificates,
      completionCertificateColumns,
      tableLoading,
      isVendorInterface,
      completionCertificateAdditionModal,
      newCompletionCertificate,
      modalLoading,
      disableButton,
      // Computed
      course,
      courseHasElearningStep,
      disableDownloadCompletionCertificates,
      followUpDisabled,
      followUpMissingInfo,
      disableAttendanceSheetDownload,
      isArchived,
      areQuestionnaireAnswersVisible,
      areQuestionnaireVisible,
      areQuestionnaireQRCodeVisible,
      isRofOrVendorAdmin,
      canReadCompletionCertificate,
      filteredQuestionnaires,
      endSelfPositionningQuestionnaireId,
      loggedUserIsCourseTrainer,
      endSelfPositionningHistoryCount,
      selfPositionningHistoryValidatedCount,
      isMonthlyCertificateMode,
      monthOptions,
      hasCompletionCertificate,
      traineeOptions,
      // Methods
      get,
      formatQuantity,
      goToQuestionnaireAnswers,
      downloadCompletionCertificates,
      downloadAttendanceSheet,
      goToQuestionnaireProfile,
      goToSelfPositionningAnswers,
      filterQuestionnaireTypes,
      openCompletionCertificatesModal,
      resetCompletionCertificateAdditionModal,
      addCompletionCertificate,
      generateCompletionCertificate,
      validateCompletionCertificateDeletion,
    };
  },
};
</script>

<style lang="sass" scoped>
.questionnaires-container
  display: grid
  grid-auto-flow: row
  grid-auto-rows: 1fr
  grid-template-columns: repeat(auto-fill, 224px)
  grid-gap: 16px

.dates
  width: 10%

.hours
  width: 15%

.trainers
  display: inline-block
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.misc
  width: 15%

.expanding-table-expanded-row
  justify-content: flex-start
  div
    justify-content: center
    align-items: center
    justify-content: flex-start
    margin-right: 2%
    word-break: break-word

.questionnaire-link-container
  margin-bottom: 24px
  display: grid
  grid-auto-flow: row
  grid-gap: 24px
  grid-template-rows: auto
  @media screen and (min-width: 768px)
    grid-auto-rows: 1fr
    grid-template-columns: repeat(2, 1fr)
</style>
