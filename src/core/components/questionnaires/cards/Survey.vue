<template>
  <div class="card-container">
    <div class="elm-width items-center">
      <ni-rating v-model="answer" :icon="iconTab" :caption="card.question" :error="v$.answer.$error"
        :labels="card.labels" :required-field="isRequired" />
    </div>
    <ni-footer label="Suivant" @submit="updateQuestionnaireAnswer" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { ref, toRefs, computed } from 'vue';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { minValue } from '@vuelidate/validators';
import { NotifyWarning } from '@components/popup/notify';
import { INCREMENT, REQUIRED_LABEL } from '@data/constants';
import Footer from '@components/questionnaires/cards/Footer';
import Rating from '@components/Rating';

export default {
  name: 'Survey',
  components: {
    'ni-footer': Footer,
    'ni-rating': Rating,
  },
  props: {
    card: { type: Object, required: true },
  },
  setup (props) {
    const { card } = toRefs(props);
    const $store = useStore();
    const answer = ref(0);
    const maxLabel = ref(Math.max(...Object.keys(card.value.labels).map(Number)));
    const labelKeys = ref(Array.from({ length: maxLabel.value }, (_, i) => i + 1));
    const iconTab = ref(labelKeys.value.map(key => `mdi-numeric-${key}-box`));

    const isRequired = computed(() => get(card.value, 'isMandatory') || false);

    const rules = computed(() => ({ answer: { ...(isRequired.value && { minValue: minValue(1) }) } }));
    const v$ = useVuelidate(rules, { answer });

    const updateQuestionnaireAnswer = () => {
      v$.value.answer.$touch();
      if (v$.value.answer.$error) return NotifyWarning('Champ requis.');

      $store.dispatch(
        'questionnaire/setAnswerList',
        { answers: [{ card: card.value._id, answerList: [answer.value ? answer.value.toString() : ''] }] }
      );

      $store.dispatch('questionnaire/updateCardIndex', { type: INCREMENT });
    };

    const answerList = computed(() => $store.state.questionnaire.answerList);

    const created = () => {
      const initialValue = answerList.value.find(a => a.card === card.value._id);

      answer.value = parseInt(get(initialValue, 'answerList[0]'), 10);
    };

    created();

    return {
      // Data
      answer,
      iconTab,
      REQUIRED_LABEL,
      // Computed
      isRequired,
      v$,
      // Methods
      updateQuestionnaireAnswer,
    };
  },
};
</script>
