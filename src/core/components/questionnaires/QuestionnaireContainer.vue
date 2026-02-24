<template>
  <div v-for="group in questionnairesByType" :key="group.type" class="q-mb-lg ">
    <div class="text-weight-bold">{{ QUESTIONNAIRE_TYPES[group.type] }}</div>
    <div v-if="group.list" class="row">
      <router-link v-for="(questionnaire, index) in group.list" :key="questionnaire._id"
        :to="goToQuestionnaireProfile(questionnaire._id, group.list)">
        <questionnaire-cell :index="group.list.length - index" :questionnaire="questionnaire"
          class="q-my-md q-mr-md" />
      </router-link>
    </div>
    <div v-else class="text-italic q-mb-md">Aucun questionnaire "{{ QUESTIONNAIRE_TYPES[group.type] }}"</div>
  </div>
  <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Créer un questionnaire"
    @click="questionnaireCreationModal = true" :disable="loading" />

  <questionnaire-creation-modal v-model="questionnaireCreationModal" @hide="resetCreationModal"
    :loading="modalLoading" @submit="createQuestionnaire" :validations="v$.newQuestionnaire"
    v-model:new-questionnaire="newQuestionnaire" :program-id="programId" />
</template>

<script>
import { ref, computed, toRefs } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import groupBy from 'lodash/groupBy';
import Questionnaires from '@api/Questionnaires';
import QuestionnaireCell from '@components/courses/QuestionnaireCell';
import QuestionnaireCreationModal from 'src/modules/vendor/components/programs/QuestionnaireCreationModal';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { QUESTIONNAIRE_TYPES, SELF_POSITIONNING, PUBLISHED, DRAFT } from '@data/constants';
import { descendingSortBy } from '@helpers/dates/utils';

export default {
  name: 'QuestionnaireContainer',
  components: {
    'questionnaire-creation-modal': QuestionnaireCreationModal,
    'questionnaire-cell': QuestionnaireCell,
  },
  props: {
    profileId: { type: String, default: '' },
  },
  setup (props) {
    const { profileId: programId } = toRefs(props);
    const loading = ref(false);
    const questionnairesByType = ref([]);
    const modalLoading = ref(false);
    const questionnaireCreationModal = ref(false);
    const newQuestionnaire = ref(programId.value
      ? { name: '', type: SELF_POSITIONNING, program: programId.value }
      : { name: '', type: '' });

    const rules = computed(() => ({ newQuestionnaire: { name: { required }, type: { required } } }));
    const v$ = useVuelidate(rules, { newQuestionnaire });

    const goToQuestionnaireProfile = (questionnaireId, questionnaireList) => {
      const isQuestionnaireDraft = questionnaireList.find(q => q._id === questionnaireId && q.status === DRAFT);
      const publishedQuestionnaire = isQuestionnaireDraft
        ? questionnaireList.find(q => q._id !== questionnaireId && q.status === PUBLISHED)
        : null;

      return {
        name: 'ni pedagogy questionnaire profile',
        params: { questionnaireId },
        ...publishedQuestionnaire && { query: { publishedQuestionnaire: publishedQuestionnaire.name } },
      };
    };

    const refreshQuestionnaires = async () => {
      try {
        loading.value = true;
        const query = programId.value ? { program: programId.value } : {};
        const questionnaires = await Questionnaires.list(query);

        const questionnairesGroups = groupBy(
          questionnaires.sort(descendingSortBy('createdAt')),
          q => q.type
        );

        const questionnaireTypes = programId.value
          ? [SELF_POSITIONNING]
          : Object.keys(QUESTIONNAIRE_TYPES).filter(type => type !== SELF_POSITIONNING);

        questionnairesByType.value = questionnaireTypes
          .map(type => ({ type, list: questionnairesGroups[type] }));
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des questionnaires.');
        questionnairesByType.value = [];
      } finally {
        loading.value = false;
      }
    };

    const resetCreationModal = () => {
      v$.value.newQuestionnaire.$reset();
      newQuestionnaire.value = programId.value
        ? { name: '', type: SELF_POSITIONNING, program: programId.value }
        : { name: '', type: '' };
    };

    const createQuestionnaire = async () => {
      try {
        v$.value.newQuestionnaire.$touch();
        if (v$.value.newQuestionnaire.$error) return NotifyWarning('Champ(s) invalide(s)');

        modalLoading.value = true;
        await Questionnaires.create(newQuestionnaire.value);

        questionnaireCreationModal.value = false;
        NotifyPositive('Questionnaire créé.');
        await refreshQuestionnaires();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyWarning(e.data.message);
        NotifyNegative('Erreur lors de la création du questionnaire.');
      } finally {
        modalLoading.value = false;
      }
    };

    const created = async () => {
      await refreshQuestionnaires();
    };

    created();

    return {
      // Data
      loading,
      questionnairesByType,
      QUESTIONNAIRE_TYPES,
      modalLoading,
      questionnaireCreationModal,
      newQuestionnaire,
      programId,
      // Methods
      goToQuestionnaireProfile,
      refreshQuestionnaires,
      resetCreationModal,
      createQuestionnaire,
      // Validations
      v$,
    };
  },
};
</script>
