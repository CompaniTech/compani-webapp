<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Créer une nouvelle <span class="text-weight-bold">version des tarifs des intervenants</span>
    </template>
    <div v-for="step in newSubProgramPriceVersion.subProgram.steps" :key="step._id" class="step-prices-block">
      <p class="text-weight-bold">{{ step.name }}</p>
      <div v-for="price in getStepPrices(step._id)" :key="price.globalIndex" class="price-row">
        <ni-button v-if="getStepPrices(step._id).length > 1" icon="delete" class="delete-price-btn"
          @click="removePrice(price.globalIndex)" />
        <ni-input in-modal type="number" :model-value="price.hourlyAmount" suffix="€ / h" required-field
          caption="Tarif horaire" :error-message="getAmountError(price.globalIndex)"
          :error="!!getAmountError(price.globalIndex)" class="amount-input"
          @update:model-value="updateHourlyAmount($event, price.globalIndex)" />
        <ni-select in-modal clearable caption="Rôle" :model-value="price.role"
          :options="availableRoleOptions(step._id, price.role)" :error="!!getRoleError(step._id, price.role)"
          :error-message="getRoleError(step._id, price.role)" class="role-select"
          @update:model-value="updateRole($event, price.globalIndex)" />
      </div>
      <ni-button v-if="canAddRole(step._id)" label="Ajouter un tarif" icon="add" @click="addPrice(step._id)"
        class="add-price-btn" />
    </div>
    <ni-date-input caption="Date d'effet" v-model="newSubProgramPriceVersion.effectiveDate"
      class="date-item" :error="validations.effectiveDate.$error" :min="newSubProgramPriceVersion.minEffectiveDate" />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Créer la nouvelle version de tarifs des intervenants"
        color="primary" icon-right="add" @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
import Button from '@components/Button';
import SecondaryButton from '@components/SecondaryButton';
import DateInput from '@components/form/DateInput';
import { REQUIRED_LABEL, TRAINER_ROLE_OPTIONS } from '@data/constants';

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
    'ni-select': Select,
    'ni-button': Button,
    'ni-secondary-button': SecondaryButton,
    'ni-modal': Modal,
    'ni-date-input': DateInput,
  },
  emits: ['hide', 'update:model-value', 'update:new-sub-program-price-version', 'submit'],
  setup (props, { emit }) {
    const { newSubProgramPriceVersion, validations } = toRefs(props);

    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };
    const submit = () => { emit('submit', newSubProgramPriceVersion.value.subProgram._id); };

    const emitPrices = (prices) => {
      emit('update:new-sub-program-price-version', { ...newSubProgramPriceVersion.value, prices });
    };

    const getStepPrices = stepId => newSubProgramPriceVersion.value.prices
      .reduce((acc, price, globalIndex) => {
        if (price.step === stepId) acc.push({ ...price, globalIndex });
        return acc;
      }, []);

    const updateHourlyAmount = (value, index) => {
      const prices = newSubProgramPriceVersion.value.prices
        .map((p, i) => (i === index ? { ...p, hourlyAmount: Number(value) } : p));
      emitPrices(prices);
    };

    const updateRole = (value, index) => {
      const prices = newSubProgramPriceVersion.value.prices
        .map((p, i) => (i === index ? { ...p, role: value || undefined } : p));
      emitPrices(prices);
    };

    const addPrice = (stepId) => {
      const prices = [...newSubProgramPriceVersion.value.prices, { step: stepId, role: undefined, hourlyAmount: 0 }];
      emitPrices(prices);
    };

    const removePrice = (index) => {
      const prices = newSubProgramPriceVersion.value.prices.filter((_, i) => i !== index);
      emitPrices(prices);
    };

    const availableRoleOptions = (stepId, currentRole) => TRAINER_ROLE_OPTIONS.filter(option => (
      option.value === currentRole ||
      !newSubProgramPriceVersion.value.prices.some(p => p.step === stepId && p.role === option.value)
    ));

    const canAddRole = stepId => getStepPrices(stepId).length < TRAINER_ROLE_OPTIONS.length;

    const getAmountError = (index) => {
      if (!validations.value.prices.$dirty) return '';
      const validation = validations.value.prices.$each.$response.$data[index].hourlyAmount;
      if (!validation) return '';
      if (validation.required === false) return REQUIRED_LABEL;
      if (validation.strictPositiveNumber === false) return 'Nombre non valide, doit être strictement positif';
      return '';
    };

    const getRoleError = (stepId, role) => {
      if (!validations.value.prices.$dirty || !validations.value.prices.hasConsistentRoles?.$invalid) return '';
      const isRoleMissing = getStepPrices(stepId).length > 1 && !role;

      return isRoleMissing ? 'Champs requis, cette étape a plusieurs tarifs' : '';
    };

    return {
      // methods
      hide,
      input,
      submit,
      getStepPrices,
      updateHourlyAmount,
      updateRole,
      addPrice,
      removePrice,
      availableRoleOptions,
      canAddRole,
      getAmountError,
      getRoleError,
    };
  },
};
</script>

<style lang="sass" scoped>
.step-prices-block
  padding-bottom: 16px
  margin-bottom: 16px
  border-bottom: 1px solid $copper-grey-200
  &:last-child
    border-bottom: none
    margin-bottom: 0
.price-row
  padding: 8px 0
  @media screen and (min-width: 768px)
    display: flex
    align-items: flex-end
    gap: 16px
.amount-input
  @media screen and (min-width: 768px)
    flex: 3 1 0
.role-select
  @media screen and (min-width: 768px)
    flex: 7 1 0
.delete-price-btn
  display: block
  margin-left: auto
  @media screen and (min-width: 768px)
    margin-left: 0
    align-self: center
.add-price-btn
  display: block
  margin-left: auto
</style>
