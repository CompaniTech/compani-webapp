<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
      Ajouter un <span class="text-weight-bold">{{ paymentNature.toLowerCase() }}</span>
    </template>
    <ni-btn-toggle :model-value="newCoursePayment.nature" :options="PAYMENT_NATURE_OPTIONS"
      @update:model-value="update($event, 'nature')" />
    <div>
      {{ paymentNature }} pour la facture
      <span class="text-weight-bold">
          {{ coursePaymentMetaInfo.number }} - {{ formatPrice(coursePaymentMetaInfo.netInclTaxes) }}
      </span>
    </div>
    <div class="course-bill-infos">
      <div>{{ coursePaymentMetaInfo.courseName }}</div>
      <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
        <template #message>{{ paymentNature }} pour le compte de {{ coursePaymentMetaInfo.companiesName }}</template>
      </ni-banner>
    </div>
    <ni-input in-modal caption="Montant" suffix="€" type="number" required-field :error-message="netInclTaxesError"
      :model-value="newCoursePayment.netInclTaxes" @update:model-value="update($event, 'netInclTaxes')"
      :error="validations.netInclTaxes.$error" @blur="validations.netInclTaxes.$touch" />
    <ni-select in-modal caption="Type" :model-value="newCoursePayment.type" required-field :options="paymentOptions"
      @update:model-value="update($event, 'type')" @blur="validations.type.$touch" :error="validations.type.$error" />
    <ni-date-input :model-value="newCoursePayment.date" @update:model-value="update($event, 'date')" in-modal
      required-field :error="validations.date.$error" @blur="validations.date.$touch" caption="Date" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" :label="`Créer le ${ paymentNature.toLowerCase() }`"
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
import Banner from '@components/Banner';
import Button from '@components/Button';
import DateInput from '@components/form/DateInput';
import Modal from '@components/modal/Modal';
import ButtonToggle from '@components/ButtonToggle';
import { formatPrice } from '@helpers/utils';
import { REQUIRED_LABEL, PAYMENT_OPTIONS, PAYMENT_NATURE_OPTIONS, CESU } from '@data/constants';

export default {
  name: 'CoursePaymentCreationModal',
  components: {
    'ni-select': Select,
    'ni-input': Input,
    'ni-date-input': DateInput,
    'ni-modal': Modal,
    'ni-btn-toggle': ButtonToggle,
    'ni-button': Button,
    'ni-banner': Banner,
  },
  props: {
    newCoursePayment: { type: Object, default: () => ({}) },
    coursePaymentMetaInfo: { type: Object, default: () => ({}) },
    modelValue: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-course-payment'],
  setup (props, { emit }) {
    const paymentOptions = PAYMENT_OPTIONS.filter(option => option.value !== CESU);

    const netInclTaxesError = computed(() => (
      get(props.validations, 'netInclTaxes.required.$response') === false ? REQUIRED_LABEL : 'Montant TTC non valide'
    ));
    const paymentNature = computed(() => (
      !props.newCoursePayment.nature
        ? ''
        : PAYMENT_NATURE_OPTIONS.find(option => option.value === props.newCoursePayment.nature).label
    ));

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => {
      emit('update:new-course-payment', set({ ...props.newCoursePayment }, path, event));
    };

    return {
      // Data
      paymentOptions,
      PAYMENT_NATURE_OPTIONS,
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
