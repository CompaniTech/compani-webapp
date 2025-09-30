<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
      Éditer un <span class="text-weight-bold">{{ paymentNature.toLowerCase() }}</span>
    </template>
    <div>
      {{ paymentNature }} pour la facture
      <span class="text-weight-bold">
          {{ coursePaymentMetaInfo.number }} - {{ formatPrice(coursePaymentMetaInfo.netInclTaxes) }}
      </span>
    </div>
    <div class="course-bill-infos">{{ coursePaymentMetaInfo.courseName }}</div>
    <ni-input in-modal caption="Montant" suffix="€" type="number" required-field :error-message="netInclTaxesError"
      :model-value="editedCoursePayment.netInclTaxes" @update:model-value="update($event, 'netInclTaxes')"
      :error="validations.netInclTaxes.$error" @blur="validations.netInclTaxes.$touch" />
    <ni-select in-modal caption="Type" :model-value="editedCoursePayment.type" required-field :options="paymentOptions"
      @update:model-value="update($event, 'type')" @blur="validations.type.$touch" :error="validations.type.$error" />
    <ni-date-input :model-value="editedCoursePayment.date" @update:model-value="update($event, 'date')" in-modal
      required-field :error="validations.date.$error" @blur="validations.date.$touch" caption="Date" />
    <ni-select in-modal caption="Statut" :model-value="editedCoursePayment.status" required-field
      :options="PAYMENT_STATUS_OPTIONS" @update:model-value="update($event, 'status')"
      @blur="validations.status.$touch" :error="validations.status.$error" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" :label="`Éditer le ${ paymentNature.toLowerCase() }`"
        icon-right="add" color="white" :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import get from 'lodash/get';
import { computed } from 'vue';
import set from 'lodash/set';
import Select from '@components/form/Select';
import Input from '@components/form/Input';
import Button from '@components/Button';
import DateInput from '@components/form/DateInput';
import Modal from '@components/modal/Modal';
import { formatPrice } from '@helpers/utils';
import {
  REQUIRED_LABEL,
  PAYMENT_OPTIONS,
  PAYMENT_NATURE_OPTIONS,
  CESU,
  PAYMENT_STATUS_OPTIONS,
} from '@data/constants';

export default {
  name: 'CoursePaymentCreationModal',
  components: {
    'ni-select': Select,
    'ni-input': Input,
    'ni-date-input': DateInput,
    'ni-modal': Modal,
    'ni-button': Button,
  },
  props: {
    editedCoursePayment: { type: Object, default: () => ({}) },
    coursePaymentMetaInfo: { type: Object, default: () => ({}) },
    modelValue: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:edited-course-payment'],
  setup (props, { emit }) {
    const paymentOptions = PAYMENT_OPTIONS.filter(option => option.value !== CESU);

    const netInclTaxesError = computed(() => (
      get(props.validations, 'netInclTaxes.required.$response') === false ? REQUIRED_LABEL : 'Montant TTC non valide'
    ));
    const paymentNature = computed(() => (
      !props.editedCoursePayment.nature
        ? ''
        : PAYMENT_NATURE_OPTIONS.find(option => option.value === props.editedCoursePayment.nature).label
    ));

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => {
      emit('update:edited-course-payment', set({ ...props.editedCoursePayment }, path, event));
    };

    return {
      // Data
      paymentOptions,
      PAYMENT_NATURE_OPTIONS,
      PAYMENT_STATUS_OPTIONS,
      // Computed
      netInclTaxesError,
      paymentNature,
      // Methods
      hide,
      input,
      submit,
      update,
      formatPrice,
    };
  },
};
</script>
