<template>
  <div :class="contentClass">
    <div v-if="caption" class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <q-input borderless dense :model-value="inputDate" bg-color="white" @update:model-value="input" :error="error"
      :placeholder="placeholder" :disable="disable" :class="{ 'borders': inModal }" :error-message="errorMessage"
      @blur="blur" ref="dateInput" @focus="focus">
      <template #append>
        <q-icon name="event" class="cursor-pointer" @click="openDateMenu" color="petrol-60">
          <q-menu ref="qDateMenu" anchor="bottom right" self="top right" @hide="closeDateMenu">
            <q-date minimal :model-value="date" @update:model-value="select" :options="dateOptions"
              :disable="disable" color="secondary" />
          </q-menu>
        </q-icon>
      </template>
    </q-input>
  </div>
</template>

<script>
import { REQUIRED_LABEL, DD_MM_YYYY } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  name: 'NiDateInput',
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    modelValue: { type: String, default: '' },
    min: { type: String, default: '' },
    max: { type: String, default: '' },
    disable: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    requiredField: { type: Boolean, default: false },
    contentClass: { type: String, default: '' },
    placeholder: { type: String, default: 'jj/mm/yyyy' },
  },
  emits: ['blur', 'focus', 'update:model-value'],
  data () {
    const isDateMenuOpened = false;

    return {
      quasarDateFormat: 'yyyy/LL/dd',
      isDateMenuOpened,
    };
  },
  computed: {
    date () {
      if (!this.modelValue) return '';
      return CompaniDate(this.modelValue).format(this.quasarDateFormat);
    },
    inputDate () {
      if (!this.modelValue) return '';
      return CompaniDate(this.modelValue).format(DD_MM_YYYY);
    },
  },
  methods: {
    dateOptions (date) {
      const dateValue = CompaniDate(date, this.quasarDateFormat);
      const isAfterMin = this.min ? dateValue.isSameOrAfter(this.min) : true;
      const isBeforeMax = this.max ? dateValue.isSameOrBefore(this.max) : true;

      return isAfterMin && isBeforeMax;
    },
    select (value) {
      try {
        if (value === null) return;
        const selectedDate = CompaniDate(value, this.quasarDateFormat);

        this.update(selectedDate.toISO());
        this.$refs.qDateMenu.hide();
        this.$refs.dateInput.blur();
      } catch (e) {
        console.error(e);
      } finally {
        this.isDateMenuOpened = false;
      }
    },
    input (value) {
      try {
        if (!value) return '';

        const date = CompaniDate(value, DD_MM_YYYY);
        this.update(date.toISO());
      } catch (e) {
        if (e.message.startsWith('Invalid DateTime: unparsable') ||
          e.message.startsWith('Invalid DateTime: unit out of range')) return '';
        console.error(e);
      }
    },
    update (value) {
      this.$emit('update:model-value', value);
    },
    blur () {
      if (this.isDateMenuOpened) return;

      this.$emit('blur');
    },
    focus () {
      this.$emit('focus');
    },
    openDateMenu () {
      this.focus();
      this.isDateMenuOpened = true;
    },
    closeDateMenu () {
      this.isDateMenuOpened = false;
    },
  },
};
</script>

<style lang="sass" scoped>
.q-input
  :deep(.q-field__control)
    font-size: 16px
    padding-left: 14px
    padding-right: 14px
    border-radius: 3px

:deep(.q-field__native, .q-field__prefix, .q-field__suffix, .q-field__input)
  color: $petrol
</style>
