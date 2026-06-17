<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Ajouter un <span class="text-weight-bold">échéancier</span>
    </template>
    <div v-for="(line, index) in priceLines" :key="line.uid" class="price-line">
      <ni-input class="price-input" in-modal type="number" :suffix="'€'" required-field
        :caption="`Échéance ${index + 1}`" v-model="line.amount"
        :error="hasAmountError(index)" :error-message="getAmountError(index)" />
      <ni-button icon="close" :disable="priceLines.length === 1" @click="removeLine(index)" />
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
        label="Créer l'échéancier" @click="submit" :loading="loading" />
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
  name: 'PaymentPlanAdditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const { modelValue } = toRefs(props);

    let uidCounter = 0;
    const makeLine = (amount = null) => {
      uidCounter += 1;
      return { uid: `payment-plan-line-${uidCounter}`, amount };
    };
    const priceLines = ref([makeLine()]);
    const showErrors = ref(false);

    const rules = computed(() => ({
      priceLines: { $each: helpers.forEach({ amount: { required, strictPositiveNumber } }) },
    }));
    const v$ = useVuelidate(rules, { priceLines });

    watch(modelValue, (isOpen) => {
      if (!isOpen) return;
      priceLines.value = [makeLine()];
      showErrors.value = false;
      v$.value.$reset();
    });

    const addLine = () => priceLines.value.push(makeLine());
    const removeLine = (index) => { priceLines.value.splice(index, 1); };

    const hasAmountError = index => showErrors.value && v$.value.priceLines.$each.$response.$data[index].amount.$error;

    const getAmountError = (index) => {
      const validation = v$.value.priceLines.$each.$response.$data[index].amount;
      if (!validation) return '';
      if (validation.required === false) return REQUIRED_LABEL;
      if (validation.strictPositiveNumber === false) return 'Nombre non valide, doit être strictement positif';
      return '';
    };

    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };

    const submit = () => {
      showErrors.value = true;
      v$.value.$touch();
      if (v$.value.$error) return NotifyWarning('Champ(s) invalide(s).');

      const prices = priceLines.value.map(line => Number(line.amount));
      return emit('submit', { prices });
    };

    return {
      // Data
      priceLines,
      // Methods
      addLine,
      removeLine,
      hasAmountError,
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
