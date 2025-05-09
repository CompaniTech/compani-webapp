<template>
  <div class="row">
    <div class="country-code">
      <ni-select :in-modal="inModal" :model-value="contact.countryCode" @blur="blur('countryCode')"
        :required-field="requiredField" :disable="disable" :options="countryCodeOptions" caption="Téléphone"
        :error="validation.countryCode.$error" @update:model-value="update($event, 'countryCode')" :last="last"
        option-slot>
        <template #option="{ scope }">
          <q-item v-bind="scope.itemProps">
            <q-item-section>
              <q-item-label>{{ scope.opt.label }} - {{ scope.opt.country }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </ni-select>
    </div>
    <div class="phone">
      <ni-input :in-modal="inModal" :model-value="contact.phone" caption="&#8203;" @blur="blur('phone')"
        :error="validation.phone.$error" :error-message="errorMessage" @update:model-value="update($event, 'phone')"
        :disable="disable" />
    </div>
  </div>
</template>

<script>
import Select from '@components/form/Select';
import Input from '@components/form/Input';
import COUNTRY_CODES from '@data/countryCodes';
import { computed } from 'vue';

export default {
  name: 'PhoneSelect',
  props: {
    contact: { type: Object, default: () => ({ phone: '', countryCode: '+33' }) },
    validation: { type: Object, default: () => ({}) },
    requiredField: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    last: { type: Boolean, default: false },
    errorMessage: { type: String, default: 'Numéro de téléphone invalide' },
  },
  components: {
    'ni-select': Select,
    'ni-input': Input,
  },
  emits: ['blur', 'update'],
  setup (_, { emit }) {
    const countryCodeOptions = computed(() => COUNTRY_CODES.map(el => ({ ...el, additionalFilters: [el.country] })));

    const update = (event, path) => emit('update', event, path);

    const blur = path => emit('blur', path);

    return {
      // Computed
      countryCodeOptions,
      // Methods
      update,
      blur,
    };
  },
};
</script>

<style lang="sass" scoped>
.country-code
  width: 100px
  padding-right: 4px
.phone
  flex: 1
  white-space: nowrap
:deep(.q-field__messages)
  margin-left: -100px
</style>
