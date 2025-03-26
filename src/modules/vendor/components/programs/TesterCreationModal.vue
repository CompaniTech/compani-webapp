<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
        Ajouter une <span class="text-weight-bold">personne</span>
      </template>
      <ni-input in-modal :model-value="newTester.local.email" @update:model-value="update($event.trim(), 'local.email')"
        caption="Email" @blur="validations.local.email.$touch" :error-message="emailError(validations)"
        :error="validations.local.email.$error" required-field :last="firstStep" :disable="!firstStep" />
      <template v-if="!firstStep">
        <ni-input in-modal :model-value="newTester.identity.firstname" caption="Prénom"
          @update:model-value="update($event, 'identity.firstname')" />
        <ni-input in-modal :model-value="newTester.identity.lastname" required-field caption="Nom"
          @blur="validations.identity.lastname.$touch" :error="validations.identity.lastname.$error"
          @update:model-value="update($event, 'identity.lastname')" />
        <phone-select in-modal :contact="newTester.contact" required-field :validation="validations.contact"
          @blur="path => validations.contact[path].$touch()" :error-message="phoneNbrError(validations.contact)" last
          @update="($event, path) => update($event.trim(), `contact.${path}`)" />
      </template>
      <template #footer>
        <q-btn v-if="firstStep" no-caps class="full-width modal-btn" label="Suivant" color="primary"
          :loading="loading" icon-right="add" @click="nextStep" />
        <q-btn v-else no-caps class="full-width modal-btn" color="primary" label="Ajouter la personne"
          :loading="loading" icon-right="add" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import PhoneSelect from '@components/form/PhoneSelect';
import Input from '@components/form/Input';
import { useUser } from '@composables/user';
import set from 'lodash/set';

export default {
  name: 'TesterCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    firstStep: { type: Boolean, default: true },
    newTester: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  emits: ['hide', 'update:model-value', 'next-step', 'submit', 'update:new-tester'],
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
    'phone-select': PhoneSelect,
  },
  setup (props, { emit }) {
    const { newTester } = toRefs(props);

    const { emailError, phoneNbrError } = useUser();

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const nextStep = () => emit('next-step');

    const submit = () => emit('submit');

    const update = (event, path) => emit('update:new-tester', set({ ...newTester.value }, path, event));

    return {
      // Methods
      hide,
      input,
      nextStep,
      submit,
      update,
      emailError,
      phoneNbrError,
    };
  },
};
</script>
