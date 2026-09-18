<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Éditer une <span class="text-weight-bold">étape</span>
    </template>
    <ni-input in-modal :model-value="editedStep.name" :error="validations.name.$error" caption="Nom"
      @update:model-value="update($event.trim(), 'name')" @blur="validations.name.$touch" required-field />
    <div class="row justify-between">
      <p class="input-caption required">Durée Théorique</p>
      <q-icon v-if="validations.theoreticalDuration.$error" name="error_outline" color="secondary" />
    </div>
    <q-field class="duration-field" dense :error="validations.theoreticalDuration.$error"
      error-message="Durée non valide" borderless>
      <div class="duration-container row items-end">
        <ni-input in-modal :model-value="hours" suffix="h" class="flex-1 q-pr-sm"
          @update:model-value="updateTmp($event, 'hours')" @blur="updateTheoreticalDuration()" />
        <ni-input in-modal :model-value="minutes" suffix="min" class="flex-1 q-pl-sm"
          @update:model-value="updateTmp($event, 'minutes')" @blur="updateTheoreticalDuration()" />
      </div>
    </q-field>
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Éditer l'étape" color="primary" :loading="loading"
        icon-right="add" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { ref, toRefs, watch } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import CompaniDuration from '@helpers/dates/companiDurations';

export default {
  name: 'StepEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    editedStep: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:edited-step'],
  setup (props, { emit }) {
    const { editedStep } = toRefs(props);
    const hours = ref(0);
    const minutes = ref(0);
    const currentEditedField = ref({});

    watch(
      () => editedStep.value.theoreticalDuration,
      () => {
        if (editedStep.value.theoreticalDuration) {
          const durationObject = CompaniDuration(editedStep.value.theoreticalDuration).toHoursAndMinutesObject();
          hours.value = durationObject.hours;
          minutes.value = durationObject.minutes;
        }
      }
    );

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => emit('update:edited-step', { ...editedStep.value, [path]: event });
    const updateTheoreticalDuration = () => {
      const { path, event } = currentEditedField.value;

      if (event) {
        const parsedEvent = parseFloat(event);
        const value = path === 'hours'
          ? `PT${parsedEvent || 0}H${minutes.value}M`
          : `PT${hours.value}H${parsedEvent || 0}M`;

        const { hours: updatedHours, minutes: updatedMinutes } = CompaniDuration(value).toHoursAndMinutesObject();
        update(`PT${updatedHours}H${updatedMinutes}M`, 'theoreticalDuration');
        currentEditedField.value = {};
      }
    };
    const updateTmp = (event, path) => { currentEditedField.value = { path, event: event || '0' }; };

    return {
      // Data
      hours,
      minutes,
      // Methods
      hide,
      input,
      submit,
      update,
      updateTheoreticalDuration,
      updateTmp,
    };
  },
};
</script>

<style lang="sass" scoped>
.duration-field
  :deep(.q-field__control)
    border: none !important

.duration-container
  :deep(.q-field__control)
    border: 1px solid $copper-grey-300 !important
    border-radius: 3px !important
  :deep(.q-field--with-bottom)
    padding: 0
</style>
