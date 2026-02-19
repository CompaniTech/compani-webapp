<template>
  <div :class="{ 'col-12 col-md-6': !inModal, 'col-12': inModal }">
    <div class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
      <q-select dense borderless :model-value="modelValue.fullAddress" @update:model-value="update" use-input fill-input
        input-debounce="500" :options="options" :class="{ 'borders': inModal }" :disable="disable" behavior="menu"
        @filter="searchAddress" @blur="blurEvent" @focus="focusEvent" :bg-color="color" :error="error" hide-selected
        :error-message="errorMessage">
        <template v-if="modelValue.fullAddress && !disable" #append>
          <ni-button icon="close" @click.stop="resetValue" size="sm" />
        </template>
      </q-select>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';
import pick from 'lodash/pick';
import { REQUIRED_LABEL } from '@data/constants';
import Button from '@components/Button';

export default {
  name: 'SearchAddress',
  props: {
    modelValue: { type: Object, default: () => ({ street: '', zipCode: '', city: '', fullAddress: '' }) },
    caption: { type: String, default: 'Adresse' },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    error: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    requiredField: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    color: { type: String, default: 'white' },
  },
  emits: ['blur', 'focus', 'update:model-value'],
  components: {
    'ni-button': Button,
  },
  setup (_, { emit }) {
    const options = ref([]);

    const searchAddress = async (terms, done) => {
      try {
        if (!terms) return;

        const res = await axios.get('https://data.geopf.fr/geocodage/search', { params: { q: terms } });
        options.value = res.data.features.sort((a, b) => b.properties.score - a.properties.score).map(result => ({
          label: result.properties.label,
          fullAddress: result.properties.label,
          value: result.properties.label,
          street: result.properties.name,
          zipCode: result.properties.postcode,
          city: result.properties.city,
          location: result.geometry,
        }));
        done(options.value);
      } catch (e) {
        console.error(e);
        done([]);
      }
    };

    const blurEvent = () => { emit('blur'); };
    const focusEvent = () => { emit('focus'); };
    const update = (value) => {
      emit('update:model-value', pick(value, ['fullAddress', 'street', 'city', 'zipCode', 'location']));
    };
    const resetValue = () => {
      emit('update:model-value', { street: '', zipCode: '', city: '', location: {}, fullAddress: '' });
    };

    return {
      options,
      searchAddress,
      blurEvent,
      focusEvent,
      update,
      resetValue,
    };
  },
};
</script>

<style lang="sass" scoped>
:deep(.q-select)
  width: 100%
  .q-select__dropdown-icon
    display: none
  .q-spinner
    display: none

:deep(.q-field__native), :deep(.q-field__prefix), :deep(.q-field__suffix), :deep(.q-field__input)
  color: $copper-grey-900
</style>
