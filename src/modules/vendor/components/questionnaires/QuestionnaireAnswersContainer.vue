<template>
  <div>
    <span class="section-title">{{ title }}</span>
    <q-card v-for="(card, cardIndex) of cards" :key="cardIndex" flat class="q-mb-sm">
      <component :is="getChartComponent(card.template)" :card="card" />
    </q-card>
  </div>
</template>

<script>
import { useQuestionnaireAnswers } from 'src/modules/vendor/composables/QuestionnaireAnswers';

export default {
  name: 'QuestionnaireAnswersContainer',
  props: {
    title: { type: String, default: '' },
    cards: { type: Array, required: true },
  },
  setup () {
    const { getChartComponent } = useQuestionnaireAnswers();

    return {
      // Methods
      getChartComponent,
    };
  },
};
</script>

<style lang="sass" scoped>
.section-title
  font-size: 24px
  font-weight: bold
  color: $navy-80
  margin: 24px 16px
</style>
