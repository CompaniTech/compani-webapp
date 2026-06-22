<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Éditer un <span class="text-weight-bold">échéancier</span>
    </template>
    <div v-for="(line, index) in editedPaymentPlan.priceLines" :key="index" class="price-line">
      <ni-input class="price-input" in-modal type="number" :suffix="'€'" required-field
        :caption="`Échéance ${index + 1}`" :model-value="line.amount" :error-message="getAmountError(index)"
        :error="showErrors && validations.priceLines.$each.$response.$data[index].amount.$error"
        @update:model-value="updateAmount($event, index)" />
      <ni-button icon="close" :disable="editedPaymentPlan.priceLines.length === 1" @click="removeLine(index)" />
    </div>
    <div class="price-line q-mb-lg">
      <div class="borders-parent add-line price-input" @click="addLine">
        <q-icon name="add" size="xs" />
        <span>Ajouter une échéance</span>
      </div>
      <ni-button class="spacer" icon="close" />
    </div>
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" color="primary" icon-right="add"
        label="Éditer l'échéancier" @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref } from 'vue';
import { REQUIRED_LABEL } from '@data/constants';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';

export default {
  name: 'PaymentPlanEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    editedPaymentPlan: { type: Object, default: () => ({ priceLines: [] }) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'update:edited-payment-plan', 'submit'],
  setup (props, { emit }) {
    const { editedPaymentPlan, validations } = toRefs(props);
    const showErrors = ref(false);

    const hide = () => {
      showErrors.value = false;
      emit('hide');
    };

    const input = (event) => { emit('update:model-value', event); };

    const addLine = () => {
      emit('update:edited-payment-plan', {
        ...editedPaymentPlan.value,
        priceLines: [...editedPaymentPlan.value.priceLines, { amount: null }],
      });
    };

    const removeLine = (index) => {
      emit('update:edited-payment-plan', {
        ...editedPaymentPlan.value,
        priceLines: editedPaymentPlan.value.priceLines.filter((_, i) => i !== index),
      });
    };

    const updateAmount = (value, index) => {
      emit('update:edited-payment-plan', {
        ...editedPaymentPlan.value,
        priceLines: editedPaymentPlan.value.priceLines
          .map((line, i) => (i === index ? { ...line, amount: value } : line)),
      });
    };

    const getAmountError = (index) => {
      const validation = validations.value.priceLines.$each.$response.$data[index].amount;
      if (!validation) return '';
      if (validation.required === false) return REQUIRED_LABEL;
      if (validation.strictPositiveNumber === false) return 'Nombre non valide, doit être strictement positif';
      return '';
    };

    const submit = () => {
      showErrors.value = true;
      emit('submit');
    };

    return {
      // Data
      showErrors,
      // Methods
      hide,
      input,
      addLine,
      removeLine,
      updateAmount,
      getAmountError,
      submit,
    };
  },
};
</script>

<style lang="sass" scoped>
.price-line
  display: flex
  flex-direction: row
.price-input
  flex: 1
.add-line
  display: flex
  align-items: center
  height: 40px
  padding: 0 10px
  background-color: white
  color: $primary
  font-size: 16px
  cursor: pointer
  .q-icon
    margin-right: 8px
.spacer
  visibility: hidden
</style>
