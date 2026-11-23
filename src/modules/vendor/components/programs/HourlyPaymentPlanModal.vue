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
    <ni-input in-modal :model-value="plan.name" caption="Nom" required-field :error="!!getNameError()"
      :error-message="getNameError()" @update:model-value="updateName" />
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
      <div class="row justify-between">
        <p class="q-mb-none input-caption">Limite d'heures e-learning facturables (optionnelle)</p>
        <q-icon v-if="getElearningLimitError()" name="error_outline" color="secondary" />
      </div>
      <q-field class="duration-field" dense :error="!!getElearningLimitError()"
        :error-message="getElearningLimitError()" borderless>
        <div class="duration-container row items-end">
          <ni-input in-modal :model-value="limitHours" suffix="h" class="flex-1 q-pr-sm"
            @update:model-value="updateTmp($event, 'hours')" @blur="updateElearningLimit()" />
          <ni-input in-modal :model-value="limitMinutes" suffix="min" class="flex-1 q-pl-sm"
            @update:model-value="updateTmp($event, 'minutes')" @blur="updateElearningLimit()" />
        </div>
      </q-field>
    </div>
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" color="primary" icon-right="add" :loading="loading"
        :label="isEdition ? 'Éditer la tarification' : 'Créer la tarification'" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref, computed, watch } from 'vue';
import { REQUIRED_LABEL, PT0S } from '@data/constants';
import CompaniDuration from '@helpers/dates/companiDurations';
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

    const updateName = (value) => { emit('update:plan', { ...plan.value, name: value }); };

    const updateHourlyAmount = (value, index) => {
      emit('update:plan', {
        ...plan.value,
        prices: plan.value.prices.map((p, i) => (i === index ? { ...p, hourlyAmount: value } : p)),
      });
    };

    const updateElearningPrice = (value) => { emit('update:plan', { ...plan.value, elearningPrice: value }); };

    const limitHours = ref(0);
    const limitMinutes = ref(0);
    const currentEditedField = ref({});

    watch(
      () => plan.value.elearningLimit,
      () => {
        const durationObject = CompaniDuration(plan.value.elearningLimit || PT0S).toHoursAndMinutesObject();
        limitHours.value = durationObject.hours;
        limitMinutes.value = durationObject.minutes;
      },
      { immediate: true }
    );

    const updateTmp = (event, path) => { currentEditedField.value = { path, event: event || '0' }; };

    const updateElearningLimit = () => {
      const { path, event } = currentEditedField.value;

      if (event) {
        const parsedEvent = parseFloat(event);
        const value = path === 'hours'
          ? `PT${parsedEvent || 0}H${limitMinutes.value}M`
          : `PT${limitHours.value}H${parsedEvent || 0}M`;

        const { hours, minutes } = CompaniDuration(value).toHoursAndMinutesObject();
        emit('update:plan', { ...plan.value, elearningLimit: `PT${hours}H${minutes}M` });
        currentEditedField.value = {};
      }
    };

    const getNameError = () => {
      if (!showErrors.value || !validations.value.name.$error) return '';

      return REQUIRED_LABEL;
    };

    const getAmountError = (index) => {
      if (!showErrors.value) return '';
      const validation = validations.value.prices.$each.$response.$data[index].hourlyAmount;
      if (!validation) return '';
      if (validation.required === false) return REQUIRED_LABEL;
      if (validation.strictPositiveNumber === false) return 'Nombre non valide, doit être strictement positif';
      return '';
    };

    const getElearningLimitError = () => {
      if (!showErrors.value || !validations.value.elearningLimit.$error) return '';

      return 'Durée non valide';
    };

    const getElearningPriceError = () => {
      if (!showErrors.value || !validations.value.elearningPrice.$error) return '';
      if (validations.value.elearningPrice.required.$invalid) return REQUIRED_LABEL;
      return 'Nombre non valide, doit être strictement positif';
    };

    return {
      // Data
      limitHours,
      limitMinutes,
      // Computed
      hourlyPaymentPlansCount,
      // Methods
      formatQuantity,
      hide,
      input,
      submit,
      getStepName,
      updateName,
      updateHourlyAmount,
      updateElearningPrice,
      updateTmp,
      updateElearningLimit,
      getNameError,
      getAmountError,
      getElearningPriceError,
      getElearningLimitError,
    };
  },
};
</script>

<style lang="sass" scoped>
.duration-field
  :deep(.q-field__control)
    border: none !important

.duration-container
  :deep(.q-field__control)
    border: 1px solid $copper-grey-300 !important
    border-radius: 3px !important
  :deep(.q-field__bottom)
    display: none
</style>
