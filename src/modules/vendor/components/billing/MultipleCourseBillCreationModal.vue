<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Créer des factures
    </template>
    <div v-if="paymentPlanOptions.length">
      <ni-btn-toggle :model-value="mode" :options="modeOptions" @update:model-value="updateMode" />
      <div v-if="mode === MANUAL" class="q-mt-md">
        <ni-input caption="Nombre de factures à créer" type="number" in-modal required-field
          :model-value="newBillsQuantity" @update:model-value="update($event)" :error="validations.$error"
          :error-message="quantityErrorMessage" last />
      </div>
      <div v-else class="q-mt-md">
        <div v-for="(plan, i) of paymentPlanOptions" :key="plan._id" class="q-mb-sm">
          <q-radio :val="plan._id" v-model="selectedPlanId" :label="`Échéancier ${i + 1}`"
            @update:model-value="selectPlan(plan)" dense />
          <q-expansion-item dense dense-toggle icon="calendar_month" label="Voir le détail"
            v-if="selectedPlanId === plan._id" header-class="text-caption">
            <q-card class="bg-grey-1 q-pa-sm">
              <div v-for="(price, j) of plan.prices" :key="j" class="text-caption q-py-xs">
                Mois {{ j + 1 }} : {{ formatPrice(price) }}
              </div>
            </q-card>
          </q-expansion-item>
        </div>
      </div>
    </div>
    <ni-input v-else caption="Nombre de factures à créer" type="number" in-modal required-field
      :model-value="newBillsQuantity" @update:model-value="update($event)" :error="validations.$error"
      :error-message="quantityErrorMessage" last />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Créer des factures" icon-right color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, ref, toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import ButtonToggle from '@components/ButtonToggle';
import { formatPrice } from '@helpers/utils';

const MANUAL = 'manual';
const PAYMENT_PLAN = 'paymentPlan';

export default {
  name: 'MultipleCourseBillCreationModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'ni-btn-toggle': ButtonToggle,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    newBillsQuantity: { type: Number, required: true },
    paymentPlanOptions: { type: Array, default: () => [] },
    newPrices: { type: Array, default: () => [] },
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-bills-quantity', 'update:new-prices'],
  setup (props, { emit }) {
    const { validations } = toRefs(props);

    const mode = ref(MANUAL);
    const selectedPlanId = ref(null);

    const modeOptions = [
      { label: 'Manuel', value: MANUAL },
      { label: 'Échéancier', value: PAYMENT_PLAN },
    ];

    const quantityErrorMessage = computed(() => {
      if (validations.value.strictPositiveNumber.$response === false ||
        validations.value.integerNumber.$response === false) {
        return 'Nombre non valide, doit être un entier strictement positif.';
      }
      return 'Nombre invalide.';
    });

    const hide = () => {
      mode.value = MANUAL;
      selectedPlanId.value = null;
      emit('hide');
    };

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = event => emit('update:new-bills-quantity', Number(event));

    const updateMode = (value) => {
      mode.value = value;
      if (value === MANUAL) {
        selectedPlanId.value = null;
        emit('update:new-prices', []);
      }
    };

    const selectPlan = (plan) => {
      selectedPlanId.value = plan._id;
      emit('update:new-prices', plan.prices);
      emit('update:new-bills-quantity', plan.prices.length);
    };

    return {
      MANUAL,
      modeOptions,
      selectedPlanId,
      mode,
      quantityErrorMessage,
      hide,
      input,
      submit,
      update,
      updateMode,
      selectPlan,
      formatPrice,
    };
  },
};
</script>
