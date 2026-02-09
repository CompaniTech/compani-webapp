<template>
  <q-page class="vendor-background" padding>
    <ni-profile-header title="Réponses aux questionnaires" :header-info="headerInfo">
      <template #title>
        <div class="selector-container">
          <ni-select :model-value="selectedQuestionnaireType" @update:model-value="updateSelectedQuestionnaireType"
            caption="Type de questionnaire" :options="questionnaireOptions" clearable />
          <ni-select v-if="selectedQuestionnaireType === SELF_POSITIONNING" :model-value="selectedProgram"
            @update:model-value="updateSelectedProgram" caption="Programme" :options="programOptions" clearable
            :disable="!isRofOrVendorAdmin" />
        </div>
      </template>
    </ni-profile-header>
    <template v-if="selectedQuestionnaireId">
      <profile-answers v-if="courseId && Object.keys(course).length" :profile-id="selectedQuestionnaireId"
        :course="course" :is-self-positionning-answers="selectedQuestionnaireType === SELF_POSITIONNING" />
      <profile-answers v-else-if="!courseId" :profile-id="selectedQuestionnaireId"
        :is-self-positionning-answers="selectedQuestionnaireType === SELF_POSITIONNING" />
    </template>
  </q-page>
</template>

<script>
import { ref, computed, watch, toRefs, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import pick from 'lodash/pick';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import ProfileAnswers from 'src/modules/vendor/components/questionnaires/ProfileAnswers';
import { composeCourseName } from '@helpers/courses';
import Questionnaires from '@api/Questionnaires';
import { formatAndSortOptions } from '@helpers/utils';
import { ascendingSortBy } from '@helpers/dates/utils';
import {
  QUESTIONNAIRE_TYPES,
  SELF_POSITIONNING,
  PUBLISHED,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  ARCHIVED,
} from '@data/constants';

export default {
  name: 'QuestionnaireAnswersProfile',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'profile-answers': ProfileAnswers,
  },
  props: {
    questionnaireType: { type: String, enum: QUESTIONNAIRE_TYPES, default: '' },
    courseId: { type: String, default: '' },
    programId: { type: String, default: '' },
  },
  setup (props) {
    const { courseId, questionnaireType, programId } = toRefs(props);
    const selectedQuestionnaireType = ref(questionnaireType.value || '');
    const publishedQuestionnaires = ref([]);
    const archivedQuestionnaires = ref([]);
    const selectedProgram = ref('');

    const $store = useStore();

    const course = computed(() => pick(
      $store.state.course.course,
      ['_id', 'companies', 'subProgram.program', 'trainers', 'type', 'holding', 'misc', 'questionnaires']
    ));

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const isRofOrVendorAdmin = computed(() => [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER]
      .includes(loggedUser.value.role.vendor.name));

    const questionnaireOptions = computed(() => Object.keys(QUESTIONNAIRE_TYPES)
      .filter((type) => {
        const courseHasSelfPositionningQ = !courseId.value || publishedQuestionnaires.value
          .find(q => get(q, 'program._id') === get(course.value, 'subProgram.program._id'));

        return (!isRofOrVendorAdmin.value || !courseHasSelfPositionningQ) ? type !== SELF_POSITIONNING : true;
      })
      .map(type => ({ label: QUESTIONNAIRE_TYPES[type], value: type })));

    const isInCourseQuestionnaires = q => !get(course.value, 'questionnaires.length') ||
      course.value.questionnaires.includes(q._id);

    const selectedQuestionnaireId = computed(() => {
      const questionnairesList = [
        ...publishedQuestionnaires.value,
        ...get(course.value, 'questionnaires.length') ? archivedQuestionnaires.value : [],
      ];

      const selectedQuestionnaire = selectedQuestionnaireType.value === SELF_POSITIONNING
        ? questionnairesList.find(q => get(q, 'program._id') === selectedProgram.value && isInCourseQuestionnaires(q))
        : questionnairesList.find(q => q.type === selectedQuestionnaireType.value && isInCourseQuestionnaires(q));

      return get(selectedQuestionnaire, '_id');
    });

    const programOptions = computed(() => formatAndSortOptions(
      publishedQuestionnaires.value.filter(q => q.program).map(q => q.program),
      'name'
    ));

    const headerInfo = computed(() => {
      const courseName = isRofOrVendorAdmin.value
        ? ''
        : get(course.value, 'subProgram') && composeCourseName(course.value, true);

      return courseName ? [{ icon: 'bookmark_border', label: courseName }] : [];
    });

    const updateSelectedQuestionnaireType = (value) => { selectedQuestionnaireType.value = value; };

    const updateSelectedProgram = (value) => { selectedProgram.value = value; };

    const getPublishedQuestionnaires = async () => {
      const questionnaires = await Questionnaires.list();

      publishedQuestionnaires.value = questionnaires.filter(q => q.status === PUBLISHED);
      archivedQuestionnaires.value = questionnaires
        .filter(q => q.status === ARCHIVED)
        .sort(ascendingSortBy('archivedAt'));
    };

    const refreshCourse = async () => {
      try {
        await $store.dispatch('course/fetchCourse', { courseId: courseId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const created = async () => {
      await getPublishedQuestionnaires();
      if (courseId.value) {
        await refreshCourse();

        selectedProgram.value = get(course, 'value.subProgram.program._id');
      }

      if (programId.value) selectedProgram.value = programId.value;
    };

    created();

    watch(selectedQuestionnaireType, () => {
      selectedProgram.value = selectedQuestionnaireType.value === SELF_POSITIONNING
        ? get(programId, 'value') || get(course, 'value.subProgram.program._id') || ''
        : '';
    });

    onBeforeUnmount(() => { $store.dispatch('course/resetCourse'); });

    return {
      // Data
      selectedQuestionnaireType,
      questionnaireOptions,
      publishedQuestionnaires,
      selectedProgram,
      SELF_POSITIONNING,
      // Computed
      selectedQuestionnaireId,
      programOptions,
      course,
      isRofOrVendorAdmin,
      headerInfo,
      // Methods
      updateSelectedQuestionnaireType,
      updateSelectedProgram,
    };
  },
};
</script>

<style lang="sass" scoped>
.selector-container
  display: grid
  grid-auto-flow: column
  grid-template-columns: auto
  justify-content: center
  grid-gap: 24px
  @media screen and (max-width: 767px)
    grid-auto-flow: row
    grid-template-rows: auto
    grid-gap: 0px
</style>
