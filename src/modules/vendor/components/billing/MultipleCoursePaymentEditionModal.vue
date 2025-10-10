<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
      Éditer les <span class="text-weight-bold">paiements</span>
    </template>
    <ni-select in-modal caption="Statut" :model-value="status" @update:model-value="updateStatus($event)"
      required-field :options="PAYMENT_STATUS_OPTIONS" @blur="validations.$touch" :error="validations.$error" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" :label="'Éditer le statut des paiements'"
        icon-right="add" color="white" :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { PAYMENT_STATUS_OPTIONS } from '@data/constants';

export default {
  name: 'MultipleCoursePaymentEditionModal',
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
    'ni-button': Button,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    status: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
  },
  emits: ['submit', 'hide', 'update:model-value', 'update:status'],
  setup (_, { emit }) {
    const submit = () => emit('submit');

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const updateStatus = event => emit('update:status', event);

    return {
      // Data
      PAYMENT_STATUS_OPTIONS,
      // Methods
      hide,
      submit,
      input,
      updateStatus,
    };
  },
};
</script>
