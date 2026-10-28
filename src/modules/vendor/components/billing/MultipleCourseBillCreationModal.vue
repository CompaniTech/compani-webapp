<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Créer des factures
    </template>
    <div v-if="paymentPlanOptions.length || hourlyPaymentPlanOptions.length">
      <ni-btn-toggle :model-value="mode" :options="modeOptions" @update:model-value="updateMode" />
      <div v-if="mode === MANUAL" class="q-mt-md">
        <ni-input caption="Nombre de factures à créer" type="number" in-modal required-field
          :model-value="newBillsQuantity" @update:model-value="update($event)"
          :error="validations.newBillsQuantity.$error" :error-message="quantityErrorMessage" last />
      </div>
      <div v-else-if="mode === PAYMENT_PLAN" class="q-mt-md">
        <ni-option-group :model-value="selectedPlanId" :options="planOptions" type="radio" required-field
          :error="validations.selectedPlanId.$error" error-message="Veuillez sélectionner un échéancier"
          @update:model-value="selectPlan">
          <template #label="opt">
            <q-expansion-item dense dense-toggle icon="calendar_month" :label="opt.label">
              <q-card class="q-pa-sm">
                <div v-for="(price, j) of opt.prices" :key="j" class="text-caption q-py-xs">
                  Mois {{ j + 1 }} : {{ formatPrice(price) }}
                </div>
              </q-card>
            </q-expansion-item>
          </template>
        </ni-option-group>
      </div>
      <div v-else class="q-mt-md">
        <ni-input caption="Nombre de factures à créer" type="number" in-modal required-field
          :model-value="newBillsQuantity" @update:model-value="update($event)"
          :error="validations.newBillsQuantity.$error" :error-message="quantityErrorMessage" />
        <ni-option-group :model-value="selectedHourlyPlanId" :options="hourlyPlanOptions" type="radio" required-field
          :error="validations.selectedHourlyPlanId.$error" error-message="Veuillez sélectionner une tarification"
          @update:model-value="selectHourlyPlan">
          <template #label="opt">
            <q-expansion-item dense dense-toggle icon="schedule" :label="opt.label">
              <q-card class="q-pa-sm">
                <div v-for="price of opt.prices" :key="price.step" class="text-caption q-py-xs">
                  {{ price.name }} : {{ formatPrice(price.hourlyAmount) }} / h
                </div>
                <div v-if="opt.elearningPrice" class="text-caption q-py-xs">
                  E-learning : {{ formatPrice(opt.elearningPrice) }}
                </div>
              </q-card>
            </q-expansion-item>
          </template>
        </ni-option-group>
      </div>
    </div>
    <ni-input v-else caption="Nombre de factures à créer" type="number" in-modal required-field
      :model-value="newBillsQuantity" @update:model-value="update($event)"
      :error="validations.newBillsQuantity.$error" :error-message="quantityErrorMessage" last />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Créer des factures" icon-right color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs, ref, watch } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import ButtonToggle from '@components/ButtonToggle';
import OptionGroup from '@components/form/OptionGroup';
import { formatPrice } from '@helpers/utils';
import { MANUAL, PAYMENT_PLAN, HOURLY_PAYMENT_PLAN } from '@data/constants';

export default {
  name: 'MultipleCourseBillCreationModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'ni-btn-toggle': ButtonToggle,
    'ni-option-group': OptionGroup,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    newBillsQuantity: { type: Number, required: true },
    paymentPlanOptions: { type: Array, default: () => [] },
    hourlyPaymentPlanOptions: { type: Array, default: () => [] },
    newPrices: { type: Array, default: () => [] },
    selectedPlanId: { type: String, default: null },
    selectedHourlyPlanId: { type: String, default: null },
    mode: { type: String, default: MANUAL },
  },
  emits: [
    'hide',
    'update:model-value',
    'submit',
    'update:new-bills-quantity',
    'update:new-prices',
    'update:selected-plan-id',
    'update:selected-hourly-plan-id',
    'update:mode',
  ],
  setup (props, { emit }) {
    const { validations, newBillsQuantity, paymentPlanOptions, hourlyPaymentPlanOptions } = toRefs(props);
    const initialBillsQuantity = ref(newBillsQuantity.value);

    watch(() => props.modelValue, (isOpen) => {
      if (isOpen) initialBillsQuantity.value = newBillsQuantity.value;
    });

    const modeOptions = computed(() => [
      { label: 'Manuel', value: MANUAL },
      ...paymentPlanOptions.value.length ? [{ label: 'Échéancier', value: PAYMENT_PLAN }] : [],
      ...hourlyPaymentPlanOptions.value.length ? [{ label: 'Facturation au réel', value: HOURLY_PAYMENT_PLAN }] : [],
    ]);

    const planOptions = computed(() => paymentPlanOptions.value.map((plan, i) => ({
      label: `Échéancier ${i + 1}`,
      value: plan._id,
      prices: plan.prices,
    })));

    const hourlyPlanOptions = computed(() => hourlyPaymentPlanOptions.value.map((plan, i) => ({
      label: `Tarification au réel ${i + 1}`,
      value: plan._id,
      prices: plan.prices,
      elearningPrice: plan.elearningPrice,
    })));

    const quantityErrorMessage = computed(() => {
      if (validations.value.newBillsQuantity.strictPositiveNumber.$response === false ||
        validations.value.newBillsQuantity.integerNumber.$response === false) {
        return 'Nombre non valide, doit être un entier strictement positif.';
      }
      return 'Nombre invalide.';
    });

    const hide = () => { emit('hide'); };

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = event => emit('update:new-bills-quantity', Number(event));

    const updateMode = (value) => {
      emit('update:mode', value);
      emit('update:selected-plan-id', null);
      emit('update:selected-hourly-plan-id', null);
      emit('update:new-prices', []);
      emit('update:new-bills-quantity', initialBillsQuantity.value);
    };

    const selectPlan = (planId) => {
      const plan = props.paymentPlanOptions.find(p => p._id === planId);
      emit('update:selected-plan-id', planId);
      emit('update:new-prices', plan.prices);
      emit('update:new-bills-quantity', plan.prices.length);
    };

    const selectHourlyPlan = (hourlyPlanId) => {
      emit('update:selected-hourly-plan-id', hourlyPlanId);
    };

    return {
      MANUAL,
      PAYMENT_PLAN,
      modeOptions,
      planOptions,
      hourlyPlanOptions,
      quantityErrorMessage,
      hide,
      input,
      submit,
      update,
      updateMode,
      selectPlan,
      selectHourlyPlan,
      formatPrice,
    };
  },
};
</script>

<style lang="sass" scoped>
:deep(.q-radio)
  align-items: flex-start
  .q-radio__inner
    margin-top: 6px
</style>
