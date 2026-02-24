<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Créer une nouvelle <span class="text-weight-bold">version des tarifs</span>
    </template>
    <ni-input v-for="(price, index) in newSubProgramPriceVersion.prices" :key="price.step" in-modal
      type="number" :model-value="price.hourlyAmount" :suffix="'€ / h'" required-field
      :caption="`Tarif horaire pour ${getStepName(price.step)}`"
      :error="validations.prices.$each.$response.$data[index].hourlyAmount.$error"
      :error-message="getAmountError(index)" @update:model-value="updateHourlyAmount($event, index)" />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Créer la nouvelle version de tarifs" color="primary"
        icon-right="add" @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import { REQUIRED_LABEL } from '@data/constants';

export default {
  name: 'SubProgramPriceVersionCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newSubProgramPriceVersion: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
  },
  emits: ['hide', 'update:model-value', 'update:new-sub-program-price-version', 'submit'],
  setup (props, { emit }) {
    const { newSubProgramPriceVersion, validations } = toRefs(props);

    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };
    const submit = () => { emit('submit', newSubProgramPriceVersion.value.subProgram._id); };

    const getStepName = (stepId) => {
      const step = newSubProgramPriceVersion.value.subProgram.steps.find(s => s._id === stepId);
      return step ? step.name : '';
    };

    const updateHourlyAmount = (value, index) => {
      const prices = newSubProgramPriceVersion.value.prices
        .map((p, i) => (i === index ? { ...p, hourlyAmount: Number(value) } : p));
      emit('update:new-sub-program-price-version', { ...newSubProgramPriceVersion.value, prices });
    };

    const getAmountError = (index) => {
      const validation = validations.value.prices.$each.$response.$data[index].hourlyAmount;
      if (!validation) return '';
      if (validation.required === false) return REQUIRED_LABEL;
      if (validation.strictPositiveNumber === false) return 'Nombre non valide, doit être strictement positif';
      return '';
    };

    const getHourlyAmount = (stepId) => {
      const price = newSubProgramPriceVersion.value.prices.find(p => p.step === stepId);

      return price ? price.hourlyAmount : null;
    };

    return {
      // methods
      hide,
      input,
      submit,
      updateHourlyAmount,
      getHourlyAmount,
      getStepName,
      getAmountError,
    };
  },
};
</script>
