<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Créer des factures
    </template>
    <ni-input caption="Nombre de factures à créer" type="number" in-modal required-field :model-value="newBillsQuantity"
      @update:model-value="update($event)" :error="validations.$error" :error-message="quantityErrorMessage" last />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Créer des factures" icon-right color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';

export default {
  name: 'MultipleCourseBillCreationModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    newBillsQuantity: { type: Number, default: 0 },
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-bills-quantity'],
  setup (props, { emit }) {
    const { validations } = toRefs(props);

    const quantityErrorMessage = computed(() => {
      if (validations.value.strictPositiveNumber.$response === false ||
        validations.value.integerNumber.$response === false) {
        return 'Nombre non valide, doit être un entier strictement positif.';
      }

      return 'Nombre invalide.';
    });

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = event => emit('update:new-bills-quantity', Number(event));

    return {
      // Computed
      quantityErrorMessage,
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
