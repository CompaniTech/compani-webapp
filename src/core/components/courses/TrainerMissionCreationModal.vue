<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      {{ titleLabel }} <span class="text-weight-bold">un ordre de mission</span>
    </template>
    <ni-btn-toggle :model-value="creationMethod" :options="CREATION_METHOD_OPTIONS"
      @update:model-value="updateMethod($event)" />
    <ni-select in-modal :model-value="trainerMission.program" caption="Programme" :options="programOptions"
      required-field @update:model-value="update($event, 'program')" />
    <div v-if="trainerMission.program">
      <ni-option-group in-modal :model-value="trainerMission.courses" :options="coursesOptions"
        type="checkbox" @update:model-value="update($event, 'courses')" :error="validations.courses.$error"
        caption="Formations" required-field />
      <ni-input in-modal caption="Frais de formateur" :error="validations.fee.$error" type="number" suffix="€"
        :model-value="trainerMission.fee" @blur="validations.fee.$touch" required-field
        @update:model-value="update($event, 'fee')" error-message="La valeur doit être supérieure ou égale à 0" />
      <ni-input v-if="creationMethod === UPLOAD" in-modal caption="Ordre de mission" type="file"
        @blur="validations.file.$touch" last required-field :model-value="trainerMission.file"
        @update:model-value="update($event, 'file')" :extensions="[DOC_EXTENSIONS, IMAGE_EXTENSIONS]"
        :error="validations.file.$error" />
    </div>
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" :label="submitLabel" icon-right="add"
        color="white" @click="submit" :loading="loading" :disable="!trainerMission.program" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs, nextTick } from 'vue';
import set from 'lodash/set';
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import OptionGroup from '@components/form/OptionGroup';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
import ButtonToggle from '@components/ButtonToggle';
import {
  DOC_EXTENSIONS,
  IMAGE_EXTENSIONS,
  INTER_B2B,
  INTRA,
  SINGLE,
  INTRA_HOLDING,
  UPLOAD,
  CREATION_METHOD_OPTIONS,
  GENERATION,
} from '@data/constants';

export default {
  name: 'TrainerMissionCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    trainerMission: { type: Object, default: () => ({}) },
    creationMethod: { type: String, default: UPLOAD },
    courses: { type: Array, default: () => [] },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-input': Input,
    'ni-select': Select,
    'ni-option-group': OptionGroup,
    'ni-btn-toggle': ButtonToggle,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:trainer-mission', 'update:creation-method'],
  setup (props, { emit }) {
    const { trainerMission, courses, creationMethod } = toRefs(props);

    const titleLabel = computed(() => (creationMethod.value === UPLOAD ? 'Téléverser' : 'Générer'));

    const submitLabel = computed(() => (creationMethod.value === UPLOAD ? 'Téléverser le document' : 'Étape suivante'));

    const coursesGroupedByProgram = computed(() => groupBy(courses.value, 'subProgram.program._id'));

    const programOptions = computed(() => uniqBy(courses.value.map(c => c.subProgram.program), '_id')
      .map(p => ({ label: p.name, value: p._id })));

    const formatCourseLabel = (course) => {
      let info = '';
      switch (course.type) {
        case INTRA:
        case SINGLE:
          info = course.companies[0].name;
          break;
        case INTER_B2B:
          info = 'INTER';
          break;
        case INTRA_HOLDING:
          info = course.holding.name;
          break;
        default:
          info = '';
      }
      return `${info}${course.misc ? ` - ${course.misc}` : ''}`;
    };

    const coursesOptions = computed(() => coursesGroupedByProgram.value[trainerMission.value.program]
      .map(c => ({ value: c._id, label: formatCourseLabel(c) })));

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = async (event, path) => {
      if (path === 'program') {
        const tempCreationMethod = creationMethod.value;
        hide();
        await nextTick();
        updateMethod(tempCreationMethod);
      }
      emit('update:trainer-mission', set({ ...trainerMission.value }, path, event));
    };

    const updateMethod = async (value) => {
      emit('update:creation-method', value);
      if (value === GENERATION) emit('update:trainer-mission', set({ ...trainerMission.value }, 'file', ''));
    };

    return {
      // Data
      DOC_EXTENSIONS,
      IMAGE_EXTENSIONS,
      CREATION_METHOD_OPTIONS,
      UPLOAD,
      // Computed
      programOptions,
      coursesGroupedByProgram,
      coursesOptions,
      titleLabel,
      submitLabel,
      // Methods
      hide,
      input,
      submit,
      update,
      updateMethod,
    };
  },
};
</script>
