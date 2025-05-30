<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Confirmation
    </template>
    <div class="course-bill-infos">
      <div>{{ courseName }} </div>
      <ni-banner content-class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
        <template #message>Facture pour le compte de {{ companiesName }}</template>
      </ni-banner>
    </div>
    <ni-banner v-if="!traineesQuantity && ![INTRA, SINGLE].includes(courseType)" icon="info_outline"
      icon-color="orange-700" content-class="bg-orange-50 text-orange-900">
      <template #message>Aucun stagiaire des structures sélectionnées n'est inscrit à la formation</template>
    </ni-banner>
   <ni-date-input caption="Date de facture" :model-value="billToValidate.billedAt" :error="validations.billedAt.$error"
      @blur="validations.billedAt.$touch" in-modal required-field @update:model-value="update($event, 'billedAt')" />
    <template #footer>
      <div class="q-pl-lg">Cette opération est définitive. Confirmez-vous&nbsp;?</div>
      <div class="row justify-end q-ma-md">
        <ni-button label="NON" :loading="loading" @click="cancel" />
        <ni-button label="OUI" :loading="loading" @click="submit" />
      </div>
    </template>
  </ni-modal>
</template>

<script>
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Banner from '@components/Banner';
import Button from '@components/Button';
import DateInput from '@components/form/DateInput';
import { INTRA, SINGLE } from '@data/constants';

export default {
  name: 'CourseBillValidationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    billToValidate: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    traineesQuantity: { type: Number, default: 0 },
    courseName: { type: String, default: '' },
    courseType: { type: String, default: '' },
    companiesName: { type: String, default: '' },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-date-input': DateInput,
    'ni-banner': Banner,
  },
  emits: ['hide', 'update:model-value', 'submit', 'cancel', 'update:bill-to-validate'],
  setup (props, { emit }) {
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const cancel = () => emit('cancel');
    const update = (event, path) => {
      emit('update:bill-to-validate', set({ ...props.billToValidate }, path, event));
    };

    return {
      // Data
      INTRA,
      SINGLE,
      // Methods
      hide,
      input,
      submit,
      cancel,
      update,
    };
  },
};
</script>

<style lang="sass" scoped>
.banner
  background-color: $orange-50
  color: $orange-900
</style>
