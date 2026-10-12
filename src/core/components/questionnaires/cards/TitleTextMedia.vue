<template>
  <div class="card-container">
    <div class="elm-width container">
      <span v-if="card.title" class="title q-mb-sm">{{ card.title }}</span>
      <span class="q-mb-sm">{{ card.text }}</span>
      <img v-if="card.media" :src="card.media.link" class="img q-mb-sm">
    </div>
    <ni-footer label="Suivant" @submit="updateCardIndex" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { INCREMENT } from '@data/constants';
import Footer from '@components/questionnaires/cards/Footer';

export default {
  name: 'TitleTextMedia',
  components: {
    'ni-footer': Footer,
  },
  props: {
    card: { type: Object, required: true },
  },
  setup () {
    const $store = useStore();
    const updateCardIndex = () => $store.dispatch('questionnaire/updateCardIndex', { type: INCREMENT });

    return {
      // Methods
      updateCardIndex,
    };
  },
};
</script>

<style lang="sass" scoped>
.container
  display: flex
  flex-direction: column
  flex: 1
  align-items: center
.title
  color: $navy-80
  font-weight: bold
  text-align: center
.img
  width: 30vw
  height: auto
  @media screen and (max-width: $breakpoint-md)
    width: 50vw
</style>
