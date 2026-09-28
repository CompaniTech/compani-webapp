<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Téléverser <span class="text-weight-bold">une convention de formation</span>
    </template>
    <ni-select in-modal :model-value="newTrainingContract.company"
      @update:model-value="update($event, 'company')" caption="Structure" :options="companyOptions" required-field
      :error="validations.company.$error" @blur="validations.company.$touch" />
    <ni-date-input v-if="isSingleCourse" caption="Date de début de contrat" :model-value="newTrainingContract.startDate"
      in-modal @update:model-value="update($event, 'startDate')" />
    <ni-input in-modal caption="Convention de formation" type="file" @blur="validations.file.$touch" last required-field
      :model-value="newTrainingContract.file" @update:model-value="update($event, 'file')"
      :extensions="[DOC_EXTENSIONS, IMAGE_EXTENSIONS]" :error="validations.file.$error" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Téléverser la convention" icon-right="add" color="white"
        @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
import DateInput from '@components/form/DateInput';
import { DOC_EXTENSIONS, IMAGE_EXTENSIONS } from '@data/constants';

export default {
  name: 'TrainingContractCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    isSingleCourse: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    companyOptions: { type: Array, default: () => [] },
    newTrainingContract: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-input': Input,
    'ni-select': Select,
    'ni-date-input': DateInput,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-training-contract'],
  setup (props, { emit }) {
    const { newTrainingContract } = toRefs(props);

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => {
      emit('update:new-training-contract', set({ ...newTrainingContract.value }, path, event));
    };

    return {
      // Data
      DOC_EXTENSIONS,
      IMAGE_EXTENSIONS,
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
