<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
        Télécharger le <span class="text-weight-bold">fichier de prélèvements SEPA</span>
      </template>
      <ni-input :model-value="transactionName" caption="Nom du lot de prélèvements" required-field
        @update:model-value="update($event)" />
      <template #footer>
        <ni-button class="bg-primary full-width modal-btn" label="Télécharger" icon-right="add" color="white"
          :loading="loading" @click="submit" />
      </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';

export default {
  name: 'XmlFileDownloadModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
  },
  props: {
    transactionName: { type: String, default: '' },
    modelValue: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
  },
  emits: ['submit', 'hide', 'update:model-value', 'update:transaction-name'],
  setup (_, { emit }) {
    const submit = () => emit('submit');
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const update = (event) => { emit('update:transaction-name', event); };

    return {
      // Methods
      submit,
      hide,
      input,
      update,
    };
  },
};
</script>
