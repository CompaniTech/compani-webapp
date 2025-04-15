<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Ajouter une nouvelle <span class="text-weight-bold">feuille d'émargement</span>
    </template>
    <ni-select :model-value="newAttendanceSheet.trainer" :error="validations.trainer.$error"
      @update:model-value="update($event, 'trainer')" in-modal required-field caption="Intervenant·e"
      :options="trainerOptions" @blur="validations.trainer.$touch" :disable="course.trainers.length < 2" />
    <ni-select v-if="[INTER_B2B, SINGLE].includes(course.type)" :model-value="newAttendanceSheet.trainee"
      :error="validations.trainee.$error" @update:model-value="update($event, 'trainee')" in-modal required-field
      caption="Participant·e" :options="traineeOptions" @blur="validations.trainee.$touch"
      :disable="course.type === SINGLE" />
    <ni-select v-else :model-value="newAttendanceSheet.date" @blur="validations.date.$touch"
      :error="validations.date.$error" @update:model-value="update($event, 'date')" :options="dateOptions"
      required-field in-modal caption="Date" />
    <ni-input in-modal caption="Feuille d'émargement" type="file" @blur="validations.file.$touch" last required-field
      :model-value="newAttendanceSheet.file" @update:model-value="update($event, 'file')"
      :extensions="[DOC_EXTENSIONS, IMAGE_EXTENSIONS]" :error="validations.file.$error" />
    <ni-multiple-option-group v-if="slotOptions.length" :model-value="newAttendanceSheet.slots" in-modal required-field
      :options-groups="slotOptions" :error="validations.slots.$error" type="checkbox" inline
      @update:model-value="update($event, 'slots')" :group-titles="stepsName"
      caption="Sélectionner les créneaux auxquels a été présent·e le/la participant·e" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Ajouter la feuille d'émargement" :loading="loading"
        icon-right="add" @click="submit" color="white" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, computed } from 'vue';
import groupBy from 'lodash/groupBy';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import Input from '@components/form/Input';
import Button from '@components/Button';
import MultipleOptionGroup from '@components/form/MultipleOptionGroup';
import { INTER_B2B, SINGLE, DOC_EXTENSIONS, IMAGE_EXTENSIONS, DD_MM_YYYY, HH_MM } from '@data/constants';
import { formatAndSortIdentityOptions } from '@helpers/utils';
import { ascendingSortBy } from '@helpers/dates/utils';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  name: 'AttendanceSheetAdditionModal',
  components: {
    'ni-select': Select,
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'ni-multiple-option-group': MultipleOptionGroup,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    newAttendanceSheet: { type: Object, default: () => ({}) },
    course: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    slots: { type: Array, default: () => [] },
    stepsById: { type: Object, default: () => ({}) },
  },
  emits: ['hide', 'update:model-value', 'update:new-attendance-sheet', 'submit'],
  setup (props, { emit }) {
    const { newAttendanceSheet, course, slots, stepsById } = toRefs(props);

    const traineeOptions = computed(() => formatAndSortIdentityOptions(course.value.trainees));

    const trainerOptions = computed(() => formatAndSortIdentityOptions(course.value.trainers));

    const dateOptions = computed(() => {
      const dateOptionsSet = new Set(
        course.value.slots.map(date => CompaniDate(date.startDate).startOf('day').toISO())
      );

      return [...dateOptionsSet].map(date => ({ value: date, label: CompaniDate(date).format(DD_MM_YYYY) }));
    });

    const slotsGroupedByStep = computed(() => {
      const groupedSlots = groupBy(slots.value, 'step');

      return Object.keys(stepsById.value).reduce((acc, step) => {
        if (groupedSlots[step]) acc[step] = groupedSlots[step];

        return acc;
      }, {});
    });

    const slotOptions = computed(() => (
      Object.values(slotsGroupedByStep.value)
        .map(slotGroup => slotGroup.sort(ascendingSortBy('startDate'))
          .map(s => ({
            label: `${CompaniDate(s.startDate).format(`${DD_MM_YYYY} ${HH_MM}`)}
              - ${CompaniDate(s.endDate).format(HH_MM)}`,
            value: s._id,
          })))
    ));

    const stepsName = computed(() => Object.keys(slotsGroupedByStep.value)
      .map(stepId => ({ label: stepsById.value[stepId].name })));

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = (event, prop) => emit('update:new-attendance-sheet', { ...newAttendanceSheet.value, [prop]: event });

    return {
      // Data
      INTER_B2B,
      SINGLE,
      DOC_EXTENSIONS,
      IMAGE_EXTENSIONS,
      // Computed
      traineeOptions,
      trainerOptions,
      dateOptions,
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
