<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Ajouter une liste d'<span class="text-weight-bold">apprenants</span>
    </template>
    <p v-html="constraints" />
    <ni-input in-modal caption="Liste d'apprenants" type="file" @blur="validations.$touch" last required-field
      :model-value="csv" @update:model-value="update($event)"
      :extensions="[CSV_EXTENSION]" :error="validations.$error" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Ajouter la liste des apprenants" :loading="loading"
        icon-right="add" @click="submit" color="white" />
    </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import { CSV_EXTENSION } from '@data/constants';

export default {
  name: 'UploadCsvModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    constraints: { type: String, default: '' },
    csv: { type: File, default: null },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  emits: ['hide', 'update:model-value', 'update:csv', 'submit'],
  setup (_, { emit }) {
    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = event => emit('update:csv', event);

    return {
      // Data
      CSV_EXTENSION,
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
