<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Éditer une <span class="text-weight-bold">personne</span>
    </template>
    <ni-input in-modal :model-value="selectedCoach.local.email" :error="validations.local.email.$error" caption="Email"
      :error-message="emailError" @update:model-value="update($event, 'local.email')" required-field
      @blur="validations.local.email.$touch" />
    <ni-select caption="Role" :options="roleOptions" :model-value="selectedCoach.role" @blur="validations.role.$touch"
      :error="validations.role.$error" required-field @update:model-value="update($event, 'role')" in-modal />
    <ni-input in-modal :model-value="selectedCoach.identity.firstname" caption="Prénom"
      @update:model-value="update($event, 'identity.firstname')" />
    <ni-input :model-value="selectedCoach.identity.lastname" :error="validations.identity.lastname.$error" caption="Nom"
      @blur="validations.identity.lastname.$touch" @update:model-value="update($event, 'identity.lastname')"
      in-modal required-field />
    <phone-select in-modal :contact="selectedCoach.contact" :validation="validations.contact" last
      @blur="path => validations.contact[path].$touch()" :error-message="phoneNbrError"
      @update="($event, path) => update($event.trim(), `contact.${path}`)" />
    <template #footer>
      <ni-button class="bg-primary full-width modal-btn" label="Éditer la personne" icon-right="check" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import PhoneSelect from '@components/form/PhoneSelect';
import Select from '@components/form/Select';
import Button from '@components/Button';
import Input from '@components/form/Input';

export default {
  name: 'CoachEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    selectedCoach: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    roleOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    emailError: { type: String, default: '' },
    phoneNbrError: { type: String, default: '' },
  },
  components: {
    'ni-input': Input,
    'ni-select': Select,
    'phone-select': PhoneSelect,
    'ni-button': Button,
    'ni-modal': Modal,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:selected-coach'],
  setup (props, { emit }) {
    const { selectedCoach } = toRefs(props);

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = (event, path) => emit('update:selected-coach', set({ ...selectedCoach.value }, path, event));

    return {
      // Methods
      hide,
      input,
      submit,
      update,
    };
  },
};
</script>
