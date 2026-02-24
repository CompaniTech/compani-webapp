<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Créer une nouvelle <span class="text-weight-bold">version des tarifs</span>
    </template>
    <ni-input v-for="step of localPriceVersion.steps" :key="step._id" in-modal type="number"
      :model-value="getHourlyAmount(step._id)"
      :caption="`Tarif horaire pour ${step.name}`"
      required-field @update:model-value="updateHourlyAmount($event, step._id)" />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Créer la nouvelle version de tarifs" color="primary"
        icon-right="add" @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref, watch } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';

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
    const { newSubProgramPriceVersion } = toRefs(props);
    const localPriceVersion = ref({ prices: [], effectiveDate: '', steps: [] });

    watch(
      () => props.newSubProgramPriceVersion,
      (val) => {
        localPriceVersion.value = {
          prices: val.prices || [],
          effectiveDate: val.effectiveDate || '',
          steps: val.steps ? [...val.steps] : [],
        };
      },
      { immediate: true, deep: true }
    );
    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };
    const submit = () => { emit('submit'); };

    const getHourlyAmount = (stepId) => {
      const price = newSubProgramPriceVersion.value.prices.find(p => p.step === stepId);

      return price ? price.hourlyAmount : null;
    };

    const updateHourlyAmount = (value, stepId) => {
      const { prices } = newSubProgramPriceVersion.value;

      const existingPrice = prices.find(p => p.step === stepId);

      if (existingPrice) existingPrice.hourlyAmount = Number(value);
      else {
        prices.push({ step: stepId, hourlyAmount: Number(value) });
      }

      emit('update:new-sub-program-price-version', { ...newSubProgramPriceVersion.value, prices });
    };

    return {
      // data
      localPriceVersion,
      // methods
      hide,
      input,
      submit,
      updateHourlyAmount,
      getHourlyAmount,
    };
  },
};
</script>
