<template>
  <div :class="['q-ml-md', 'card-edition', 'bg-bright-orange-40', { 'edition-disabled': disableEdition }]">
    <q-scroll-area :thumb-style="{ width: '6px', 'border-radius': '10px' }"
      :content-style="{ display:'flex', 'flex-direction': 'column', 'padding-top': '30px' }"
      :content-active-style="{ display:'flex', 'flex-direction': 'column', 'padding-top': '30px' }">
        <div v-if="card && Object.values(card).length">
          <component :is="templateInstance" :key="card._id" class="q-mx-lg" :disable-edition="disableEdition"
            @refresh="refreshCard" :card-parent="cardParent" />
        </div>
    </q-scroll-area>
  </div>
</template>

<script>
import { defineAsyncComponent, computed, ref, watch } from 'vue';
import get from 'lodash/get';
import { useStore } from 'vuex';
import {
  TRANSITION,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  TEXT_MEDIA,
  FLASHCARD,
  FILL_THE_GAPS,
  ORDER_THE_SEQUENCE,
  SINGLE_CHOICE_QUESTION,
  MULTIPLE_CHOICE_QUESTION,
  SURVEY,
  OPEN_QUESTION,
  QUESTION_ANSWER,
} from '@data/constants';

export default {
  name: 'CardEdition',
  props: {
    disableEdition: { type: Boolean, default: false },
    cardParent: { type: Object, default: () => ({}) },
  },
  emits: ['refresh'],
  setup (_, { emit }) {
    const $store = useStore();
    const currentTemplate = ref('');

    const card = computed(() => $store.state.card.card);

    const templateInstance = computed(() => {
      switch (currentTemplate.value) {
        case TRANSITION:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/Transition')
          );
        case TITLE_TEXT_MEDIA:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/TitleTextMedia')
          );
        case TITLE_TEXT:
          return defineAsyncComponent(() => import('src/modules/vendor/components/programs/cards/templates/TitleText'));
        case TEXT_MEDIA:
          return defineAsyncComponent(() => import('src/modules/vendor/components/programs/cards/templates/TextMedia'));
        case FLASHCARD:
          return defineAsyncComponent(() => import('src/modules/vendor/components/programs/cards/templates/Flashcard'));
        case FILL_THE_GAPS:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/FillTheGaps')
          );
        case ORDER_THE_SEQUENCE:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/OrderTheSequence')
          );
        case SINGLE_CHOICE_QUESTION:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/SingleChoiceQuestion')
          );
        case MULTIPLE_CHOICE_QUESTION:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/MultipleChoiceQuestion')
          );
        case SURVEY:
          return defineAsyncComponent(() => import('src/modules/vendor/components/programs/cards/templates/Survey'));
        case OPEN_QUESTION:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/OpenQuestion')
          );
        case QUESTION_ANSWER:
          return defineAsyncComponent(
            () => import('src/modules/vendor/components/programs/cards/templates/QuestionAnswer')
          );
        default:
          return null;
      }
    });

    const refreshCard = () => emit('refresh');

    watch(() => get(card.value, 'template'), (newValue) => { currentTemplate.value = newValue; });

    return {
      // Computed
      card,
      templateInstance,
      // Methods
      refreshCard,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-scrollarea
  height: 100%

.card-edition
  border-radius: 3px
  display: flex
  flex-direction: column
  flex: 1

.edition-disabled
  opacity: 0.6
</style>
