<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Ajouter <span class="text-weight-bold">le prix de la formation</span>
    </template>
    <ni-input in-modal :caption="isInterCourse ? 'Prix par stagiaire' : 'Prix du programme'" suffix="€" required-field
      :error="validations.price.$error" type="number" :model-value="newGeneratedTrainingContractInfos.price"
      @blur="validations.price.$touch" :error-message="errorMessage" @update:model-value="update($event, 'price')" />
    <ni-select v-if="!isIntraCourse" in-modal :model-value="newGeneratedTrainingContractInfos.company"
      @update:model-value="update($event, 'company')" caption="Structure" :options="companyOptions" required-field
      :error="validations.company.$error" @blur="validations.company.$touch" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Ajouter le prix" icon-right="add" color="white"
        @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, nextTick } from 'vue';
import get from 'lodash/get';
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
import { add, divide, toFixedToFloat } from '@helpers/numbers';

export default {
  name: 'TrainingContractGenerationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    errorMessage: { type: String, default: () => '' },
    validations: { type: Object, default: () => ({}) },
    companyOptions: { type: Array, default: () => [] },
    isIntraCourse: { type: Boolean, default: true },
    isInterCourse: { type: Boolean, default: true },
    newGeneratedTrainingContractInfos: { type: Object, default: () => ({}) },
    course: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-input': Input,
    'ni-select': Select,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-generated-training-contract-infos'],
  setup (props, { emit }) {
    const { newGeneratedTrainingContractInfos, course, isInterCourse } = toRefs(props);

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = async (event, path) => {
      emit(
        'update:new-generated-training-contract-infos',
        set({ ...newGeneratedTrainingContractInfos.value }, path, event)
      );
      await nextTick();

      if (path === 'company' && course.value.prices.length) {
        const price = course.value.prices.find(p => p.company === event);
        const traineeLength = isInterCourse.value
          ? course.value.trainees.filter(t => t.registrationCompany === event).length
          : 1;
        const computedPrice = Number(divide(add(get(price, 'global', 0), get(price, 'trainerFees', 0)), traineeLength));
        const displayedPrice = Number.isNaN(computedPrice) ? 0 : toFixedToFloat(computedPrice);
        emit(
          'update:new-generated-training-contract-infos',
          set({ ...newGeneratedTrainingContractInfos.value }, 'price', displayedPrice)
        );
      }
    };

    return {
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
