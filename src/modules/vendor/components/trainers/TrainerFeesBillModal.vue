<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      {{ modalTitle }}
    </template>
    <div v-if="course" class="q-mb-md">
      <div v-if="hasPlannedSalary">Honoraires prévus : {{ formatPrice(course.plannedSalary) }}</div>
      <div>Montant déjà facturé : {{ formatPrice(course.invoicedAmount) }}</div>
      <div v-if="amountExceedsPlannedSalaryMessage" class="text-red-800">
        {{ amountExceedsPlannedSalaryMessage }}
      </div>
    </div>
    <ni-input type="file" in-modal caption="Facture (PDF)" v-model="bill.file" @blur="validations.file.$touch"
      :error="validations.file.$error" :extensions="[DOC_EXTENSIONS]" required-field />
    <ni-input caption="Numéro de facture" in-modal v-model="bill.number" @blur="validations.number.$touch"
      :error="validations.number.$error" required-field />
    <ni-input caption="Montant" suffix="€" type="number" in-modal v-model="bill.amount" last required-field
      @blur="validations.amount.$touch" :error="validations.amount.$error" :error-message="amountErrorMessage" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Soumettre ma facture" :loading="loading" color="white"
        @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import get from 'lodash/get';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import { composeCourseName } from '@helpers/courses';
import { formatPrice } from '@helpers/utils';
import { DOC_EXTENSIONS, REQUIRED_LABEL } from '@data/constants';

export default {
  name: 'TrainerFeesBillModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    bill: { type: Object, required: true },
    course: { type: Object, default: null },
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const { course, bill, validations } = toRefs(props);
    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const courseName = computed(() => (course.value ? composeCourseName(course.value) : ''));

    const modalTitle = computed(() => (course.value
      ? `Facturer le groupe ${courseName.value}`
      : 'Facturer des frais annexes'));

    const hasPlannedSalary = computed(() => !!course.value && ![undefined, null].includes(course.value.plannedSalary));

    const amountExceedsPlannedSalaryMessage = computed(() => {
      const amountExceedsPlannedSalary = hasPlannedSalary.value &&
      Number(bill.value.amount) + course.value.invoicedAmount > course.value.plannedSalary;

      return amountExceedsPlannedSalary ? 'Le montant total facturé dépasse les honoraires prévus pour ce groupe.' : '';
    });

    const amountErrorMessage = computed(() => (
      get(validations.value, 'amount.required.$response') === false ? REQUIRED_LABEL : 'Montant non valide'
    ));

    return {
      // Data
      DOC_EXTENSIONS,
      // Computed
      courseName,
      hasPlannedSalary,
      modalTitle,
      amountExceedsPlannedSalaryMessage,
      amountErrorMessage,
      // Methods
      formatPrice,
      hide,
      input,
      submit,
    };
  },
};
</script>
