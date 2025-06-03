<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Ajuster <span class="text-weight-bold">la note</span>
    </template>
    <div>
      <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="help_outline" icon-color="copper-500">
        <template #message>Objectif pédagogique : {{ question }}</template>
      </ni-banner>
      <ni-rating v-model="answer" :icon="iconTab" required-field caption="Veuillez sélectionner la note ajustée : "
        :error="validations.$error" :labels="labels" />
    </div>
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Ajuster la note" color="primary" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { ref, toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Banner from '@components/Banner';
import Rating from '@components/Rating';

export default {
  name: 'TrainerAnswerModal',
  props: {
    modelValue: { type: Boolean, default: false },
    trainerAnswer: { type: Number, default: 0 },
    question: { type: String, default: '' },
    labels: { type: Object, default: () => {}, required: true },
    validations: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-banner': Banner,
    'ni-rating': Rating,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const iconTab = ref([
      'mdi-numeric-1-box',
      'mdi-numeric-2-box',
      'mdi-numeric-3-box',
      'mdi-numeric-4-box',
      'mdi-numeric-5-box',
    ]);
    const { trainerAnswer } = toRefs(props);
    const answer = ref(trainerAnswer.value);

    const hide = () => {
      emit('hide');
      answer.value = 0;
    };

    const input = event => emit('update:model-value', event);

    const submit = () => { emit('submit', answer.value); };

    return {
      // Data
      iconTab,
      answer,
      // Methods
      hide,
      input,
      submit,
    };
  },
};
</script>

<style lang="sass" scoped>
</style>
