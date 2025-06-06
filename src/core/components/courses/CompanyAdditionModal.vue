<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
        Ajouter une <span class="text-weight-bold">structure</span>
      </template>
      <company-select in-modal :company="selectedCompany" @update="update" :company-options="companyOptions"
        required-field :validation="validations" :display-no-options-slot="displayNoOptionsSlot"
        @open-company-creation-modal="openCompanyCreationModal" :multiple="multiple" />
      <template #footer>
        <ni-button class="bg-primary full-width modal-btn" label="Ajouter la structure" icon-right="add" color="white"
          :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import CompanySelect from '@components/form/CompanySelect';
import Button from '@components/Button';

export default {
  name: 'CompanyAdditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    companyOptions: { type: Array, default: () => [] },
    selectedCompany: { type: [String, Object], default: '' },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    displayNoOptionsSlot: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'company-select': CompanySelect,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:selected-company', 'open-company-creation-modal'],
  setup (_, { emit }) {
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = event => emit('update:selected-company', event);
    const openCompanyCreationModal = () => emit('open-company-creation-modal');

    return {
      // Methods
      hide,
      input,
      submit,
      update,
      openCompanyCreationModal,
    };
  },
};
</script>
