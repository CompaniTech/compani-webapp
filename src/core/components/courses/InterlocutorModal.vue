<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
        {{ label.action }}<span class="text-weight-bold">{{ label.interlocutor }}</span>
    </template>
      <ni-select in-modal :model-value="interlocutor" @update:model-value="updateInterlocutor"
        :caption="upperCaseFirstLetter(label.interlocutor)" :options="interlocutorsOptions" option-slot
        :error="validations.$error" @blur="validations.$touch" :clearable="clearable" :required-field="!clearable">
        <template #option="{ scope }">
          <q-item v-bind="scope.itemProps">
            <q-item-section avatar>
              <img class="avatar" :src="scope.opt.picture">
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ scope.opt.label }}</q-item-label>
              <q-item-label class="details">
                <div class="q-mb-xs">{{ scope.opt.email }}</div>
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
        <template #no-option>
          <ni-button v-if="displayNoOptionsSlot" color="primary" icon="add" label="Créer un nouveau compte"
            @click="openUserCreationModal" />
        </template>
      </ni-select>
      <template #footer>
        <ni-button class="bg-primary full-width modal-btn" :label="`${label.action}${label.interlocutor}`"
          icon-right="add" color="white" :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { upperCaseFirstLetter } from '@helpers/utils';

export default {
  name: 'InterlocutorModal',
  props: {
    modelValue: { type: Boolean, default: false },
    interlocutorsOptions: { type: Array, default: () => [] },
    interlocutor: { type: String, default: '' },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    label: { type: Object, default: () => ({}) },
    clearable: { type: Boolean, default: false },
    displayNoOptionsSlot: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:interlocutor', 'open-user-creation-modal'],
  setup (_, { emit }) {
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const updateInterlocutor = event => emit('update:interlocutor', event);

    const openUserCreationModal = event => emit('open-user-creation-modal', event);

    return {
      // Methods
      hide,
      input,
      submit,
      updateInterlocutor,
      upperCaseFirstLetter,
      openUserCreationModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.details
  font-size: 14px
  color: $copper-grey-500
</style>
