<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Créer un <span class="text-weight-bold">avoir</span>
    </template>
    <div>
      Cet avoir annule la facture
      <span class="text-weight-bold">
          {{ creditNoteMetaInfo.number }} - {{ formatPrice(creditNoteMetaInfo.netInclTaxes) }}
      </span>
    </div>
    <div class="course-bill-infos">
      <div>{{ creditNoteMetaInfo.courseName }}</div>
      <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
        <template #message>Avoir pour le compte de {{ creditNoteMetaInfo.companiesName }}</template>
      </ni-banner>
    </div>
    <ni-banner v-if="displayValidatedCourseBillsCount" icon="info_outline" icon-color="copper-grey-700"
      class="bg-copper-grey-200 text-copper-grey-700">
      <template #message>
        Il y a {{ formatQuantity('facture valide', validatedCourseBillsCount) }} pour cette formation.
      </template>
    </ni-banner>
    <ni-date-input in-modal caption="Date" :model-value="newCreditNote.date" @blur="validations.date.$touch"
      required-field :error="validations.date.$error" @update:model-value="update($event, 'date')" :min="minDate"
      :error-message="dateErrorMessage(validations)" />
    <ni-input in-modal caption="Motif (visible par les clients)" :model-value="newCreditNote.misc"
      @update:model-value="update($event, 'misc')"
      type="textarea" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Créer l'avoir" icon-right="add" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import DateInput from '@components/form/DateInput';
import Banner from '@components/Banner';
import { REQUIRED_LABEL } from '@data/constants';
import { formatPrice, formatQuantity } from '@helpers/utils';

export default {
  name: 'CourseCreditNoteCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newCreditNote: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    minDate: { type: String, required: true },
    creditNoteMetaInfo: { type: Object, default: () => ({}) },
    validatedCourseBillsCount: { type: Number, default: 0 },
    displayValidatedCourseBillsCount: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'ni-date-input': DateInput,
    'ni-banner': Banner,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-credit-note'],
  setup (props, { emit }) {
    const dateErrorMessage = (validations) => {
      if (!validations.date.required.$response) return REQUIRED_LABEL;
      if (!validations.date.minDate.$response) {
        return 'La date de l\'avoir ne peut être antérieure à la date de facturation';
      }
    };
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => {
      emit('update:new-credit-note', set({ ...props.newCreditNote }, path, event));
    };

    return {
      // Methods
      dateErrorMessage,
      hide,
      input,
      submit,
      update,
      formatPrice,
      formatQuantity,
    };
  },
};
</script>
