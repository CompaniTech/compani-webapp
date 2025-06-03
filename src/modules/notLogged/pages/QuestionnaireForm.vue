<template>
  <compani-header />
  <div class="questionnaire-container">
    <template v-if="cards.length">
      <meta-infos v-if="!isQuestionnaireAnswered" :course="course" :questionnaires="questionnaires"
        :trainee-name="traineeName" :display-name="!isStartorEndCard" />
      <start v-if="cardIndex === startCardIndex" :course="course" :trainee="trainee" :validations="v$"
        :end-card-index="endCardIndex" @update-trainee="updateTrainee" />
      <template v-for="(card, index) of cards" :key="card._id">
        <card-template v-if="cardIndex === index" :card="card" />
      </template>
      <end v-if="cardIndex === endCardIndex && !isQuestionnaireAnswered" :trainee-name="traineeName"
        :loading="btnLoading" @submit="createHistory" />
      <span v-if="cardIndex === endCardIndex && isQuestionnaireAnswered" class="end-text">
        Merci d'avoir répondu au questionnaire ! Vous pouvez à présent fermer la fenêtre.
      </span>
    </template>
    <div v-else class="end-text">
      Oups, une erreur est survenue.
      Ce questionnaire n'est pas encore accessible ou ne l'est plus.
      <ni-banner icon="info_outline" class="end-text-banner">
        <template #message>
          <li>le questionnaire de recueil des attentes est disponible jusqu'à la fin du créneau de mi-formation</li>
          <li>
            le questionnaire de fin de formation est disponible à partir du début de la journée du dernier créneau
          </li>
        </template>
      </ni-banner>
      Merci de fermer cette page.
    </div>
  </div>
</template>

<script>
import { useMeta } from 'quasar';
import { toRefs, ref, computed } from 'vue';
import get from 'lodash/get';
import { AxiosError } from 'axios';
import { useStore } from 'vuex';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import Courses from '@api/Courses';
import Questionnaires from '@api/Questionnaires';
import QuestionnaireHistories from '@api/QuestionnaireHistories';
import CompaniHeader from '@components/CompaniHeader';
import MetaInfos from '@components/questionnaires/cards/MetaInfos';
import Start from '@components/questionnaires/cards/Start';
import End from '@components/questionnaires/cards/End';
import CardTemplate from '@components/questionnaires/cards/CardTemplate';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import Banner from '@components/Banner';
import { INCREMENT, START_CARD_INDEX, START_COURSE, EXPECTATIONS, END_OF_COURSE, END_COURSE } from '@data/constants';
import { formatIdentity, sortStrings } from '@helpers/utils';

export default {
  name: 'QuestionnaireForm',
  props: {
    courseId: { type: String, required: true },
    courseTimeline: { type: String, required: true },
  },
  components: {
    'compani-header': CompaniHeader,
    'meta-infos': MetaInfos,
    start: Start,
    end: End,
    'card-template': CardTemplate,
    'ni-banner': Banner,
  },
  setup (props) {
    const metaInfo = { title: 'Formulaire de réponse au questionnaire' };
    useMeta(metaInfo);

    const { courseId, courseTimeline } = toRefs(props);
    const course = ref({});
    const questionnaires = ref([]);
    const cards = ref([]);
    const trainee = ref('');
    const btnLoading = ref(false);
    const startCardIndex = ref(START_CARD_INDEX);
    const endCardIndex = ref(0);
    const isQuestionnaireAnswered = ref(false);

    const $store = useStore();
    const cardIndex = computed(() => $store.state.questionnaire.cardIndex);

    const rules = computed(() => ({ trainee: { required } }));
    const v$ = useVuelidate(rules, { trainee });

    const getCourse = async () => {
      try {
        const fetchedCourse = await Courses.getFromNotLogged(courseId.value);
        course.value = fetchedCourse;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des informations de la formation.');
      }
    };

    const getQuestionnaires = async () => {
      try {
        const fetchedQuestionnaires = await Questionnaires.getFromNotLogged({ course: courseId.value });
        const questionnaireTypes = fetchedQuestionnaires.map(q => q.type);
        const isAfterMiddleCourse = !questionnaireTypes.includes(EXPECTATIONS);
        const isBeforeEndOfCourse = !questionnaireTypes.includes(END_OF_COURSE);

        if ((courseTimeline.value === START_COURSE && isAfterMiddleCourse) ||
          (courseTimeline.value === END_COURSE && isBeforeEndOfCourse)) {
          questionnaires.value = [];
        } else {
          questionnaires.value = [...fetchedQuestionnaires]
            .sort((a, b) => sortStrings(a.type, b.type))
            .filter(q => (courseTimeline.value === START_COURSE ? q.type !== END_OF_COURSE : q.type !== EXPECTATIONS));
        }

        cards.value = questionnaires.value.map(q => q.cards).flat();
        endCardIndex.value = cards.value.length;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des informations de la formation.');
      }
    };

    const updateTrainee = (t) => { trainee.value = t; };

    const createHistory = async () => {
      try {
        btnLoading.value = true;
        const promises = [];

        if (questionnaires.value.length === 1) {
          const payload = {
            course: course.value._id,
            questionnaire: questionnaires.value[0]._id,
            user: trainee.value,
            questionnaireAnswersList: $store.state.questionnaire.answerList,
          };
          promises.push(QuestionnaireHistories.create(payload));
        } else {
          const cardQuestionnaireList = Object
            .fromEntries(questionnaires.value.map(q => q.cards.map(c => [c._id, q._id])).flat());
          const answersGroupedByQuestionnaire = Object.fromEntries(questionnaires.value.map(q => [q._id, []]));

          for (const answer of $store.state.questionnaire.answerList) {
            answersGroupedByQuestionnaire[cardQuestionnaireList[answer.card]].push(answer);
          }

          for (const [questionnaireId, answers] of Object.entries(answersGroupedByQuestionnaire)) {
            const payload = {
              course: course.value._id,
              questionnaire: questionnaireId,
              user: trainee.value,
              questionnaireAnswersList: answers,
            };
            promises.push(QuestionnaireHistories.create(payload));
          }
        }

        const results = await Promise.allSettled(promises);
        if (results.every(r => r.status === 'rejected')) throw new AxiosError(results[0].reason);

        NotifyPositive('Réponse enregistrée.');
        isQuestionnaireAnswered.value = true;
      } catch (e) {
        console.error(e);

        if (get(e, 'response.status') === 409) return NotifyNegative(e.response.data.message);
        if (get(e, 'message.response.status') === 409) return NotifyNegative(e.message.response.data.message);
        NotifyNegative('Erreur lors de l\'enregistrement des réponses au questionnaire.');
      } finally {
        btnLoading.value = false;
      }
    };

    const traineeName = computed(() => {
      const trainees = get(course.value, 'trainees') || [];
      const traineeIdentity = get(trainees.find(t => t._id === trainee.value), 'identity');

      return formatIdentity(traineeIdentity, 'FL');
    });

    const isStartorEndCard = computed(() => [startCardIndex.value, endCardIndex.value].includes(cardIndex.value));

    const created = async () => {
      await Promise.all([getCourse(), getQuestionnaires()]);
    };

    created();

    return {
      // Data
      course,
      questionnaires,
      cards,
      trainee,
      INCREMENT,
      btnLoading,
      startCardIndex,
      isQuestionnaireAnswered,
      // Computed
      cardIndex,
      endCardIndex,
      traineeName,
      isStartorEndCard,
      // Methods
      updateTrainee,
      createHistory,
      // Validations
      v$,
    };
  },
};
</script>
<style lang="sass" scoped>
.end-text
  text-align: center
  color: $primary
  &-banner
    margin: 12px 0px
    text-align: start
    background: $copper-grey-200
</style>
