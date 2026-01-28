<template>
  <q-page padding class="vendor-background column no-wrap">
    <template v-if="questionnaire">
      <ni-profile-header :title="questionnaireName" :header-info="headerInfo">
        <template #title v-if="questionnaire.status !== DRAFT">
          <ni-primary-button label="Voir les réponses" @click="goToQuestionnaireProfileAnswers" />
        </template>
      </ni-profile-header>
      <profile-edition :profile-id="questionnaireId" class="edition"
        :other-published-questionnaire="otherPublishedQuestionnaire" />
    </template>
  </q-page>
</template>

<script>
import { createMetaMixin } from 'quasar';
import { ref, computed, watch, onBeforeUnmount, toRefs } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import ProfileHeader from '@components/ProfileHeader';
import { DRAFT, QUESTIONNAIRE_TYPES, SELF_POSITIONNING, ARCHIVED } from '@data/constants';
import PrimaryButton from '@components/PrimaryButton';
import ProfileEdition from 'src/modules/vendor/components/questionnaires/ProfileEdition';
import { useRouter } from 'vue-router';

const metaInfo = { title: 'Fiche questionnaire' };

export default {
  name: 'QuestionnaireProfile',
  props: {
    questionnaireId: { type: String, required: true },
    otherPublishedQuestionnaire: { type: String, default: '' },
  },
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-primary-button': PrimaryButton,
    'profile-edition': ProfileEdition,
  },
  mixins: [createMetaMixin(metaInfo)],
  setup (props) {
    const { questionnaireId } = toRefs(props);
    const questionnaireName = ref('');

    const $router = useRouter();

    const $store = useStore();

    const questionnaire = computed(() => $store.state.questionnaire.questionnaire);
    const headerInfo = computed(() => {
      const infos = [{ icon: 'bookmark_border', label: QUESTIONNAIRE_TYPES[questionnaire.value.type] }];

      if (questionnaire.value.status === DRAFT) infos.push({ icon: 'edit', label: 'Brouillon', class: 'info-warning' });
      else if (questionnaire.value.status === ARCHIVED) {
        infos.push({ icon: 'circle', label: 'Archivé', class: 'info-archived' });
      } else infos.push({ icon: 'check_circle', label: 'Publié', class: 'info-active' });

      return infos;
    });

    watch(questionnaire, () => { refreshProgramName(); });

    const refreshProgramName = () => { questionnaireName.value = get(questionnaire.value, 'name') || ''; };

    const refreshQuestionnaire = async () => {
      await $store.dispatch('questionnaire/fetchQuestionnaire', { questionnaireId: questionnaireId.value });
    };

    const goToQuestionnaireProfileAnswers = () => {
      const query = questionnaire.value.type === SELF_POSITIONNING
        ? { questionnaireType: questionnaire.value.type, programId: questionnaire.value.program }
        : { questionnaireType: questionnaire.value.type };

      $router.push({ name: 'ni pedagogy questionnaire answers', query });
    };

    const created = async () => {
      await refreshQuestionnaire();
      refreshProgramName();
    };

    onBeforeUnmount(() => { $store.dispatch('questionnaire/resetQuestionnaire'); });

    created();

    return {
      // Data
      questionnaireName,
      DRAFT,
      // Computed
      questionnaire,
      headerInfo,
      // Methods
      goToQuestionnaireProfileAnswers,
    };
  },
};
</script>

<style lang="sass" scoped>
.edition
  flex: 1
</style>
