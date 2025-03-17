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
    <ni-option-group v-if="showCountUnit" in-modal :model-value="courseFee.countUnit" :options="countUnitOptions"
      type="radio" @update:model-value="update($event, 'countUnit')" :error="validations.countUnit.$error"
      caption="Unité" inline required-field :disable="isBilled" />
    <ni-input in-modal :caption="priceCaption" :error="validations.price.$error" type="number" :disable="isBilled"
      :model-value="courseFee.price" @blur="validations.price.$touch" suffix="€" required-field
      :error-message="errorMessages.price" @update:model-value="update($event, 'price')" />
    <ni-input in-modal caption="Quantité" :error="validations.count.$error" type="number" required-field
      :model-value="courseFee.count" @blur="validations.count.$touch" :disable="isBilled || isSingleCourse"
      :error-message="errorMessages.count" @update:model-value="update($event, 'count')" />
    <ni-input in-modal caption="Description" type="textarea" :model-value="courseFee.description"
      @update:model-value="update($event, 'description')" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Enregistrer et fermer" icon-right="save" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Banner from '@components/Banner';
import Input from '@components/form/Input';
import OptionGroup from '@components/form/OptionGroup';
import { formatQuantity } from '@helpers/utils';
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
    const { courseFee, traineesQuantity, showCountUnit, isSingleCourse } = toRefs(props);

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
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => {
      emit('update:course-fee', set({ ...courseFee.value }, path, event));
    };

    return {
      // Computed
      countUnitOptions,
      priceCaption,
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
