<template>
  <div class="card-list bg-white">
    <q-scroll-area ref="cardContainer" :thumb-style="{ width: '6px', 'border-radius': '10px' }"
      :content-style="scrollAreaContentStyle" :content-active-style="scrollAreaContentStyle">
      <draggable v-model="draggableCardsList" ghost-class="ghost" :disabled="isDraggableDisabled"
        @update:model-value="update" item-key="_id">
        <template #item="{element: draggableCard, index: index}">
          <div :class="getCardStyle(draggableCard)">
            <div class="card-actions">
              <ni-button v-if="isSelected(draggableCard) && !isParentPublishedOrArchived" icon="delete"
                @click="deleteCard(draggableCard)" :disable="disableEdition" />
            </div>
            <div class="card-cell cursor-pointer" @click="selectCard(draggableCard)">
              <div class="card-cell-title">
                <div class="text-weight-bold">{{ index + 1 }}. {{ getHeading(draggableCard) }}</div>
                <q-icon v-if="disableEdition" name="lock" :class="{'locked-unselected': !isSelected(draggableCard)}"
                  size="xs" />
              </div>
              <div>{{ getTemplateName(draggableCard.template) }}</div>
            </div>
            <div v-if="!isSelected(draggableCard) && !draggableCard.isValid" :class="{ 'dot dot-orange': true }" />
          </div>
        </template>
      </draggable>
    </q-scroll-area>
    <ni-button v-if="!isParentPublishedOrArchived && !disableEdition" label="Ajouter une carte" color="primary"
      icon="add" @click="openCreationModal" />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import cloneDeep from 'lodash/cloneDeep';
import draggable from 'vuedraggable';
import {
  CARD_TEMPLATES,
  TRANSITION,
  TITLE_TEXT,
  TITLE_TEXT_MEDIA,
  TEXT_MEDIA,
  FLASHCARD,
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  ORDER_THE_SEQUENCE,
  OPEN_QUESTION,
  SURVEY,
  QUESTION_ANSWER,
  FILL_THE_GAPS,
  DRAFT,
} from '@data/constants';
import Button from '@components/Button';

export default {
  name: 'CardContainer',
  props: {
    disableEdition: { type: Boolean, default: false },
    cardParent: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-button': Button,
    draggable,
  },
  emits: ['add', 'delete-card', 'update'],
  data () {
    return {
      draggableCardsList: [],
      scrollAreaContentStyle: { display: 'flex', 'flex-direction': 'column', width: '100%' },
    };
  },
  computed: {
    ...mapState('card', ['card']),
    cards () {
      return this.cardParent.cards;
    },
    isParentPublishedOrArchived () {
      return this.cardParent.status !== DRAFT;
    },
    isDraggableDisabled () {
      return this.$q.platform.is.mobile || this.disableEdition || this.isParentPublishedOrArchived;
    },
  },
  watch: {
    cards: {
      handler () {
        this.draggableCardsList = cloneDeep(this.cards);
      },
      immediate: true,
    },
  },
  methods: {
    getCardStyle (card) {
      return [
        'card-row',
        { 'card-row-selected': this.isSelected(card) && !this.disableEdition },
        { 'card-row-locked': !this.isSelected(card) && this.disableEdition },
        { 'card-row-locked-selected': this.isSelected(card) && this.disableEdition },
      ];
    },
    isSelected (card) {
      if (!this.card) return false;
      return card._id === this.card._id;
    },
    openCreationModal () {
      this.$emit('add');
    },
    getHeading (card) {
      const questionTemplate = [
        MULTIPLE_CHOICE_QUESTION,
        SINGLE_CHOICE_QUESTION,
        ORDER_THE_SEQUENCE,
        OPEN_QUESTION,
        SURVEY,
        QUESTION_ANSWER,
      ];

      if ([TRANSITION, TITLE_TEXT_MEDIA, TITLE_TEXT].includes(card.template)) return card.title || '';
      if ([FLASHCARD, TEXT_MEDIA].includes(card.template)) return card.text || '';
      if (questionTemplate.includes(card.template)) return card.question || '';
      if (card.template === FILL_THE_GAPS) return card.gappedText || '';
      return '';
    },
    getTemplateName (value) {
      const template = CARD_TEMPLATES.find(t => t.value === value);
      return template ? template.label : '';
    },
    scrollDown () {
      const scrollArea = this.$refs.cardContainer;
      const scrollTarget = scrollArea.getScrollTarget();
      const duration = 300;
      scrollArea.setScrollPosition('vertical', scrollTarget.scrollHeight, duration);
    },
    selectCard (card) {
      this.$store.dispatch('card/fetchCard', card);
    },
    deleteCard (card) {
      this.$emit('delete-card', card._id);
    },
    update (event) {
      const cards = event.map(c => c._id);
      this.$emit('update', cards);
    },
  },
};
</script>

<style lang="sass" scoped>
.card-list
  padding: 4px 4px 0 4px
  border-radius: 3px
  display: flex
  flex-direction: column

.q-scrollarea
  height: 100%

.card-row
  margin: 4px
  display: flex
  justify-content: flex-start
  &-selected
    justify-content: flex-end
    .card-cell
      background-color: $copper-400
  &-locked
    .card-cell
      background-color: $copper-grey-100
  &-locked-selected
    justify-content: flex-end
    .card-cell
      background-color: $copper-grey-800
      color: white
  .dot
    margin: 0 0 0 3px

.card-actions
  display: flex
  flex-direction: column
.locked-unselected
  color: $copper-grey-400

.card-cell
  background-color: $copper-100
  border-radius: 4px
  height: fit-content
  width: 85%
  padding: 7px
  @media screen and (min-width: 768px)
    min-height: 90px
  @media screen and (max-width: 767px)
    min-height: 80px
  &-title
    display: flex
    justify-content: space-between
    > div
      margin-bottom: 5px
      white-space: nowrap
      overflow: hidden
      text-overflow: ellipsis

.dot-orange
  align-self: center

.ghost
  opacity: 0.5
</style>
