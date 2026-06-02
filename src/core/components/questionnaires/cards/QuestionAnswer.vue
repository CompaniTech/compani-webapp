<template>
  <div class="card-container">
    <ni-option-group :model-value="isMultipleChoiced ? multipleAnswer : singleAnswer" :error="v$.answers.$error"
      :required-field="isRequired" :options="answerOptions" :type="optionType" :caption="cardTitle"
      @update:model-value="updateAnswers" class="elm-width" :allow-other-answer="card.allowOtherAnswer" />
    <ni-footer label="Suivant" @submit="updateQuestionnaireAnswer" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { ref, toRefs, computed } from 'vue';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { minArrayLength, noEmptyValue } from '@helpers/vuelidateCustomVal';
import { NotifyWarning } from '@components/popup/notify';
import OptionGroup from '@components/form/OptionGroup';
import Footer from '@components/questionnaires/cards/Footer';
import { INCREMENT, REQUIRED_LABEL, CHECKBOX, RADIO } from '@data/constants';

export default {
  name: 'QuestionAnswer',
  components: {
    'ni-footer': Footer,
    'ni-option-group': OptionGroup,
  },
  props: {
    card: { type: Object, required: true },
  },
  setup (props) {
    const { card } = toRefs(props);
    const multipleAnswer = ref([]);
    const singleAnswer = ref('');
    const $store = useStore();

    const isMultipleChoiced = computed(() => card.value.isQuestionAnswerMultipleChoiced);

    const answerOptions = computed(() => card.value.qcAnswers.map(qc => ({ value: qc._id, label: qc.text })));

    const optionType = computed(() => (isMultipleChoiced.value ? CHECKBOX : RADIO));

    const cardTitle = computed(() => card.value.question
      .concat((isMultipleChoiced.value ? ' (plusieurs réponses sont possibles)' : '')));

    const isRequired = computed(() => get(card.value, 'isMandatory') || false);

    const answers = computed(() => (isMultipleChoiced.value ? multipleAnswer.value : [singleAnswer.value]));

    const rules = computed(() => ({
      answers: { ...(isRequired.value && { minArrayLength: minArrayLength(1), noEmptyValue }) },
    }));
    const v$ = useVuelidate(rules, { answers });

    const updateQuestionnaireAnswer = () => {
      v$.value.answers.$touch();
      if (v$.value.answers.$error) return NotifyWarning('Champ(s) invalide(s).');

      $store.dispatch(
        'questionnaire/setAnswerList',
        { answers: [{ card: card.value._id, answerList: answers.value }] }
      );

      $store.dispatch('questionnaire/updateCardIndex', { type: INCREMENT });
    };

    const updateAnswers = (value) => {
      if (isMultipleChoiced.value) multipleAnswer.value = value;
      else singleAnswer.value = value;
    };

    const answerList = computed(() => $store.state.questionnaire.answerList);

    const created = () => {
      const initialValue = answerList.value.find(a => a.card === card.value._id);

      if (get(initialValue, 'answerList')) {
        if (isMultipleChoiced.value) multipleAnswer.value = initialValue.answerList;
        else singleAnswer.value = initialValue.answerList[0];
      }
    };

    created();

    return {
      // Data
      REQUIRED_LABEL,
      multipleAnswer,
      singleAnswer,
      // Methods
      updateQuestionnaireAnswer,
      updateAnswers,
      // Computed
      isRequired,
      isMultipleChoiced,
      answerOptions,
      optionType,
      cardTitle,
      v$,
    };
  },
};
</script>
