<template>
  <q-card @click="$emit('click')">
    <q-card-section class="q-pa-sm cursor-pointer">
      <div class="type">{{ QUESTIONNAIRE_TYPES[questionnaire.type] }}</div>
      <div class="q-my-md name ellipsis-2-lines">{{ questionnaire.name }}</div>
      <q-separator />
      <div class="q-my-sm q-pa-xs answers">
        {{ formatQuantity('réponse', questionnaire.historiesCount) }}
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { QUESTIONNAIRE_TYPES } from '@data/constants';
import { formatQuantity } from '@helpers/utils';

export default {
  name: 'QuestionnaireAnswersCell',
  props: {
    questionnaire: { type: Object, required: true },
  },
  emits: ['click'],
  setup () {
    return {
      // Data
      formatQuantity,
      QUESTIONNAIRE_TYPES,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-card
  border-radius: 8px
.type
  font-size: 14px
  color: $copper-grey-800
.name
  word-break: break-word
  height: 48px
.answers
  border-radius: 8px
  width: 100px
  text-align: center
  color: $copper-grey-800
  background-color: $copper-grey-300
</style>
