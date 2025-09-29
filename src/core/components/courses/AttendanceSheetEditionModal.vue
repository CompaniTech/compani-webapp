<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Modifier la <span class="text-weight-bold">feuille d'émargement</span>
    </template>
    <ni-select :model-value="editedAttendanceSheet.trainee" :options="traineeIdentity" disable />
    <ni-multiple-option-group :model-value="editedAttendanceSheet.slots" in-modal required-field
      @update:model-value="update($event, 'slots')" type="checkbox" inline :options-groups="slotOptions"
      caption="Sélectionner les créneaux auxquels a été présent·e le/la participant·e"
      :error="validations.slots.$error" :group-titles="stepsName" />
    <template #footer>
    <ni-button class="full-width modal-btn bg-primary" label="Modifier la feuille d'émargement" :loading="loading"
      icon-right="add" @click="submit" color="white" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, computed } from 'vue';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import MultipleOptionGroup from '@components/form/MultipleOptionGroup';
import Button from '@components/Button';
import { DD_MM_YYYY, HH_MM } from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import { ascendingSortBy } from '@helpers/dates/utils';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  name: 'AttendanceSheetEditionModal',
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
    'ni-multiple-option-group': MultipleOptionGroup,
    'ni-button': Button,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    editedAttendanceSheet: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    editionSlotsGroupedByStep: { type: Object, default: () => ({}) },
    stepsById: { type: Object, default: () => ({}) },
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:edited-attendance-sheet'],
  setup (props, { emit }) {
    const { editedAttendanceSheet, editionSlotsGroupedByStep, stepsById } = toRefs(props);

    const traineeIdentity = computed(() => [{
      label: formatIdentity(editedAttendanceSheet.value.trainee.identity, 'FL'),
      value: editedAttendanceSheet.value.trainee,
    }]);

    const slotOptions = computed(() => (
      Object.values(editionSlotsGroupedByStep.value)
        .map(slotGroup => slotGroup.sort(ascendingSortBy('startDate'))
          .map(s => ({
            label: `${CompaniDate(s.startDate).format(`${DD_MM_YYYY} ${HH_MM}`)}
              - ${CompaniDate(s.endDate).format(HH_MM)}`,
            value: s._id,
          })))
    ));

    const stepsName = computed(() => Object.keys(editionSlotsGroupedByStep.value)
      .map(stepId => ({ label: stepsById.value[stepId].name })));

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = (slotsValue, prop) => emit(
      'update:edited-attendance-sheet',
      { ...editedAttendanceSheet.value, [prop]: slotsValue }
    );

    return {
      // Computed
      traineeIdentity,
      slotOptions,
      stepsName,
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
