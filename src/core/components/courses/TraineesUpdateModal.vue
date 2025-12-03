<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>Modifier <span class="text-weight-bold">{{ title }}</span></template>
    <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
      <template #message>{{ message }}</template>
    </ni-banner>
    <ni-option-group in-modal :model-value="trainees" @update:model-value="update" type="checkbox"
      :options="traineeOptions" />
    <template #footer>
      <ni-button class="bg-primary full-width modal-btn" :label="`Modifier ${title}`" icon-right="edit"
        color="white" :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import OptionGroup from '@components/form/OptionGroup';
import Button from '@components/Button';
import Banner from '@components/Banner';

export default {
  name: 'TraineesUpdateModal',
  props: {
    modelValue: { type: Boolean, default: false },
    trainees: { type: Array, default: () => [] },
    traineeOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    title: { type: String, default: 'les certifications' },
    message: { type: String, default: 'Les personnes sélectionnées passeront la certification' },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-option-group': OptionGroup,
    'ni-banner': Banner,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:trainees'],
  setup (_, { emit }) {
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = event => emit('update:trainees', event);

    return {
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
