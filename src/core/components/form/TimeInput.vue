<template>
  <div :class="{ 'col-xs-12 col-md-6': !inModal, 'margin-input full-width': inModal }"
    class="input">
    <div class="row justify-between" v-if="caption">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <q-input dense bg-color="white" borderless :model-value="displayValue" @update:model-value="input"
      :error-message="errorMessage" :error="error" @blur="onBlur" :rules="['time']" data-cy="time-input"
      :disable="disable && !locked" :class="{ borders: inModal }" :readonly="locked" debounce="500">
      <template #append>
        <q-icon v-if="!locked" name="far fa-clock" class="cursor-pointer" color="copper-grey-500">
          <q-menu ref="qTimeMenu" anchor="bottom right" self="top right" @show="scrollOnOpening">
            <q-list ref="qListRef" dense padding>
              <q-item v-for="(hour, index) in hoursOptions" :key="index" clickable @click="select(hour.value)"
                :disable="hour.disable" :data-time="hour.value">
                <q-item-section>{{ hour.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-icon>
        <q-icon v-else name="lock" class="cursor-pointer" @click="click" color="copper-500" />
      </template>
    </q-input>
  </div>
</template>

<script>
import { computed, ref, toRefs, nextTick, useTemplateRef } from 'vue';
import { PLANNING_VIEW_START_HOUR, PLANNING_VIEW_END_HOUR, HH_MM } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniInterval from '@helpers/dates/companiIntervals';

export default {
  name: 'NiTimeInput',
  emits: ['update:model-value', 'blur', 'lock-click'],
  props: {
    modelValue: { type: String, default: '' },
    min: { type: String, default: '' },
    inModal: { type: Boolean, default: false },
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
    disable: { type: Boolean, default: false },
    requiredField: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
  },
  setup (props, { emit }) {
    const { min, modelValue } = toRefs(props);
    const qTimeMenu = useTemplateRef('qTimeMenu');
    const qListRef = ref(null);

    const hoursOptions = computed(() => {
      const startISO = CompaniDate()
        .set({ hour: PLANNING_VIEW_START_HOUR, minute: 0, second: 0, millisecond: 0 })
        .toISO();
      const endISO = CompaniDate().set({ hour: PLANNING_VIEW_END_HOUR, minute: 30, second: 0, millisecond: 0 }).toISO();
      const interval = CompaniInterval(startISO, endISO);

      return interval
        .rangeBy('PT30M')
        .map(dateISO => ({
          label: CompaniDate(dateISO).format(HH_MM),
          value: CompaniDate(dateISO).format(HH_MM),
          disable: !!min.value && CompaniDate(min.value, HH_MM).isSameOrAfter(dateISO),
        }));
    });

    const displayValue = computed(() => {
      if (!modelValue.value) return '';
      return CompaniDate(modelValue.value).format(HH_MM);
    });

    const select = (value) => {
      update(value);
      qTimeMenu.value.hide();
    };

    const update = (value) => {
      emit('update:model-value', value);
    };

    const input = (value) => {
      try {
        if (!value) return '';
        const date = CompaniDate(value, HH_MM);
        update(date.format(HH_MM));
      } catch (e) {
        if (e.message.startsWith('Invalid DateTime: unparsable') ||
          e.message.startsWith('Invalid DateTime: unit out of range')) return '';
        console.error(e);
      }
    };

    const onBlur = () => {
      emit('blur');
    };

    const click = () => {
      emit('lock-click');
    };

    const scrollOnOpening = async () => {
      await nextTick();
      const refHtml = qListRef.value?.$el;
      if (!refHtml) return;

      const item = refHtml.querySelector(`[data-time="${displayValue.value}"]`);
      if (item) item.scrollIntoView({ block: 'start' });
    };

    return {
      // Data
      qListRef,
      qTimeMenu,
      // computed
      hoursOptions,
      displayValue,
      // Methods
      select,
      update,
      input,
      onBlur,
      click,
      scrollOnOpening,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-list
  width: 100px

:deep(.q-field__native, .q-field__prefix, .q-field__suffix, .q-field__input)
  color: $copper-grey-900
</style>
