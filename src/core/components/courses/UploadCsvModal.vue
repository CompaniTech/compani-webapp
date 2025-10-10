<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Ajouter une liste d'<span class="text-weight-bold">apprenants</span>
    </template>
    <p>{{ constraints }}</p>
    <ni-input in-modal caption="Liste d'apprenants" type="file" @blur="validations.file.$touch" last required-field
      :model-value="csv.file" @update:model-value="update($event, 'file')"
      :extensions="[CSV_EXTENSION]" :error="validations.file.$error" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Ajouter la liste des apprenants" :loading="loading"
        icon-right="add" @click="submit" color="white" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import { INTER_B2B, SINGLE, CSV_EXTENSION } from '@data/constants';

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
    csv: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  emits: ['hide', 'update:model-value', 'update:csv', 'submit'],
  setup (props, { emit }) {
    const { csv } = toRefs(props);

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = (event, prop) => emit('update:csv', { ...csv.value, [prop]: event });

    return {
      // Data
      INTER_B2B,
      SINGLE,
      CSV_EXTENSION,
      // Computed
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
