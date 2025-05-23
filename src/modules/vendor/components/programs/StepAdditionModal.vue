<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
        Ajouter une nouvelle <span class="text-weight-bold">étape</span>
      </template>
      <ni-btn-toggle :model-value="additionType" :options="STEP_ATTACHEMENT_OPTIONS"
        @update:model-value="updateAdditionType($event)" />
      <template v-if="additionType === CREATE_STEP">
        <ni-option-group inline caption="Type" :model-value="newStep.type" type="radio" :options="STEP_TYPES"
          required-field @update:model-value="updateNewStep($event, 'type')" />
        <ni-input in-modal :model-value="newStep.name" :error="validations.newStep.name.$error" required-field
          @update:model-value="updateNewStep($event.trim(), 'name')" @blur="validations.newStep.name.$touch"
          caption="Nom" />
      </template>
      <template v-else-if="additionType === REUSE_STEP">
        <ni-select in-modal :model-value="reusedStep.program" caption="Programme" required-field
          inline @update:model-value="updateProgram($event)" :error="validations.reusedStep.program.$error"
          :options="programOptions" />
        <ni-multiple-option-group required-field caption="Étapes" :model-value="reusedStep._ids"
          @update:model-value="updateReusedStep($event)" :error="validations.reusedStep._ids.$error"
          :options-groups="stepOptions" :group-titles="stepGroups" type="checkbox" />
      </template>
      <template #footer>
        <q-btn no-caps class="full-width modal-btn" :label="submitLabel" color="primary" :loading="loading"
          icon-right="add" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import get from 'lodash/get';
import { ref, computed, toRefs, watch } from 'vue';
import groupBy from 'lodash/groupBy';
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import ButtonToggle from '@components/ButtonToggle';
import OptionGroup from '@components/form/OptionGroup';
import MultipleOptionGroup from '@components/form/MultipleOptionGroup';
import Select from '@components/form/Select';
import { NotifyNegative } from '@components/popup/notify';
import { STEP_TYPES, STEP_ATTACHEMENT_OPTIONS, CREATE_STEP, REUSE_STEP } from '@data/constants';
import Programs from '@api/Programs';
import Steps from '@api/Steps';
import { getStepTypeLabel, getStepTypeIcon } from '@helpers/courses';
import { formatAndSortOptions } from '@helpers/utils';

export default {
  name: 'StepAdditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newStep: { type: Object, default: () => ({}) },
    reusedStep: { type: Object, default: () => ({}) },
    program: { type: Object, default: () => ({}) },
    subProgramId: { type: String, default: () => '' },
    additionType: { type: String, default: CREATE_STEP },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
    'ni-option-group': OptionGroup,
    'ni-multiple-option-group': MultipleOptionGroup,
    'ni-btn-toggle': ButtonToggle,
    'ni-select': Select,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-step', 'update:reused-step', 'update:addition-type'],
  setup (props, { emit }) {
    const { additionType, reusedStep, program, subProgramId, newStep } = toRefs(props);

    const stepOptions = ref([]);
    const programOptions = ref([]);
    const stepGroups = ref([]);

    const submitLabel = computed(() => (additionType.value === CREATE_STEP ? 'Créer l\'étape' : 'Réutiliser l\'étape'));

    watch(additionType, () => {
      if (additionType.value === REUSE_STEP) {
        if (!reusedStep.value.program) updateProgram(program.value._id);
        if (!programOptions.value.length) refreshPrograms();
        if (!stepOptions.value.length) refreshSteps();
      }
    });

    const refreshPrograms = async () => {
      try {
        const programs = await Programs.list();

        programOptions.value = formatAndSortOptions(programs, 'name');
      } catch (e) {
        programOptions.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des programmes.');
      }
    };

    const formatAndSortStepOptions = (array) => {
      const stepsInSubProgram = program.value.subPrograms
        .find(subProgram => subProgram._id === subProgramId.value)
        .steps.map(step => step._id);

      return array
        .map(element => ({
          label: stepsInSubProgram.includes(element._id)
            ? `${get(element, 'name')} (déjà utilisée)`
            : get(element, 'name'),
          value: element._id,
          disable: stepsInSubProgram.includes(element._id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    };

    const refreshSteps = async () => {
      try {
        if (!reusedStep.value.program) {
          stepOptions.value = [];
          stepGroups.value = [];
          return;
        }
        const steps = await Steps.list({ program: reusedStep.value.program });
        const stepsGroupedByType = groupBy(steps, 'type');
        stepOptions.value = Object.keys(stepsGroupedByType)
          .map(group => formatAndSortStepOptions(stepsGroupedByType[group]));
        stepGroups.value = Object.keys(stepsGroupedByType)
          .map(group => ({ label: getStepTypeLabel(group), icon: getStepTypeIcon(group) }));
      } catch (e) {
        stepOptions.value = [];
        stepGroups.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des étapes de ce programme.');
      }
    };

    const hide = () => {
      emit('hide');
      stepOptions.value = [];
      stepGroups.value = [];
    };

    const input = (event) => { emit('update:model-value', event); };

    const submit = () => { emit('submit'); };

    const updateNewStep = (event, prop) => { emit('update:new-step', set(newStep.value, prop, event)); };

    const updateProgram = async (event) => {
      await emit('update:reused-step', { _ids: [], program: event });
      await refreshSteps();
    };
    const updateReusedStep = (value) => { emit('update:reused-step', set(reusedStep.value, '_ids', value)); };

    const updateAdditionType = (value) => { emit('update:addition-type', value); };

    return {
      // Data
      STEP_TYPES,
      STEP_ATTACHEMENT_OPTIONS,
      CREATE_STEP,
      REUSE_STEP,
      stepOptions,
      programOptions,
      stepGroups,
      // Computed
      submitLabel,
      // Methods
      hide,
      input,
      submit,
      updateNewStep,
      updateProgram,
      updateReusedStep,
      updateAdditionType,
    };
  },
};
</script>

<style lang="sass" scoped>
:deep(.q-option-group)
  display: flex
  flex-direction: column
</style>
