<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" @show="show">
    <template #title>
      Ajouter une <span class="text-weight-bold">personne</span>
    </template>
    <ni-input :disable="!firstStep" in-modal :model-value="newCoach.local.email" :error="validations.local.email.$error"
      caption="Email" @blur="validations.local.email.$touch" :error-message="emailError" required-field
      @update:model-value="update($event.trim(), 'local.email')" />
    <ni-select :disable="!firstStep" in-modal caption="Role" :options="roleOptions" :model-value="newCoach.role"
      :error="validations.role.$error" @blur="validations.role.$touch" @update:model-value="update($event, 'role')"
      required-field />
    <template v-if="!firstStep">
      <ni-input :model-value="newCoach.identity.firstname" @update:model-value="update($event, 'identity.firstname')"
        in-modal caption="Prénom" />
      <ni-input in-modal :model-value="newCoach.identity.lastname" :error="validations.identity.lastname.$error"
        @blur="validations.identity.lastname.$touch" @update:model-value="update($event, 'identity.lastname')"
        required-field caption="Nom" />
      <phone-select in-modal :contact="newCoach.contact" :validation="validations.contact"
        @blur="validations.contact.phone.$touch" :error-message="phoneNbrError"
        @update="($event, path) => update($event.trim(), `contact[${path}]`)" />
    </template>
    <q-checkbox dense label="Envoyer un email à la création du compte" :model-value="newCoach.sendEmail"
      @update:model-value="update($event, 'sendEmail')" class="margin-input last" />
    <template #footer>
      <ni-button v-if="firstStep" class="bg-primary full-width modal-btn" label="Suivant" icon-right="add" color="white"
        :loading="loading" @click="goToNextStep" />
      <ni-button v-else class="bg-primary full-width modal-btn" label="Ajouter la personne" icon-right="add"
        color="white" :loading="loading" @click="submit" />
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
  name: 'CoachCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newCoach: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    roleOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    firstStep: { type: Boolean, default: false },
    emailError: { type: String, default: '' },
    phoneNbrError: { type: String, default: '' },
  },
  components: {
    'ni-input': Input,
    'ni-select': Select,
    'phone-select': PhoneSelect,
    'ni-modal': Modal,
    'ni-button': Button,
  },
  emits: ['hide', 'show', 'submit', 'update:model-value', 'go-to-next-step', 'update:new-coach'],
  setup (props, { emit }) {
    const { newCoach } = toRefs(props);

    const hide = () => emit('hide');

    const show = () => emit('show');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const goToNextStep = () => emit('go-to-next-step');

    const update = (event, path) => emit('update:new-coach', set({ ...newCoach.value }, path, event));

    return {
      // Methods
      hide,
      show,
      input,
      submit,
      goToNextStep,
      update,
    };
  },
};
</script>
