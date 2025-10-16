<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
        Télécharger le <span class="text-weight-bold">fichier de prélèvements SEPA</span>
      </template>
      <ni-input :model-value="transactionName" caption="Nom du lot de prélèvements" required-field
        @update:model-value="update($event)" :error="validations.$error" :error-message="errorMessage" />
      <template #footer>
        <ni-button class="bg-primary full-width modal-btn" label="Télécharger" icon-right="add" color="white"
          :loading="loading" @click="submit" />
      </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import get from 'lodash/get';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import { REQUIRED_LABEL } from '@data/constants';

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
  setup (props, { emit }) {
    const { validations } = toRefs(props);
    const submit = () => emit('submit');
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const update = (event) => { emit('update:transaction-name', event); };

    const errorMessage = computed(() => {
      if (get(validations.value, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validations.value, 'maxLength.$response') === false) return '140 caractères maximum.';

      return '';
    });

    return {
      // Methods
      submit,
      hide,
      input,
      update,
      // Computed
      errorMessage,
    };
  },
};
</script>
