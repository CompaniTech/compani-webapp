<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-lg">
    <template #title>
      Créer un <span class="text-weight-bold">parcours type</span>
    </template>
    <ni-input in-modal :model-value="studyTrack.name" caption="Nom du parcours type" required-field
      :error="validations.name.$error" :error-message="REQUIRED_LABEL" @blur="validations.name.$touch"
      @update:model-value="updateName($event.trim())" />
    <study-track-table :study-track="studyTrack" :validations="validations" :show-errors="showErrors"
      @update:study-track="updateStudyTrack" />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" color="primary" icon-right="add" :loading="loading"
        label="Créer le parcours type" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref } from 'vue';
import { REQUIRED_LABEL } from '@data/constants';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import StudyTrackTable from 'src/modules/vendor/components/programs/StudyTrackTable';

export default {
  name: 'StudyTrackCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    studyTrack: { type: Object, default: () => ({ subProgram: { steps: [] }, detailsPerStep: [], milestones: [] }) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'study-track-table': StudyTrackTable,
  },
  emits: ['hide', 'update:model-value', 'update:study-track', 'submit'],
  setup (props, { emit }) {
    const { studyTrack } = toRefs(props);
    const showErrors = ref(false);

    const hide = () => {
      showErrors.value = false;
      emit('hide');
    };
    const input = (event) => { emit('update:model-value', event); };
    const submit = () => {
      showErrors.value = true;
      emit('submit');
    };

    const updateStudyTrack = (event) => { emit('update:study-track', event); };

    const updateName = (value) => { updateStudyTrack({ ...studyTrack.value, name: value }); };

    return {
      // Data
      REQUIRED_LABEL,
      showErrors,
      // Methods
      hide,
      input,
      submit,
      updateStudyTrack,
      updateName,
    };
  },
};
</script>
