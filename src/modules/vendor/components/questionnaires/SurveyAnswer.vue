<template>
  <div class="container">
    <q-card class="cell-container" flat>
      <q-card-section class="title">{{ title }}</q-card-section>
      <q-card-section>
        <ni-rating v-if="answer" readonly :model-value="answer" :icon="icon" color="copper-grey-500" :labels="labels" />
        <div class="answer" v-else>Pas de note</div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { ref, toRefs } from 'vue';
import Rating from '@components/Rating.vue';

export default {
  name: 'SurveyAnswer',
  props: {
    title: { type: String, required: true },
    answer: { type: Number, required: true },
    labels: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-rating': Rating,
  },
  setup (props) {
    const { labels } = toRefs(props);
    const maxLabel = ref(Math.max(...Object.keys(labels.value).map(Number)));
    const labelKeys = ref(Array.from({ length: maxLabel.value }, (_, i) => i + 1));
    const icon = ref(labelKeys.value.map(key => `mdi-numeric-${key}-box`));

    return {
      // Data
      icon,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-card
  padding: 16px 40px
  margin: 16px
  &__section
    margin: 0px
    padding: 0px
.container
  display: flex
  flex: 1
.cell-container
  display: flex
  flex: 1
  flex-direction: column
  align-items: center
  background-color: $peach-100
  border-radius: 8px
.answer
  font-size: 16px
  font-style: italic
  color: $copper-grey-500
  padding: 16px 0px
.title
  color: $copper-grey-700
  font-size: 20px
  padding: 4px 0px
</style>
