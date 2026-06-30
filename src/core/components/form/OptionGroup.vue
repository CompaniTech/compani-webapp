<template>
  <div :class="['row', 'margin-input', { last: last }]">
    <div class="col-12">
      <div v-if="displayCaption" class="row justify-between">
        <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
        <q-icon v-if="error" name="error_outline" color="secondary" />
      </div>
      <q-field dense borderless :error="error" :error-message="errorMessage" class="col-12">
        <q-option-group :model-value="groupValue" :options="computedOptions" :readonly="readOnly" :type="type"
          :inline="inline" :disable="disable" @update:model-value="update" dense class="q-px-sm">
          <template #label="opt">
            <slot name="label" v-bind="opt">
              <div class="row items-end">
                <span>{{ opt.label }}</span>
                <q-input v-if="opt.value === OTHER_VALUE" :model-value="otherText" :readonly="readOnly"
                  :disable="disable" dense @update:model-value="updateOtherAnswer"
                  @click.stop @keydown.space.stop @keyup.space.stop />
              </div>
            </slot>
          </template>
        </q-option-group>
      </q-field>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, toRefs } from 'vue';
import { REQUIRED_LABEL, CHECKBOX } from '@data/constants';

export default {
  name: 'NiOptionGroup',
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    modelValue: { type: [String, Array, Boolean], default: '' },
    last: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    requiredField: { type: Boolean, default: false },
    options: { type: Array, default: () => [] },
    type: { type: String, default: '' },
    inline: { type: Boolean, default: false },
    displayCaption: { type: Boolean, default: true },
    disable: { type: Boolean, default: false },
    allowOtherAnswer: { type: Boolean, default: false },
  },
  emits: ['update:model-value'],
  setup (props, { emit }) {
    const { type, modelValue, allowOtherAnswer, options } = toRefs(props);

    const OTHER_VALUE = 'other_value';

    const otherText = ref('');
    const otherOptionSelected = ref(false);

    const computedOptions = computed(() => [
      ...options.value,
      ...allowOtherAnswer.value ? [{ label: 'Autre :', value: OTHER_VALUE }] : [],
    ]);

    const groupValue = computed(() => {
      if (!allowOtherAnswer.value || !otherOptionSelected.value) return modelValue.value;
      if (type.value === CHECKBOX) return [...modelValue.value, OTHER_VALUE];
      return OTHER_VALUE;
    });

    const update = (value) => {
      if (type.value === CHECKBOX) {
        const hasOtherAnswer = value.includes(OTHER_VALUE);
        const optionsAnswers = value.filter(v => v !== OTHER_VALUE && v !== otherText.value);
        if (hasOtherAnswer) {
          otherOptionSelected.value = true;
          emit('update:model-value', [...optionsAnswers, otherText.value]);
        } else {
          otherOptionSelected.value = false;
          otherText.value = '';
          emit('update:model-value', optionsAnswers);
        }
      } else if (value === OTHER_VALUE) {
        otherOptionSelected.value = true;
        emit('update:model-value', otherText.value);
      } else {
        otherOptionSelected.value = false;
        otherText.value = '';
        emit('update:model-value', value);
      }
    };

    const updateOtherAnswer = (text) => {
      const prev = otherText.value;
      otherText.value = text;
      otherOptionSelected.value = true;
      if (type.value === CHECKBOX) {
        const base = modelValue.value.filter(v => v !== OTHER_VALUE && v !== '' && v !== prev);
        emit('update:model-value', [...base, text]);
      } else {
        emit('update:model-value', text);
      }
    };

    const initAnswers = () => {
      if (!allowOtherAnswer.value) return;
      const optionValues = options.value.map(o => o.value);

      if (type.value === CHECKBOX) {
        const otherAnswer = modelValue.value.find(v => !optionValues.includes(v));
        if (otherAnswer) {
          otherText.value = otherAnswer;
          otherOptionSelected.value = true;
        } else {
          otherText.value = '';
          otherOptionSelected.value = false;
        }
      } else if (modelValue.value !== '' && !optionValues.includes(modelValue.value)) {
        otherText.value = modelValue.value;
        otherOptionSelected.value = true;
      } else {
        otherText.value = '';
        otherOptionSelected.value = false;
      }
    };

    onMounted(initAnswers);

    return {
      // Data
      OTHER_VALUE,
      otherText,
      // Computed
      computedOptions,
      groupValue,
      // Methods
      updateOtherAnswer,
      update,
    };
  },
};
</script>

<style lang="sass" scoped>
.required::after
  content: ' *'
:deep(.q-option-group)
  color: $copper-grey-700 !important
  .q-radio
    padding: 10px 0 !important
    .q-radio__label
      font-size: 15px
  .q-checkbox
    padding: 10px 0 !important
    .q-checkbox__label
      font-size: 15px
  .q-input
    .q-field__control
      min-height: auto
      height: 22px
      border-radius: 0
      @media screen and (min-width: $breakpoint-sm-min)
        min-width: 300px
    .q-field__bottom
      display: none
    .q-field__native
      padding-bottom: 20px

:deep(.q-field__control)
  min-height: 25px !important
  border: 0
</style>
