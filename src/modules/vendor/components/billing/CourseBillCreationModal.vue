<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      {{ formatQuantity('Nouvelle', billsQuantity, 's', false) }}
      <span class="text-weight-bold">{{ formatQuantity('facture', billsQuantity, 's', false) }}</span>
    </template>
    <div>{{ courseName }} </div>
    <div class="course-bill-infos">
      <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
        <template #message>Facture pour le compte de {{ companiesName }}</template>
      </ni-banner>
      <div v-if="course.type === INTRA">{{ traineesQuantityInfos }} </div>
    </div>
    <company-select in-modal caption="Payeur" :company-options="payerOptions" :company="newBill.payer" required-field
      @update="update($event, 'payer')" :validation="validations.payer" />
    <ni-option-group v-if="![INTRA, SINGLE].includes(course.type)" in-modal :model-value="newBill.mainFee.countUnit"
      :options="countUnitOptions" type="radio" @update:model-value="update($event, 'mainFee.countUnit')"
      :error="validations.mainFee.countUnit.$error" caption="Unité" inline required-field />
    <div v-if="billsQuantity === 1">
      <ni-input v-if="course.type === SINGLE || !totalPriceToBill.global" in-modal :caption="priceCaption"
        :error="validations.mainFee.price.$error" type="number" :model-value="newBill.mainFee.price"
        @blur="validations.mainFee.price.$touch" suffix="€" required-field :error-message="errorMessages.price"
        @update:model-value="update($event, 'mainFee.price')" />
      <div v-else class="row items-center">
        <ni-input caption="Pourcentage" :error="validations.mainFee.percentage.$error" type="number" suffix="%"
          :model-value="newBill.mainFee.percentage" @blur="validations.mainFee.percentage.$touch" required-field
          :error-message="errorMessages.percentage" @update:model-value="update($event, 'mainFee.percentage')"
          class="percentage" />
        <div v-if="!validations.mainFee.percentage.$error" class="q-ml-md text-14">
          {{ computedPrice.global > 0 ? formatPrice(computedPrice.global) : '' }}
          {{ computedPrice.trainerFees > 0 ?
          `(+ frais de formateurs : ${formatPrice(computedPrice.trainerFees)})`
          : '' }}
        </div>
      </div>
      <ni-input in-modal caption="Quantité" :error="validations.mainFee.count.$error" type="number" required-field
        :model-value="newBill.mainFee.count" @blur="validations.mainFee.count.$touch" disable
        :error-message="errorMessages.count" @update:model-value="update($event, 'mainFee.count')" />
      <ni-date-input caption="Date d'échéance" :model-value="newBill.maturityDate" in-modal required-field
        :error="validations.maturityDate.$error" @blur="validations.maturityDate.$touch"
        @update:model-value="update($event, 'maturityDate')" />
    </div>
    <div v-else>
      <ni-input in-modal caption="Quantité" :error="validations.mainFee.count.$error" type="number" required-field
        :model-value="newBill.mainFee.count" @blur="validations.mainFee.count.$touch" disable
        :error-message="errorMessages.count" @update:model-value="update($event, 'mainFee.count')" />
    </div>
    <ni-input in-modal caption="Description" type="textarea" :model-value="newBill.mainFee.description"
      @update:model-value="update($event, 'mainFee.description')" />
    <template #footer>
      <ni-button :label="billsQuantity === 1 ? 'Créer la facture' : 'Créer les factures'" icon-right="add" color="white"
        :loading="loading" @click="submit" class="full-width modal-btn bg-primary" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs, watch } from 'vue';
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import OptionGroup from '@components/form/OptionGroup';
import Button from '@components/Button';
import CompanySelect from '@components/form/CompanySelect';
import Banner from '@components/Banner';
import DateInput from '@components/form/DateInput';
import { INTRA, SINGLE, TRAINEE, GROUP } from '@data/constants';
import { formatQuantity, formatName, formatPrice } from '@helpers/utils';
import { multiply, divide, toFixedToFloat } from '@helpers/numbers';

export default {
  name: 'CourseBillCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newBill: { type: Object, default: () => ({}) },
    payerOptions: { type: Array, default: () => [] },
    errorMessages: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    courseName: { type: String, default: '' },
    course: { type: Object, default: () => ({}) },
    traineesQuantity: { type: Number, default: 1 },
    companiesToBill: { type: Array, default: () => [] },
    totalPriceToBill: { type: Object, default: () => ({ global: 0, trainerFees: 0 }) },
    billsQuantity: { type: Number, required: true },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'company-select': CompanySelect,
    'ni-banner': Banner,
    'ni-option-group': OptionGroup,
    'ni-date-input': DateInput,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-bill'],
  setup (props, { emit }) {
    const { newBill, traineesQuantity, course, companiesToBill, totalPriceToBill, billsQuantity } = toRefs(props);

    const priceCaption = computed(() => (
      newBill.value.mainFee.countUnit === GROUP ? 'Prix du groupe' : 'Prix par stagiaire'
    ));

    const companiesName = computed(() => {
      const companies = course.value.companies.filter(c => companiesToBill.value.includes(c._id));
      return formatName(companies);
    });

    const traineesQuantityInfos = computed(() => `${formatQuantity('stagiaire', traineesQuantity.value)}
      ${companiesToBill.value.length > 1 ? 'des structures sélectionnées' : 'de la structure'}
      ${formatQuantity('inscrit', traineesQuantity.value, 's', false)} à cette formation`);

    const countUnitOptions = computed(() => [
      { label: 'Groupe', value: GROUP },
      { label: `Stagiaire (${formatQuantity('inscrit', traineesQuantity.value)} à cette formation)`, value: TRAINEE },
    ]);

    const computedPrice = computed(() => {
      if (course.value.type === SINGLE || !totalPriceToBill.value.global) return;

      return {
        global: toFixedToFloat(divide(multiply(newBill.value.mainFee.percentage, totalPriceToBill.value.global), 100)),
        trainerFees: toFixedToFloat(
          divide(multiply(newBill.value.mainFee.percentage, totalPriceToBill.value.trainerFees), 100)
        ),
      };
    });

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => {
      emit('update:new-bill', set({ ...newBill.value }, path, event));
      if (event === TRAINEE) {
        emit('update:new-bill', set({ ...newBill.value }, 'mainFee.count', traineesQuantity.value));
      } else if (event === GROUP) emit('update:new-bill', set({ ...newBill.value }, 'mainFee.count', 1));
    };

    watch(computedPrice, () => {
      if (computedPrice.value && billsQuantity.value === 1) {
        const newPrice = divide(computedPrice.value.global, newBill.value.mainFee.count);
        if (newBill.value.mainFee.price !== newPrice) {
          emit('update:new-bill', set({ ...newBill.value }, 'mainFee.price', newPrice));
        }
      }
    });

    return {
      // Data
      INTRA,
      SINGLE,
      // Computed
      countUnitOptions,
      priceCaption,
      traineesQuantityInfos,
      companiesName,
      computedPrice,
      // Methods
      hide,
      input,
      submit,
      update,
      formatPrice,
      formatQuantity,
    };
  },
};
</script>

<style lang="sass" scoped>
.percentage
  width: 25%
</style>
