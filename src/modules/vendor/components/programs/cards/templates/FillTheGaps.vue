<template>
  <div class="container">
    <ni-banner class="bg-peach-100" icon="info_outline">
      <template #message>
        Remplacer chaque bonne réponse par une balise &lt;trou&gt; et cocher les bonnes réponses dans la liste des mots
      </template>
    </ni-banner>
    <div class="q-mb-lg ">
      <ni-input caption="Texte" v-model="card.gappedText" required-field @focus="saveTmp('gappedText')"
      :error="v$.card.gappedText.$error || v$.card.gappedText.matchingTagsCount.$response === false" type="textarea"
      :disable="disableEdition" :error-message="gappedTextTagCodeErrorMsg" @blur="updateGappedTextCard" />
      <p :class="`text-italic text-14 text-${filledText.color}`" v-if="filledText.text">
        Texte final : {{ filledText.text }}
      </p>
    </div>
    <q-checkbox v-model="card.canSwitchAnswers" @update:model-value="updateCard('canSwitchAnswers')"
      label="Réponses interchangeables" class="q-mb-lg switch-answers" dense :disable="disableEdition" />
    <div class="row gutter-profile-x">
      <div v-for="(answer, i) in card.gapAnswers" :key="i" class="answers">
        <ni-input :caption="`Mot ${i + 1}`" v-model="answer.text" class="input" :required-field="answerIsRequired(i)"
          @focus="saveTmp(`gapAnswers[${i}].text`)" @blur="updateTextAnswer(i)" :error-message="gapAnswersErrorMsg(i)"
          :error="getError('gapAnswers', i) || requiredOneCorrectAnswer('gapAnswers', i)" :disable="disableEdition" />
        <q-checkbox v-model="answer.isCorrect" @update:model-value="updateCorrectAnswer(answer)"
          :disable="disableAnswerCheckbox(i)" />
        <ni-button icon="delete" @click="validateAnswerDeletion(i)" :disable="disableAnswerDeletion" />
      </div>
    </div>
    <ni-button class="add-button q-mb-lg" icon="add" label="Ajouter une réponse" color="primary" @click="addAnswer"
      :disable="disableAnswerCreation" />
    <ni-input caption="Correction" v-model="card.explanation" required-field @focus="saveTmp('explanation')"
      @blur="updateCard('explanation')" :error="v$.card.explanation.$error" type="textarea" :disable="disableEdition" />
  </div>
</template>

<script>
import { computed, toRefs } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required, maxLength, helpers } from '@vuelidate/validators';
import Input from '@components/form/Input';
import Banner from '@components/Banner';
import {
  REQUIRED_LABEL,
  GAP_ANSWER_MAX_LENGTH,
  PUBLISHED,
  FILL_THE_GAPS_MAX_ANSWERS_COUNT,
  FILL_THE_GAPS_MIN_ANSWERS_COUNT,
  FILL_THE_GAPS_MAX_GAPS_COUNT,
} from '@data/constants';
import { minOneCorrectAnswer, matchingTagsCount, validTagsCount, validCaracters } from '@helpers/vuelidateCustomVal';
import Button from '@components/Button';
import { useCardTemplate } from 'src/modules/vendor/composables/CardTemplate';

export default {
  name: 'FillTheGaps',
  props: {
    disableEdition: { type: Boolean, default: false },
    cardParent: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-input': Input,
    'ni-button': Button,
    'ni-banner': Banner,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { disableEdition, cardParent } = toRefs(props);
    const $store = useStore();

    const card = computed(() => $store.state.card.card);

    const rules = computed(() => ({
      card: {
        gappedText: { required, validTagsCount, matchingTagsCount: value => matchingTagsCount(card, value) },
        gapAnswers: {
          minOneCorrectAnswer,
          $each: helpers.forEach({
            text: { required, validCaracters, maxLength: maxLength(GAP_ANSWER_MAX_LENGTH) },
          }),
        },
        explanation: { required },
      },
    }));

    const v$ = useVuelidate(rules, { card });

    const refreshCard = () => {
      emit('refresh');
    };

    const {
      updateCard,
      updateGappedTextCard,
      getError,
      saveTmp,
      addAnswer,
      updateTextAnswer,
      validateAnswerDeletion,
      updateCorrectAnswer,
      requiredOneCorrectAnswer,
    } = useCardTemplate(card, v$, refreshCard, cardParent);

    const gappedTextTagCodeErrorMsg = computed(() => {
      const modifiedText = v$.value.card.gappedText;
      if (get(modifiedText, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(modifiedText, 'validTagsCount.$response') === false) return 'Le nombre de \'<trou>\' doit être de 1 ou 2';
      if (get(modifiedText, 'matchingTagsCount.$response') === false) {
        if (cardParent.value.status === PUBLISHED) return 'Le nombre de \'<trou>\' ne peut pas être modifié';
        return 'Le nombre de \'<trou>\' ne correspond pas au nombre de bonnes réponses renseignées';
      }

      return '';
    });

    const correctAnswers = computed(() => card.value.gapAnswers.filter(a => a.isCorrect));

    const filledText = computed(() => {
      let color = 'primary';
      if (!card.value.gappedText) return { text: '', color };
      if (get(v$.value, 'card.gappedText.matchingTagsCount.$response') === false ||
        correctAnswers.value.some(a => !a.text)) {
        color = 'red-800';
      }
      const correctAnswersText = correctAnswers.value.map(a => a.text);
      const text = card.value.gappedText.replace(/<trou>/g, () => (
        correctAnswersText.length ? ` ${correctAnswersText.shift()} ` : ''
      ));
      return { text, color };
    });

    const disableAnswerCreation = computed(() => card.value.gapAnswers.length >= FILL_THE_GAPS_MAX_ANSWERS_COUNT ||
        disableEdition.value || cardParent.value.status === PUBLISHED);

    const disableAnswerDeletion = computed(() => card.value.gapAnswers.length <= FILL_THE_GAPS_MIN_ANSWERS_COUNT ||
        disableEdition.value || cardParent.value.status === PUBLISHED);

    const disableAnswerCheckbox = index => !card.value.gapAnswers[index].text || disableEdition.value ||
      (correctAnswers.value.length === FILL_THE_GAPS_MAX_GAPS_COUNT && !card.value.gapAnswers[index].isCorrect) ||
      cardParent.value.status === PUBLISHED;

    const gapAnswersErrorMsg = (index) => {
      const validation = v$.value.card.gapAnswers.$each.$response.$errors[index].text;

      if (requiredOneCorrectAnswer('gapAnswers', index)) return 'Une bonne réponse est nécessaire.';

      switch (get(validation, '0.$validator')) {
        case 'required':
          return REQUIRED_LABEL;
        case 'maxLength':
          return `${GAP_ANSWER_MAX_LENGTH} caractères maximum.`;
        case 'validCaracters':
          return 'Caractère invalide détecté (seuls - \' ESPACE permis)';
        default:
          return '';
      }
    };

    const answerIsRequired = index => index < FILL_THE_GAPS_MIN_ANSWERS_COUNT;

    return {
      // Validation
      v$,
      // Computed
      gappedTextTagCodeErrorMsg,
      disableAnswerCreation,
      disableAnswerDeletion,
      card,
      correctAnswers,
      filledText,
      // Methods
      requiredOneCorrectAnswer,
      updateCorrectAnswer,
      gapAnswersErrorMsg,
      answerIsRequired,
      disableAnswerCheckbox,
      updateCard,
      updateGappedTextCard,
      getError,
      saveTmp,
      addAnswer,
      updateTextAnswer,
      validateAnswerDeletion,
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
  align-items: center
.input
  flex: 1
.add-button
  align-self: flex-end
.error-message
  color: $secondary
  line-height: 1
  font-size: 11px
  padding: 8px 0px
.switch-answers
  max-width: fit-content
</style>
