<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      {{ isEdition ? 'Éditer' : 'Ajouter' }} une <span class="text-weight-bold">tarification au réel</span>
    </template>
    <ni-banner v-if="!isEdition && hourlyPaymentPlansCount" class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
      <template #message>
        Il existe déjà {{ formatQuantity('tarification', hourlyPaymentPlansCount) }} au réel.
      </template>
    </ni-banner>
    <div v-for="(price, index) in plan.prices" :key="price.step" class="q-mb-md">
      <p class="text-weight-bold q-mb-none">{{ getStepName(price.step) }}</p>
      <ni-input in-modal type="number" :model-value="price.hourlyAmount" suffix="€ / h" required-field
        caption="Tarif horaire" :error-message="getAmountError(index)" :error="!!getAmountError(index)"
        @update:model-value="updateHourlyAmount($event, index)" />
    </div>
    <div v-if="plan.hasELearning" class="q-mb-md">
      <p class="text-weight-bold q-mb-none">E-learning</p>
      <ni-input in-modal type="number" :model-value="plan.elearningPrice" suffix="€ / h" required-field
        caption="Tarif e-learning" :error-message="getElearningPriceError()" :error="!!getElearningPriceError()"
        @update:model-value="updateElearningPrice" />
    </div>
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" color="primary" icon-right="add" :loading="loading"
        :label="isEdition ? 'Éditer la tarification' : 'Créer la tarification'" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref, computed } from 'vue';
import { REQUIRED_LABEL } from '@data/constants';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Banner from '@components/Banner';
import { formatQuantity } from '@helpers/utils';

export default {
  name: 'HourlyPaymentPlanModal',
  props: {
    modelValue: { type: Boolean, default: false },
    plan: { type: Object, default: () => ({ subProgram: {}, prices: [] }) },
    isEdition: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-banner': Banner,
  },
  emits: ['hide', 'update:model-value', 'update:plan', 'submit'],
  setup (props, { emit }) {
    const { plan, validations } = toRefs(props);
    const showErrors = ref(false);
    const hourlyPaymentPlansCount = computed(() => plan.value.subProgram.hourlyPaymentPlansCount);

    const hide = () => {
      showErrors.value = false;
      emit('hide');
    };
    const input = (event) => { emit('update:model-value', event); };
    const submit = () => {
      showErrors.value = true;
      emit('submit');
    };

    const getStepName = stepId => (plan.value.subProgram.steps || []).find(s => s._id === stepId)?.name || '';

    const updateHourlyAmount = (value, index) => {
      emit('update:plan', {
        ...plan.value,
        prices: plan.value.prices.map((p, i) => (i === index ? { ...p, hourlyAmount: value } : p)),
      });
    };

    const updateElearningPrice = (value) => { emit('update:plan', { ...plan.value, elearningPrice: value }); };

    const getAmountError = (index) => {
      if (!showErrors.value) return '';
      const validation = validations.value.prices.$each.$response.$data[index].hourlyAmount;
      if (!validation) return '';
      if (validation.required === false) return REQUIRED_LABEL;
      if (validation.strictPositiveNumber === false) return 'Nombre non valide, doit être strictement positif';
      return '';
    };

    const getElearningPriceError = () => {
      if (!showErrors.value || !validations.value.elearningPrice.$error) return '';
      if (validations.value.elearningPrice.required.$invalid) return REQUIRED_LABEL;
      return 'Nombre non valide, doit être strictement positif';
    };

    return {
      // Computed
      hourlyPaymentPlansCount,
      // Methods
      formatQuantity,
      hide,
      input,
      submit,
      getStepName,
      updateHourlyAmount,
      updateElearningPrice,
      getAmountError,
      getElearningPriceError,
    };
  },
};
</script>
