<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
        Éditer une <span class="text-weight-bold">personne</span>
      </template>
      <ni-input in-modal caption="Email" :model-value="editedTrainee.local.email" disable />
      <ni-input in-modal caption="Prénom" :model-value="editedTrainee.identity.firstname"
        @update:model-value="update($event, 'identity.firstname')" />
      <ni-input in-modal caption="Nom" :model-value="editedTrainee.identity.lastname"
        :error="validations.identity.lastname.$error" @blur="validations.identity.lastname.$touch"
        required-field @update:model-value="update($event, 'identity.lastname')" />
      <phone-select in-modal :contact="editedTrainee.contact" required-field @blur="validations.contact.phone.$touch"
        :validation="validations.contact" :error-message="phoneNbrError(validations.contact)"
        @update="($event, path) => update($event.trim(), `contact[${path}]`)" />
      <template #footer>
        <ni-button class="bg-primary full-width modal-btn" label="Éditer la personne" icon-right="add" color="white"
          :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import PhoneSelect from '@components/form/PhoneSelect';
import Button from '@components/Button';
import { useUser } from '@composables/user';
import set from 'lodash/set';

export default {
  name: 'TraineeEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    editedTrainee: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-button': Button,
    'phone-select': PhoneSelect,
    'ni-modal': Modal,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:edited-trainee'],
  setup (props, { emit }) {
    const { editedTrainee } = toRefs(props);
    const { emailError, phoneNbrError } = useUser();

    const hide = () => {
      emit('hide');
    };

    const input = (event) => {
      emit('update:model-value', event);
    };

    const submit = () => {
      emit('submit');
    };

    const update = (event, path) => {
      emit('update:edited-trainee', set({ ...editedTrainee.value }, path, event));
    };

    return {
      // Methods
      hide,
      input,
      submit,
      update,
      emailError,
      phoneNbrError,
    };
  },
};
</script>
