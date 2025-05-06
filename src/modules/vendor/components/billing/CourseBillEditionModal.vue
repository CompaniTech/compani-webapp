<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Éditer la <span class="text-weight-bold">facture</span>
    </template>
    <div class="course-bill-infos">
      <div>{{ courseName }} </div>
      <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
        <template #message>Facture pour le compte de {{ companiesName }}</template>
      </ni-banner>
    </div>
    <company-select in-modal caption="Payeur" :company-options="payerOptions" :company="editedBill.payer" required-field
      @update:model-value="update($event, 'payer')" />
    <ni-date-input caption="Date d'échéance" :model-value="editedBill.maturityDate" in-modal required-field
      :error="validations.maturityDate.$error" @blur="validations.maturityDate.$touch"
      @update:model-value="update($event, 'maturityDate')" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Éditer la facture" icon-right="add" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Banner from '@components/Banner';
import CompanySelect from '@components/form/CompanySelect';
import DateInput from '@components/form/DateInput';

export default {
  name: 'CourseBillEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    editedBill: { type: Object, default: () => ({}) },
    payerOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    courseName: { type: String, default: '' },
    companiesName: { type: String, default: '' },
    validations: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-banner': Banner,
    'company-select': CompanySelect,
    'ni-date-input': DateInput,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:edited-bill'],
  setup (props, { emit }) {
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (value, path) => emit('update:edited-bill', { path, value });

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
