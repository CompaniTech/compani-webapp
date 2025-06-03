<template>
  <q-page padding class="vendor-background">
    <ni-profile-header title="Auto-positionnement : réponses" :header-info="headerInfo" class="q-mb-xl">
      <template #title>
        <ni-select caption="Apprenant(e)" :options="traineeOptions" :model-value="selectedTrainee"
          @update:model-value="validateTraineeSelection" class="selector" clearable :blur-on-selection="false" />
      </template>
    </ni-profile-header>
    <template v-if="selectedTrainee">
      <ni-banner v-if="get(endQuestionnaireHistory, 'isValidated')" class="bg-peach-200" icon="info_outline">
        <template #message>
          Vous avez déjà validé les réponses au questionnaire d'auto-positionnement de fin pour cet apprenant.
        </template>
      </ni-banner>
        <ni-banner v-if="!endQuestionnaireHistory.isValidated" class="bg-peach-200" icon="info_outline">
          <template #message v-if="get(endQuestionnaireHistory, '_id')">
            Pour valider les réponses au questionnaire d’auto-positionnement de fin, veuillez : <br>
            <div class="q-pl-md">
              <li>
              pour chaque question : cocher “Je valide la note” ou cliquer sur “Ajuster la note” pour définir une
              nouvelle note
              </li>
              <li>renseigner un commentaire si nécessaire</li>
              <li>cliquer sur le bouton “Valider” pour enregistrer votre correction</li>
            </div>
          </template>
          <template #message v-else-if="Object.keys(filteredQuestionnaireAnswers).length">
            L'apprenant sélectionné n'a pas répondu au questionnaire d'auto-positionnement de fin de formation.
          </template>
          <template #message v-else>
            L'apprenant sélectionné n'a répondu à aucun questionnaire d'auto-positionnement pour cette formation.
          </template>
        </ni-banner>
        <self-positionning-item v-for="card of Object.values(filteredQuestionnaireAnswers)" :key="card._id" :item="card"
          @update-trainer-review="updateTrainerReview" :is-validated="endQuestionnaireHistory.isValidated" />
        <div v-if="get(endQuestionnaireHistory, '_id')" class="q-py-md">
          <ni-input caption="Commentaire général sur la progression de l’apprenant" type="textarea" :rows="5"
            v-model="trainerComment" :disable="endQuestionnaireHistory.isValidated"
            :read-only="endQuestionnaireHistory.isValidated" />
          <div class="flex justify-end">
          <ni-button v-if="!endQuestionnaireHistory.isValidated" class="bg-primary" color="white"
            label="Valider les réponses" @click="validateTrainerReview" />
          </div>
        </div>
    </template>
  </q-page>
</template>

<script>
import { toRefs, ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import get from 'lodash/get';
import omit from 'lodash/omit';
import Questionnaires from '@api/Questionnaires';
import QuestionnaireHistories from '@api/QuestionnaireHistories';
import { composeCourseName } from '@helpers/courses';
import { formatAndSortIdentityOptions } from '@helpers/utils';
import { REVIEW, INTRA, INTRA_HOLDING, START_COURSE, END_COURSE } from '@data/constants';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import Banner from '@components/Banner';
import Button from '@components/Button';
import Input from '@components/form/Input';
import SelfPositionningItem from 'src/modules/vendor/components/questionnaires/SelfPositionningItem';

export default {
  name: 'SelfPositionningAnswersProfile',
  props: {
    courseId: { type: String, required: true },
    questionnaireId: { type: String, required: true },
  },
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'self-positionning-item': SelfPositionningItem,
    'ni-banner': Banner,
    'ni-button': Button,
    'ni-input': Input,
  },
  setup (props) {
    const $q = useQuasar();
    const { courseId, questionnaireId } = toRefs(props);
    const questionnaireAnswers = ref({});
    const selectedTrainee = ref('');
    const trainerReview = ref([]);
    const trainerComment = ref('');

    const headerInfo = computed(() => {
      const { course } = questionnaireAnswers.value;
      const infos = [{ icon: 'bookmark_border', label: get(course, 'subProgram') && composeCourseName(course) }];

      if ([INTRA, INTRA_HOLDING].includes(get(course, 'type'))) {
        infos.push({ icon: 'apartment', label: get(course, 'holding.name') || course.companies[0].name });
      }
      return infos;
    });

    const traineeOptions = computed(() => {
      const trainees = get(questionnaireAnswers.value, 'course.trainees', []);
      return formatAndSortIdentityOptions(trainees);
    });

    const formatHistory = (history) => {
      const questionnaireAnswersList = history.questionnaireAnswersList
        .map((a) => {
          const { question, labels, _id } = a.card;
          return {
            cardId: _id,
            question,
            labels,
            answer: a.answerList[0],
            timeline: history.timeline,
            ...(a.trainerAnswerList && { trainerAnswer: a.trainerAnswerList[0] }),
          };
        });

      return { ...history, questionnaireAnswersList };
    };

    const filteredQuestionnaireAnswers = computed(() => {
      const followUp = get(questionnaireAnswers.value, 'followUp', []);
      const traineeFollowUp = followUp.filter(qa => qa.user === selectedTrainee.value);
      const formattedTraineeQuestionnaireHistories = traineeFollowUp.map(history => formatHistory(history));

      const historiesByQuestion = {};
      for (const history of formattedTraineeQuestionnaireHistories) {
        for (const card of history.questionnaireAnswersList) {
          historiesByQuestion[card.cardId] = {
            answers: {
              ...get(historiesByQuestion[card.cardId], 'answers'),
              ...(history.timeline === START_COURSE ? { startCourse: card.answer } : { endCourse: card.answer }),
            },
            question: card.question,
            labels: card.labels,
            card: card.cardId,
            ...(card.trainerAnswer && { trainerAnswer: card.trainerAnswer }),
          };
        }
      }

      return historiesByQuestion;
    });

    const endQuestionnaireHistory = computed(() => {
      const followUp = get(questionnaireAnswers.value, 'followUp', []);
      const traineeFollowUp = followUp.filter(qa => qa.user === selectedTrainee.value);

      return traineeFollowUp.find(qa => qa.timeline === END_COURSE) || {};
    });

    watch(() => endQuestionnaireHistory.value, () => {
      trainerComment.value = get(endQuestionnaireHistory.value, 'isValidated')
        ? get(endQuestionnaireHistory.value, 'trainerComment', '')
        : '';
    });

    const refreshQuestionnaireAnswers = async () => {
      try {
        const query = { course: courseId.value, action: REVIEW };
        questionnaireAnswers.value = await Questionnaires.getQuestionnaireAnswers(questionnaireId.value, query);
      } catch (e) {
        questionnaireAnswers.value = {};
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des réponses au questionnaire.');
      }
    };

    const updateSelectedTrainee = (traineeId) => { selectedTrainee.value = traineeId; };

    const validateTraineeSelection = (traineeId) => {
      const displayConfirmationModal = trainerReview.value.some(a => a.isValidated || a.answer) ||
        (!endQuestionnaireHistory.value.isValidated && trainerComment.value);
      if (displayConfirmationModal) {
        $q.dialog({
          title: 'Confirmation',
          message: `Êtes-vous sûr(e) de vouloir changer d'apprenant &nbsp;? Les informations renseignées pour
            ${traineeOptions.value.find(t => t.value === selectedTrainee.value).label} seront perdues.`,
          html: true,
          ok: true,
          cancel: 'Annuler',
        }).onOk(() => {
          trainerReview.value = [];
          trainerComment.value = '';

          updateSelectedTrainee(traineeId);
        })
          .onCancel(() => NotifyPositive('Changement d\'apprenant annulé.'));
      } else {
        trainerReview.value = [];
        updateSelectedTrainee(traineeId);
      }
    };

    const updateTrainerReview = (trainerReviewItem) => {
      const { card } = trainerReviewItem;

      const existingTrainerReviewItem = trainerReview.value.find(a => a.card === card);
      if (existingTrainerReviewItem) {
        trainerReview.value = trainerReview.value.map(a => (a.card === card ? trainerReviewItem : a));
      } else trainerReview.value.push(trainerReviewItem);
    };

    const updateQuestionnaireHistory = async () => {
      try {
        const payload = {
          trainerAnswers: trainerReview.value.map(a => omit(a, ['isValidated'])),
          ...(trainerComment.value && { trainerComment: trainerComment.value }),
        };

        await QuestionnaireHistories.update(endQuestionnaireHistory.value._id, payload);

        NotifyPositive('Validation des réponses enregistrée.');

        await refreshQuestionnaireAnswers();
        trainerReview.value = [];
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la validation des réponses au questionnaire.');
      }
    };

    const validateTrainerReview = async () => {
      const traineeAnswersLength = Object.values(filteredQuestionnaireAnswers.value).length;
      const trainerAnswersLength = trainerReview.value.filter(a => a.isValidated || a.answer).length;

      if (trainerAnswersLength !== traineeAnswersLength) {
        return NotifyWarning('Champ(s) invalide(s) : vous devez valider ou ajuster la note pour chaque question.');
      }

      const traineeName = traineeOptions.value.find(t => t.value === selectedTrainee.value).label;
      $q.dialog({
        title: 'Confirmation',
        message: `Êtes-vous sûr(e) de vouloir valider les réponses de ${traineeName}&nbsp;? Les informations
          renseignées seront enregistrées et non éditables.`,
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(updateQuestionnaireHistory)
        .onCancel(() => NotifyPositive('Validation des réponses annulée.'));
    };

    const created = async () => {
      await refreshQuestionnaireAnswers();
    };

    created();

    return {
      // Data
      questionnaireAnswers,
      get,
      selectedTrainee,
      trainerReview,
      trainerComment,
      // Methods
      updateTrainerReview,
      validateTrainerReview,
      validateTraineeSelection,
      // Computed
      headerInfo,
      traineeOptions,
      filteredQuestionnaireAnswers,
      endQuestionnaireHistory,
    };
  },
};
</script>

<style lang="sass" scoped>
.selector
  width: 40%
</style>
