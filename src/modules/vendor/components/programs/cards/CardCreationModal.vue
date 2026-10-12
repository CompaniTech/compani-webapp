<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide" container-class="modal-container-md">
    <template #title>
      Créer une nouvelle <span class="text-weight-bold">carte</span>
    </template>
    <h6 class="text-weight-bold">Cours</h6>
    <div class="row q-mb-lg button-container">
      <div v-for="template in lessonTemplates" :key="template.value" @click="submit(template.value)"
        class="card-button cursor-pointer">
        <div class="text-weight-bold card-button-content">
          <template v-if="template.value === TITLE_TEXT_MEDIA">
            <div>Titre</div>
            <div>Texte</div>
            <q-icon name="image" size="sm" />
          </template>
          <template v-else-if="template.value === TEXT_MEDIA">
            <div>Texte</div>
            <q-icon name="image" size="sm" />
          </template>
          <template v-else-if="template.value === FLASHCARD">
            <div>Flashcard</div>
            <div class="row flashcard">
              <div class="flashcard-left" />
              <div class="flashcard-right" />
            </div>
          </template>
          <template v-else>{{ formatButtonLabel(template.label) }}</template>
        </div>
      </div>
    </div>
    <div v-if="!isQuestionnaire">
      <h6 class="text-weight-bold">Quiz</h6>
      <div class="row q-mb-lg button-container">
        <div v-for="template in quizTemplates" :key="template.value" @click="submit(template.value)"
          class="card-button cursor-pointer">
          <div class="text-weight-bold card-button-content">
            <template v-if="template.value === FILL_THE_GAPS">
              <div class="q-mb-sm">Texte à trou</div>
              <div class="fill-the-gaps">Ceci est un ____</div>
            </template>
            <template v-else-if="template.value === SINGLE_CHOICE_QUESTION">
              <div class="q-mb-sm">QCU</div>
              <div class="choices-question">
                <q-icon name="radio_button_unchecked" size="16px" />
                <q-icon name="radio_button_checked" size="16px" />
                <q-icon name="radio_button_unchecked" size="16px" />
              </div>
            </template>
            <template v-else-if="template.value === MULTIPLE_CHOICE_QUESTION">
              <div class="q-mb-sm">QCM</div>
              <div class="choices-question">
                <q-icon name="check_box_outline_blank" size="16px" />
                <q-icon name="check_box" size="16px" />
                <q-icon name="check_box" size="16px" />
              </div>
            </template>
            <template v-else-if="template.value === ORDER_THE_SEQUENCE">
              <div class="q-mb-sm order-the-sequence">Mettre dans l'ordre</div>
              <q-icon name="fa fa-list-ol" size="20px" />
            </template>
          </div>
        </div>
      </div>
    </div>
    <h6 class="text-weight-bold">Questionnaire</h6>
    <div class="row q-mb-lg button-container">
      <div v-for="template in questionnaireTemplates" :key="template.value" @click="submit(template.value)"
        class="card-button cursor-pointer">
        <div class="text-weight-bold card-button-content">
          <div class="q-mb-sm">{{ formatButtonLabel(template.label) }}</div>
          <q-icon v-if="template.value === OPEN_QUESTION" name="mdi-comment-question" size="20px" />
          <q-icon v-if="template.value === SURVEY" name="assessment" size="20px" />
          <div v-if="template.value === QUESTION_ANSWER">
            <q-icon name="mdi-comment-question-outline" size="20px" />
            <q-icon name="check_box" size="20px" />
          </div>
        </div>
      </div>
    </div>
  </ni-modal>
</template>

<script>
import {
  CARD_TEMPLATES,
  TITLE_TEXT_MEDIA,
  TEXT_MEDIA,
  FLASHCARD,
  FILL_THE_GAPS,
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  ORDER_THE_SEQUENCE,
  OPEN_QUESTION,
  SURVEY,
  LESSON,
  QUIZ,
  QUESTIONNAIRE,
  QUESTION_ANSWER,
} from '@data/constants';
import Modal from '@components/modal/Modal';

export default {
  name: 'CardCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    isQuestionnaire: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  data () {
    return {
      CARD_TEMPLATES,
      TITLE_TEXT_MEDIA,
      TEXT_MEDIA,
      FLASHCARD,
      FILL_THE_GAPS,
      MULTIPLE_CHOICE_QUESTION,
      SINGLE_CHOICE_QUESTION,
      ORDER_THE_SEQUENCE,
      OPEN_QUESTION,
      SURVEY,
      QUESTION_ANSWER,
    };
  },
  computed: {
    lessonTemplates () {
      return CARD_TEMPLATES.filter(t => (this.isQuestionnaire
        ? t.type === LESSON && t.value !== FLASHCARD
        : t.type === LESSON));
    },
    quizTemplates () {
      return CARD_TEMPLATES.filter(t => t.type === QUIZ);
    },
    questionnaireTemplates () {
      return CARD_TEMPLATES.filter(t => t.type === QUESTIONNAIRE);
    },
  },
  methods: {
    hide () {
      this.$emit('hide');
    },
    input (event) {
      this.$emit('update:model-value', event);
    },
    submit (template) {
      this.$emit('submit', template);
    },
    formatButtonLabel (label) {
      return label.replace(/ /g, '\n');
    },
  },
};
</script>

<style lang="sass" scoped>
h6
  margin-bottom: 3px

.button-container
  display: grid
  grid-template-columns: repeat(auto-fill, 114px)
  justify-content: center
  @media screen and (max-width: 767px)
    grid-template-columns: repeat(auto-fill, 79px)

.card-button
  background-color: $turquoise-10
  color: $navy
  border-radius: 10px
  font-size: 14px
  height: 120px
  width: 100px
  display: flex
  align-items: center
  justify-content: center
  margin: 10px 7px
  @media screen and (max-width: 767px)
    width: 65px
    height: 90px
  &-content
    text-align: center
    flex-wrap: wrap
    white-space: pre-line

  .flashcard
    justify-content: center
    div
      width: 40%
      height: 35px
      margin: 5px 2px
      border-radius: 3px
      @media screen and (max-width: 767px)
        width: 30%
        height: 30px
    .flashcard-right
      background-color: $petrol-60
    .flashcard-left
      background-color: $navy-20

  .fill-the-gaps
    font-size: 10px
    line-height: 10px

  .choices-question
    display: flex
    flex-direction: column
    align-items: center
</style>
