<template>
  <div class="col-12 date-range">
    <div v-if="caption" class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <q-field dense borderless :error="hasError" :error-message="innerErrorMessage">
      <div :class="['date-container', 'justify-center', 'items-center', 'row', borders && 'date-container-borders']">
        <ni-date-input data-cy="date-input" :model-value="modelValue.startDate" class="date-item" @blur="blur"
          @update:model-value="update($event, 'startDate')" :disable="disable" />
        <p class="delimiter">-</p>
        <ni-date-input data-cy="date-input" :model-value="modelValue.endDate" :min="modelValue.startDate" @blur="blur"
          @update:model-value="update($event, 'endDate')" class="date-item" :disable="disable" />
      </div>
    </q-field>
  </div>
</template>

<script>
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { minDate } from '@helpers/vuelidateCustomVal';
import CompaniDate from '@helpers/dates/companiDates';
import DateInput from '@components/form/DateInput';
import { REQUIRED_LABEL } from '@data/constants';
import { NotifyWarning } from '@components/popup/notify';

export default {
  components: {
    'ni-date-input': DateInput,
  },
  props: {
    caption: { type: String, default: '' },
    modelValue: {
      type: Object,
      default () {
        return { startDate: CompaniDate().startOf('day').toISO(), endDate: CompaniDate().endOf('day').toISO() };
      },
    },
    requiredField: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    borders: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
  },
  emits: ['update:model-value', 'blur', 'update:error'],
  setup () {
    return { v$: useVuelidate() };
  },
  validations () {
    return {
      modelValue: {
        startDate: { required },
        endDate: { required, minDate: minDate(this.modelValue.startDate) },
      },
    };
  },
  computed: {
    hasError () {
      return this.error || this.v$.modelValue.$error;
    },
    innerErrorMessage () {
      if (get(this.v$.modelValue.startDate, 'required.$response') === false ||
        get(this.v$.modelValue.endDate, 'required.$response') === false) return REQUIRED_LABEL;

      if (get(this.v$.modelValue.endDate, 'minDate.$response') === false) {
        return 'La date de fin doit être postérieure à la date de début';
      }

      return this.errorMessage;
    },
  },
  watch: {
    modelValue () {
      this.$emit('update:error', this.v$.modelValue.$error);
    },
  },
  methods: {
    update (value, key) {
      this.v$.modelValue.$touch();
      if (key === 'endDate') value = CompaniDate(value).endOf('day').toISO();

      this.$emit('update:model-value', { ...this.modelValue, [key]: value });
    },
    blur () {
      if (!this.inModal) {
        this.v$.modelValue.$touch();
        if (this.v$.modelValue.$error) return NotifyWarning('Champ(s) invalide(s)');
      }

      this.$emit('blur');
    },
  },
};
</script>

<style lang="sass" scoped>
.date-range
  max-width: 100%

.date-container-borders
  border: solid 1px $navy-20
  border-radius: 3px

:deep(.q-field__append)
  .text-negative
    display: none

:deep(.q-field__bottom)
  color: $secondary
  padding-top: 3px

.date-container
  width: 100%
  border-radius: 3px
  background-color: white
  & .delimiter
    margin: 0
    color: $navy-80
  :deep(.q-field__control)
    border: none !important

.date-item
  :deep(.q-field__native)
    text-align: center
  :deep(.q-field--with-bottom)
    padding-bottom: 0px
  :deep(.q-field__bottom)
    display: none
</style>
