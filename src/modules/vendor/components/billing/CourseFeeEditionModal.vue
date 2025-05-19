<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      <span class="text-weight-bold">{{ title }}</span>
    </template>
    <div class="course-bill-infos">
      <div>{{ courseName }} </div>
      <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
        <template #message>Facture pour le compte de {{ companiesName }}</template>
      </ni-banner>
    </div>
    <div v-if="!isTrainerFeesWithPercentage">
    <ni-option-group v-if="showCountUnit" in-modal :model-value="courseFee.countUnit" :options="countUnitOptions"
      type="radio" @update:model-value="update($event, 'countUnit')" :error="validations.countUnit.$error"
      caption="Unité" inline required-field :disable="isBilled" />
    <ni-input v-if="isSingleCourse || !totalPriceToBill.global" in-modal :caption="priceCaption"
      :error="validations.price.$error" type="number" :disable="isBilled" :model-value="courseFee.price"
      @blur="validations.price.$touch" suffix="€" required-field :error-message="errorMessages.price"
      @update:model-value="update($event, 'price')" />
    <div v-else class="row items-center">
      <ni-input caption="Pourcentage" :error="validations.percentage.$error" type="number" suffix="%"
        :model-value="courseFee.percentage" @blur="validations.percentage.$touch" required-field
        :error-message="errorMessages.percentage" @update:model-value="update($event, 'percentage')"
        class="percentage" />
      <div class="q-ml-md text-14">
        {{
          !validations.percentage.$error && computedPrice.global > 0
            ? formatPrice(computedPrice.global)
            : ''
        }}
        {{
          !validations.percentage.$error && computedPrice.trainerFees > 0
            ? `(frais de formateurs : ${formatPrice(computedPrice.trainerFees)})`
            : ''
        }}
      </div>
    </div>
    <ni-input in-modal caption="Quantité" :error="validations.count.$error" type="number" required-field
      :model-value="courseFee.count" @blur="validations.count.$touch" @update:model-value="update($event, 'count')"
      :disable="isBilled || isSingleCourse || !!totalPriceToBill.global" :error-message="errorMessages.count" />
    </div>
    <ni-input in-modal caption="Description" type="textarea" :model-value="courseFee.description"
      @update:model-value="update($event, 'description')" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Enregistrer et fermer" icon-right="save" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs, watch } from 'vue';
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Banner from '@components/Banner';
import Input from '@components/form/Input';
import OptionGroup from '@components/form/OptionGroup';
import { multiply, divide } from '@helpers/numbers';
import { formatQuantity, formatPrice } from '@helpers/utils';
import { TRAINEE, GROUP } from '@data/constants';

export default {
  name: 'CourseFeeEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    courseFee: { type: Object, default: () => ({}) },
    errorMessages: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    title: { type: String, default: '' },
    isBilled: { type: Boolean, default: false },
    courseName: { type: String, default: '' },
    companiesName: { type: String, default: '' },
    showCountUnit: { type: Boolean, default: false },
    traineesQuantity: { type: Number, default: 1 },
    isSingleCourse: { type: Boolean, default: false },
    totalPriceToBill: { type: Object, default: () => ({ global: 0, trainerFees: 0 }) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-input': Input,
    'ni-banner': Banner,
    'ni-option-group': OptionGroup,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:course-fee'],
  setup (props, { emit }) {
    const { courseFee, traineesQuantity, showCountUnit, isSingleCourse, totalPriceToBill } = toRefs(props);

    const priceCaption = computed(() => {
      if (!(showCountUnit.value || isSingleCourse.value) || courseFee.value.countUnit === GROUP) {
        return 'Prix du groupe';
      }
      return 'Prix par stagiaire';
    });

    const countUnitOptions = computed(() => [
      { label: 'Groupe', value: GROUP },
      { label: `Stagiaire (${formatQuantity('inscrit', traineesQuantity.value)} à cette formation)`, value: TRAINEE },
    ]);

    const computedPrice = computed(() => {
      if (isSingleCourse.value || !totalPriceToBill.value.global) return;

      return {
        global: Number(divide(multiply(courseFee.value.percentage, totalPriceToBill.value.global), 100)),
        trainerFees: Number(
          divide(multiply(courseFee.value.percentage, totalPriceToBill.value.trainerFees), 100)
        ),
      };
    });

    const isTrainerFeesWithPercentage = computed(() => courseFee.value.percentage &&
      courseFee.value.billingItem === process.env.TRAINER_FEES_BILLING_ITEM);

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = async (event, path) => {
      await emit('update:course-fee', set({ ...courseFee.value }, path, event));
      if (event === TRAINEE) {
        emit('update:course-fee', set({ ...courseFee.value }, 'count', traineesQuantity.value));
      } else if (event === GROUP) emit('update:course-fee', set({ ...courseFee.value }, 'count', 1));
    };

    watch(computedPrice, () => {
      if (computedPrice.value) {
        const newPrice = divide(computedPrice.value.global, courseFee.value.count);
        if (courseFee.value.price !== newPrice) {
          emit('update:course-fee', set({ ...courseFee.value }, 'price', newPrice));
        }
      }
    });

    return {
      // Computed
      countUnitOptions,
      priceCaption,
      computedPrice,
      isTrainerFeesWithPercentage,
      // Methods
      hide,
      input,
      submit,
      update,
      formatPrice,
    };
  },
};
</script>

<style lang="sass" scoped>
.percentage
  width: 25%
</style>
