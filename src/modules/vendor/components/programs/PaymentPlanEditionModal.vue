<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Éditer un <span class="text-weight-bold">échéancier</span>
    </template>
    <div v-for="(line, index) in priceLines" :key="line.uid" class="price-line">
      <ni-input class="price-input" in-modal type="number" :suffix="'€'" required-field
        :caption="`Échéance ${index + 1}`" v-model="line.amount" :data-cy="`price-input-${index}`"
        :error="getAmountError(index).hasError" :error-message="getAmountError(index).message" />
      <ni-button icon="close" :data-cy="`remove-price-${index}`" :disable="priceLines.length === 1"
        @click="removeLine(index)" />
    </div>
    <ni-button color="primary" icon="add" label="Ajouter une échéance" data-cy="add-price-line" @click="addLine" />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" color="primary" icon-right="add" data-cy="submit-payment-plan"
        label="Éditer l'échéancier" @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { ref, toRefs, computed, watch } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, helpers } from '@vuelidate/validators';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import { REQUIRED_LABEL } from '@data/constants';
import { NotifyWarning } from '@components/popup/notify';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';

export default {
  name: 'PaymentPlanEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    paymentPlan: { type: Object, default: () => ({ prices: [] }) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const { paymentPlan, modelValue } = toRefs(props);

    let uidCounter = 0;
    const makeLine = (amount = null) => {
      uidCounter += 1;
      return { uid: `payment-plan-line-${uidCounter}`, amount };
    };
    const priceLines = ref([makeLine()]);

    const rules = computed(() => ({
      priceLines: { $each: helpers.forEach({ amount: { required, strictPositiveNumber } }) },
    }));
    const v$ = useVuelidate(rules, { priceLines });

    watch(modelValue, (isOpen) => {
      if (!isOpen) return;
      const prices = paymentPlan.value.prices || [];
      priceLines.value = prices.length ? prices.map(price => makeLine(price)) : [makeLine()];
      v$.value.$reset();
    });

    const addLine = () => priceLines.value.push(makeLine());
    const removeLine = (index) => { priceLines.value.splice(index, 1); };

    const getAmountError = (index) => {
      const validation = v$.value.priceLines.$each.$response.$data[index].amount;
      if (!validation || !validation.$error) return { hasError: false, message: '' };
      if (validation.required === false) return { hasError: true, message: REQUIRED_LABEL };
      return { hasError: true, message: 'Nombre non valide, doit être strictement positif' };
    };

    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };

    const submit = () => {
      v$.value.$touch();
      if (v$.value.$error) return NotifyWarning('Champ(s) invalide(s).');

      const prices = priceLines.value.map(line => Number(line.amount));
      return emit('submit', { _id: paymentPlan.value._id, prices });
    };

    return {
      // Data
      priceLines,
      // Methods
      addLine,
      removeLine,
      getAmountError,
      hide,
      input,
      submit,
    };
  },
};
</script>

<style lang="sass" scoped>
.price-line
  display: flex
  align-items: center
.price-input
  flex: 1
</style>
