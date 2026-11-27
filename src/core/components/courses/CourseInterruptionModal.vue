<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title><span class="text-weight-bold">{{ title }}</span></template>
    <ni-banner v-if="!isCourseInterrupted" class="bg-copper-grey-100">
      <template #message>Vous ne pourrez plus créer de factures lorsque la formation est en pause.</template>
    </ni-banner>
    <ni-date-input :caption="caption" :model-value="interruptionDate" @update:model-value="update" in-modal
      required-field :min="min" :error="validations.$error" @blur="validations.$touch" last />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" :label="title" icon-right="done" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Banner from '@components/Banner';
import DateInput from '@components/form/DateInput';

export default {
  name: 'CourseInterruptionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    isCourseInterrupted: { type: Boolean, default: false },
    min: { type: String, default: '' },
    interruptionDate: { type: String, default: '' },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-banner': Banner,
    'ni-date-input': DateInput,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:interruption-date'],
  setup (props, { emit }) {
    const { isCourseInterrupted } = toRefs(props);

    const title = computed(() => (
      isCourseInterrupted.value ? 'Reprendre la formation' : 'Mettre en pause la formation'
    ));

    const caption = computed(() => (isCourseInterrupted.value ? 'Date de reprise' : 'Date de pause'));

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = event => emit('update:interruption-date', event);

    return {
      // Computed
      title,
      caption,
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
