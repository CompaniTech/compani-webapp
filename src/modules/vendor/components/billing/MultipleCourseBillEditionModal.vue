<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Éditer les <span class="text-weight-bold">factures</span>
    </template>
    <div class="course-bill-infos">
      <div>{{ courseInfos.courseName }} </div>
      <ni-banner v-if="billsToUpdate.severalPayers" class="bg-copper-grey-100 q-mt-sm" icon="warning">
        <template #message>Les payeurs des factures sélectionnées sont différents.</template>
      </ni-banner>
      <div v-for="companies of courseInfos.companiesName" :key="companies">
        <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
          <template #message>Facture pour le compte de {{ companies }}</template>
        </ni-banner>
      </div>
    </div>
    <div class="column">
      <company-select v-if="has(billsToUpdate, 'payer')" in-modal caption="Payeur" :company-options="payerOptions"
        :company="billsToUpdate.payer" required-field @update:model-value="update($event, 'payer')"
        :error="validations.payer.$error" @blur="validations.payer.$touch" />
      <ni-secondary-button v-else label="Éditer le payeur" icon="edit" @click="update('', 'payer')"
        class="full-width modal-btn q-my-sm" />
      <ni-input v-if="has(billsToUpdate, 'mainFee.description')" in-modal caption="Description" type="textarea"
        :model-value="billsToUpdate.mainFee.description" @update:model-value="update($event, 'mainFee.description')" />
      <ni-secondary-button v-else label="Éditer la description" icon="edit" class="full-width modal-btn q-my-sm"
        @click="update('', 'mainFee.description')" />
    </div>
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Éditer la facture" icon-right="add" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import set from 'lodash/set';
import has from 'lodash/has';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Input from '@components/form/Input';
import Banner from '@components/Banner';
import CompanySelect from '@components/form/CompanySelect';
import DateInput from '@components/form/DateInput';
import { SINGLE } from '@data/constants';
import SecondaryButton from '../../../../core/components/SecondaryButton.vue';

export default {
  name: 'MultipleCourseBillEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    billsToUpdate: { type: Object, default: () => ({}) },
    payerOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    courseInfos: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-secondary-button': SecondaryButton,
    'ni-banner': Banner,
    'company-select': CompanySelect,
    'ni-date-input': DateInput,
    'ni-input': Input,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:bills-to-update'],
  setup (props, { emit }) {
    const { billsToUpdate } = toRefs(props);

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (value, path) => emit('update:bills-to-update', set({ ...billsToUpdate.value }, path, value));

    return {
      // Data
      SINGLE,
      // Methods
      hide,
      input,
      submit,
      update,
      has,
    };
  },
};
</script>
