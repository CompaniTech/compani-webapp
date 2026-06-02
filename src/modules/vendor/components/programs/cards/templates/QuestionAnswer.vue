<template>
  <div class="container">
    <ni-input caption="Question" v-model="card.question" required-field @focus="saveTmp('question')"
      @blur="updateCard('question')" :error="v$.card.question.$error" :error-message="errorMsg('question')"
      :disable="disableEdition" class="q-mb-lg" type="textarea" />
    <q-checkbox v-model="card.isMandatory" @update:model-value="updateCard('isMandatory')" label="Réponse obligatoire"
      class="q-mb-lg" dense :disable="disableEdition" />
    <q-checkbox v-model="card.isQuestionAnswerMultipleChoiced" dense :disable="disableEdition" class="q-mb-lg"
      @update:model-value="updateCard('isQuestionAnswerMultipleChoiced')" label="Sélection multiple" />
    <q-checkbox v-model="card.allowOtherAnswer" dense :disable="disableEdition" class="q-mb-lg"
      @update:model-value="updateCard('allowOtherAnswer')" label="Autoriser une autre réponse" />
    <div v-for="(answer, i) in card.qcAnswers" :key="i" class="answers">
      <ni-input :caption="`Réponse ${i + 1}`" v-model="card.qcAnswers[i].text" @focus="saveTmp(`qcAnswers[${i}].text`)"
        @blur="updateTextAnswer(i)" class="input" :disable="disableEdition" :required-field="answerIsRequired(i)"
        :error="getError('qcAnswers', i)" :error-message="questionAnswerErrorMsg(i)" />
      <ni-button icon="delete" @click="validateAnswerDeletion(i)" :disable="disableAnswerDeletion" />
    </div>
    <ni-button class="add-button" icon="add" label="Ajouter une réponse" color="primary" @click="addAnswer"
      :disable="disableAnswerCreation" />
  </div>
</template>

<script>
import { computed, toRefs } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required, maxLength, helpers } from '@vuelidate/validators';
import Input from '@components/form/Input';
import Button from '@components/Button';
import {
  QUESTION_OR_TITLE_MAX_LENGTH,
  QUESTION_ANSWER_MAX_ANSWERS_COUNT,
  QUESTION_ANSWER_MIN_ANSWERS_COUNT,
  PUBLISHED,
  QC_ANSWER_MAX_LENGTH,
  REQUIRED_LABEL,
} from '@data/constants';
import { useCardTemplate } from 'src/modules/vendor/composables/CardTemplate';

export default {
  name: 'QuestionAnswer',
  props: {
    disableEdition: { type: Boolean, default: false },
    cardParent: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-input': Input,
    'ni-button': Button,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { disableEdition, cardParent } = toRefs(props);

    const $store = useStore();

    const card = computed(() => $store.state.card.card);

    const rules = computed(() => ({
      card: {
        question: { required, maxLength: maxLength(QUESTION_OR_TITLE_MAX_LENGTH) },
        qcAnswers: {
          $each: helpers.forEach({
            text: { required, maxLength: maxLength(QC_ANSWER_MAX_LENGTH) },
          }),
        },
      },
    }));

    const v$ = useVuelidate(rules, { card });

    const refreshCard = () => { emit('refresh'); };

    const {
      updateCard,
      saveTmp,
      updateTextAnswer,
      getError,
      validateAnswerDeletion,
      addAnswer,
      errorMsg,
    } = useCardTemplate(card, v$, refreshCard);

    const disableAnswerCreation = computed(() => card.value.qcAnswers.length >= QUESTION_ANSWER_MAX_ANSWERS_COUNT ||
        disableEdition.value || cardParent.value.status === PUBLISHED);

    const disableAnswerDeletion = computed(() => card.value.qcAnswers.length <= QUESTION_ANSWER_MIN_ANSWERS_COUNT ||
        disableEdition.value || cardParent.value.status === PUBLISHED);

    const answerIsRequired = index => index < QUESTION_ANSWER_MIN_ANSWERS_COUNT;

    const questionAnswerErrorMsg = (index) => {
      const validation = v$.value.card.qcAnswers.$each.$response.$errors[index].text;

      if (get(validation, '0.$validator') === 'required') return REQUIRED_LABEL;
      if (get(validation, '0.$validator') === 'maxLength') return `${QC_ANSWER_MAX_LENGTH} caractères maximum.`;

      return '';
    };

    return {
      // Validations
      v$,
      // Data
      card,
      // Computed
      disableAnswerCreation,
      disableAnswerDeletion,
      // Methods
      answerIsRequired,
      questionAnswerErrorMsg,
      updateCard,
      saveTmp,
      updateTextAnswer,
      getError,
      validateAnswerDeletion,
      addAnswer,
      errorMsg,
    };
  },
};
</script>

<style lang="sass" scoped>
.container
  display: flex
  flex-direction: column
.answers
  display: flex
  justify-content: space-between
.input
  flex: 1
.add-button
  align-self: flex-end
</style>
