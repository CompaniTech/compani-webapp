<template>
  <div :class="'row margin-input'">
    <div class="col-12">
      <div class="row justify-between">
        <p :class="'input-caption required'">{{ caption }}</p>
        <q-icon v-if="error" name="error_outline" color="secondary" />
      </div>
      <div v-for="(options, index) in optionsGroups" :key="index">
        <div class="group-title">
          <q-icon v-if="groupTitles[index].icon" :name="groupTitles[index].icon" size="sm" color="petrol-60"
            class="q-mr-xs" />
          <div class="text-weight-bold">{{ groupTitles[index].label }}</div>
        </div>
        <q-field dense borderless class="col-12">
          <q-option-group :model-value="modelValue" :options="options" :type="type" inline :dense="type ==='radio'"
            @update:model-value="update" />
        </q-field>
      </div>
      <q-field :error="error" :error-message="errorMessage" dense borderless class="error-field" />
    </div>
  </div>
</template>

<script>
import { REQUIRED_LABEL } from '@data/constants';

export default {
  name: 'NiMultipleOptionGroup',
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    modelValue: { type: [String, Array, Boolean], default: '' },
    optionsGroups: { type: Array, default: () => [] },
    groupTitles: { type: Array, default: () => [] },
    type: { type: String, default: 'radio' },
  },
  emits: ['update:model-value'],
  methods: {
    update (value) {
      this.$emit('update:model-value', value);
    },
  },
};
</script>

<style lang="sass" scoped>
.error-field
  height: 0px
.group-title
  display: flex
  flex: 1
  margin: 16px 0px 2px
.required::after
  content: ' *'
:deep(.q-option-group)
  color: $navy-80 !important
  .q-radio
    padding: 10px 6px !important
    .q-radio__label
      font-size: 15px
:deep(.q-field__control)
  min-height: 25px !important
  border: 0
</style>
