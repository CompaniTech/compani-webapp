<template>
  <div class="col-12 margin-input">
    <div v-if="caption" class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <q-field :error="error" error-message="Date(s) et heure(s) invalide(s)" borderless>
      <div class="datetime-container row justify-evenly items-center">
        <ni-date-input :model-value="modelValue.startDate" @update:model-value="update($event, 'startDate')"
          @blur="blurHandler" :disable="disable || disableStartDate" :max="max" class="date-item" />
        <ni-time-input :model-value="modelValue.startHour" @update:model-value="updateHours($event, 'startHour')"
          @blur="blurHandler" :disable="disable || disableStartHour" @lock-click="startClick" :locked="startLocked"
          class="time-item" />
        <p class="delimiter">-</p>
        <ni-time-input :model-value="modelValue.endHour" @update:model-value="updateHours($event, 'endHour')"
          :disable="disable || disableEndHour" :min="min" @lock-click="endClick" :locked="endLocked" class="time-item"
          @blur="blurHandler" />
        <ni-date-input :model-value="modelValue.endDate" @update:model-value="update($event, 'endDate')"
          @blur="blurHandler" :min="modelValue.startDate" :disable="disable || disableEndDate" :max="max"
          class="date-item" />
      </div>
    </q-field>
  </div>
</template>

<script>
import { toRefs, computed, watch } from 'vue';
import DateInput from '@components/form/DateInput';
import TimeInput from '@components/form/TimeInput';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  components: {
    'ni-date-input': DateInput,
    'ni-time-input': TimeInput,
  },
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    modelValue: { type: Object, default: () => ({}) },
    requiredField: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    disableStartDate: { type: Boolean, default: false },
    disableEndDate: { type: Boolean, default: false },
    disableEndHour: { type: Boolean, default: false },
    disableStartHour: { type: Boolean, default: false },
    max: { type: String, default: '' },
    startLocked: { type: Boolean, default: false },
    endLocked: { type: Boolean, default: false },
    shiftedDuration: { type: String, default: 'PT3H30M' },
  },
  emits: ['blur', 'update:model-value', 'start-lock-click', 'end-lock-click'],
  setup (props, { emit }) {
    const { modelValue, disableEndDate, disableEndHour, shiftedDuration } = toRefs(props);

    const min = computed(() => {
      if (CompaniDate(modelValue.value.startDate).isSame(modelValue.value.endDate, 'day')) {
        return modelValue.value.startHour;
      }

      return null;
    });

    const blurHandler = () => { emit('blur'); };

    const update = (date, key) => {
      const dates = { ...modelValue.value, [key]: CompaniDate(date).toISO() };
      if (key === 'startDate' && disableEndDate.value) dates.endDate = CompaniDate(date).toISO();
      if (key === 'endDate') dates.endDate = CompaniDate(dates.endDate).endOf('day').toISO();

      emit('update:model-value', dates);
    };

    const updateHours = (value, key) => {
      const dates = { ...modelValue.value, [key]: value };
      try {
        if (key === 'startHour') {
          const startHourDate = CompaniDate(dates.startHour, 'HH:mm');
          const endHourDate = CompaniDate(dates.endHour, 'HH:mm');

          if (!disableEndHour.value && startHourDate.isSameOrAfter(endHourDate)) {
            const max = CompaniDate().endOf('day');
            const shiftedEndDate = startHourDate.add(shiftedDuration.value);
            dates.endHour = shiftedEndDate.isSameOrBefore(max) ? shiftedEndDate.format('HH:mm') : max.format('HH:mm');
          }

          dates.startDate = CompaniDate(dates.startDate).set({ second: 0, millisecond: 0 }).toISO();
        }
      } catch (e) {
        if (e.message.startsWith('Invalid DateTime: unparsable') ||
          e.message.startsWith('Invalid DateTime: unit out of range')) return '';
        console.error(e);
      } finally {
        emit('update:model-value', dates);
      }
    };

    const startClick = () => { emit('start-lock-click'); };

    const endClick = () => { emit('end-lock-click'); };

    watch(() => modelValue.value.endHour, (endHour) => {
      if (disableEndHour.value) return;

      const { endDate } = modelValue.value;

      emit('update:model-value', {
        ...modelValue.value,
        endDate: CompaniDate(endDate)
          .set(endHour === '23:59' ? { second: 59, millisecond: 999 } : { second: 0, millisecond: 0 })
          .toISO(),
      });
    }, { immediate: true });

    watch(() => modelValue.value.endDate, (endDate) => {
      const { endHour } = modelValue.value;

      emit('update:model-value', {
        ...modelValue.value,
        endDate: CompaniDate(endDate)
          .set(endHour === '23:59' ? { second: 59, millisecond: 999 } : { second: 0, millisecond: 0 })
          .toISO(),
      });
    });

    return {
      // Computed
      min,
      // Methods
      blurHandler,
      update,
      updateHours,
      startClick,
      endClick,
    };
  },
};
</script>

<style lang="sass" scoped>
.datetime-container
  width: 100%
  border: 1px solid $copper-grey-300
  border-radius: 3px
  @media screen and (min-width: 768px)
    flex-wrap: nowrap

:deep(.q-field__control)
  min-height: 40px
  border: none !important
  .q-field__marginal.q-anchor--skip
    display: none

.date-item
  @media screen and (min-width: 768px)
    width: 26%
  @media screen and (max-width: 767px)
    width: 60%
  :deep(.q-field--with-bottom)
    padding: 0
  :deep(.q-field__control)
    min-height: 35px
  :deep(.q-field__native)
    min-height: auto
  :deep(.q-field__inner)
    .q-field__bottom
      display: none

.time-item
  @media screen and (min-width: 768px)
    width: 18%
  @media screen and (max-width: 767px)
    width: 40%
  :deep(.q-field--with-bottom)
    padding: 0
  :deep(.q-field__inner)
    .q-field__bottom
      display: none
  :deep(.q-field__control)
    min-height: 35px
  :deep(.q-field__native)
    min-height: auto

.delimiter
  margin: 0
  color: $copper-grey-700
  @media screen and (max-width: 767px)
    display: none
</style>
