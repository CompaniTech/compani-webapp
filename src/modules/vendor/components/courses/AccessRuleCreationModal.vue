<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Ajouter une <span class="text-weight-bold">règle d'accès</span>
    </template>
      <company-select in-modal :company-options="companyOptions" :company="newAccessRule" required-field
        @update="update" :validation="validations" last multiple />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Ajouter la règle d'accès" color="primary" :loading="loading"
        icon-right="add" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import CompanySelect from '@components/form/CompanySelect';

export default {
  name: 'AccessRuleCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    companyOptions: { type: Array, default: () => [] },
    newAccessRule: { type: Array, default: () => [] },
    multiple: { type: Boolean, default: false },
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-access-rule'],
  components: {
    'company-select': CompanySelect,
    'ni-modal': Modal,
  },
  setup (_, { emit }) {
    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = value => emit('update:new-access-rule', value);

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
