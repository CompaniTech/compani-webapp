<template>
  <div :class="{ 'col-xs-12 col-md-6': !inModal, 'margin-input full-width': inModal, last: last }">
    <div v-if="caption" class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <q-select dense borderless :model-value="model" :bg-color="bgColor" :options="selectableOptions" @filter="onFilter"
      :disable="disable" @focus="onFocus" @blur="onBlur" @update:model-value="onInput" behavior="menu" use-input
      :class="{ 'no-border': noBorder, 'borders': inModal && !noBorder , 'no-bottom': noError }" :error="error"
      :display-value="displayedValue" :hide-selected="!multiple" fill-input :input-debounce="0" :emit-value="!multiple"
      ref="selectInput" :option-disable="optionDisable" :data-cy="dataCy" :hide-dropdown-icon="!!icon"
      :error-message="errorMessage" :multiple="multiple" :use-chips="multiple" new-value-mode="add"
      @new-value="addNewValue">
      <template #append>
        <ni-button v-if="modelValue && !disable && clearable" icon="close" @click.stop="resetValue" size="sm" />
        <ni-button v-if="icon" :icon="icon" class="select-icon primary-icon"
          @click="$refs['selectInput'].showPopup()" />
      </template>
    <template #no-option>
      <slot name="no-option" />
    </template>
      <template v-if="optionSlot" #option="scope">
        <slot name="option" :scope="scope" />
      </template>
    </q-select>
  </div>
</template>

<script>
import { ref, computed, toRefs, useTemplateRef } from 'vue';
import get from 'lodash/get';
import { REQUIRED_LABEL } from '@data/constants';
import Button from '@components/Button';
import escapeRegExp from 'lodash/escapeRegExp';
import { removeDiacritics } from '@helpers/utils';

export default {
  name: 'NiSelect',
  props: {
    caption: { type: String, default: '' },
    icon: { type: String, default: null },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    options: { type: Array, default: () => [] },
    modelValue: { type: [String, Number, Object, Date], default: '' },
    requiredField: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    last: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    noError: { type: Boolean, default: false },
    bgColor: { type: String, default: 'white' },
    optionDisable: { type: String, default: 'disable' },
    dataCy: { type: String, default: '' },
    optionSlot: { type: Boolean, default: false },
    noBorder: { type: Boolean, default: false },
    blurOnSelection: { type: Boolean, default: true },
  },
  emits: ['focus', 'blur', 'update:model-value', 'add-new-value'],
  components: {
    'ni-button': Button,
  },
  setup (props, { emit }) {
    const { options, modelValue, blurOnSelection, multiple } = toRefs(props);
    const selectableOptions = ref([]);
    const selectInput = useTemplateRef('selectInput');

    const displayedValue = computed(() => (multiple.value
      ? model.value.map(opt => opt.label).join(', ')
      : get(model.value, 'label') || ''));

    const model = computed(() => (multiple.value
      ? options.value.filter(opt => modelValue.value.includes(opt.value))
      : options.value.find(opt => opt.value === modelValue.value) || null));

    const formattedOptions = computed(() => options.value.map(opt => ({
      ...opt,
      filters: [
        formatStringForFiltering(opt.label),
        ...(opt.additionalFilters
          ? opt.additionalFilters.map(additionalFilter => formatStringForFiltering(additionalFilter))
          : []
        ),
      ],
    })));

    const onFocus = () => { emit('focus'); };

    const onBlur = () => { emit('blur'); };

    const onInput = (val) => {
      const value = multiple.value ? val.map(v => v.value) : val;
      emit('update:model-value', value);

      if (blurOnSelection.value) selectInput.value.blur();
    };

    const addNewValue = (value) => {
      emit('add-new-value', value);

      selectInput.value.updateInputValue('');
    };

    const formatStringForFiltering = str => escapeRegExp(removeDiacritics(str.toLowerCase()));

    const onFilter = (val, update) => {
      update(() => {
        if (val) {
          const formattedValue = formatStringForFiltering(val);
          selectableOptions.value = formattedOptions.value
            .filter(opt => opt.filters.some(word => word.includes(formattedValue)));
        } else {
          selectableOptions.value = options.value;
        }
      });
    };

    const resetValue = ($event) => {
      onInput(multiple.value ? [] : '');
      $event.preventDefault();
    };

    return {
      // Data
      selectableOptions,
      selectInput,
      // Computed
      displayedValue,
      model,
      formattedOptions,
      // Methods
      onFocus,
      onBlur,
      onInput,
      onFilter,
      resetValue,
      addNewValue,
    };
  },
};
</script>

<style lang="sass" scoped>
.no-bottom
  padding-bottom: 0
  :deep(.q-field__bottom)
    display: none
.select-icon
  margin: 0

:deep(.q-field__inner)
  height: auto
:deep(.q-chip)
  background-color: $copper-grey-400
  padding: 0 8px
  min-height: 26px
  color: white
:deep(.q-chip__icon)
  color: white
  opacity: 1
  padding-left: 8px
</style>
