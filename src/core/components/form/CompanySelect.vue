<template>
  <ni-select :in-modal="inModal" :model-value="company" @blur="validation.$touch" :required-field="requiredField"
    :disable="disable" :caption="caption" :options="companyOptions" :error="validation.$error"
    @update:model-value="update" option-slot :clearable="clearable" :last="last" :multiple="multiple">
    <template #option="{ scope }">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label>{{ scope.opt.label }}</q-item-label>
          <q-item-label class="details">
            <span class="q-mb-xs">{{ scope.opt.holding }}</span>
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
    <template #no-option>
      <ni-button v-if="displayNoOptionsSlot" color="primary" icon="add" label="Créer une nouvelle structure"
        @click="openCompanyCreationModal" />
    </template>
  </ni-select>
</template>

<script>
import Select from '@components/form/Select';
import Button from '@components/Button';

export default {
  name: 'CompanySelect',
  props: {
    company: { type: [String, Object], default: () => '' },
    companyOptions: { type: Array, default: () => [] },
    validation: { type: Object, default: () => ({}) },
    requiredField: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    caption: { type: String, default: 'Structure' },
    displayNoOptionsSlot: { type: Boolean, default: false },
    last: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
  },
  components: {
    'ni-select': Select,
    'ni-button': Button,
  },
  emits: ['update', 'open-company-creation-modal'],
  setup (_, { emit }) {
    const update = event => emit('update', event);
    const openCompanyCreationModal = () => emit('open-company-creation-modal');

    return {
      // Methods
      update,
      openCompanyCreationModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.details
  font-size: 14px
  color: $copper-grey-500
</style>
