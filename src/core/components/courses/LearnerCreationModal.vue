<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
        <div v-if="!learnerEdition">Ajouter une <span class="text-weight-bold">personne</span></div>
        <div v-else>Compte apprenant</div>
      </template>
      <ni-input in-modal :model-value="newUser.local.email" @update:model-value="update($event.trim(), 'local.email')"
        @blur="validations.local.email.$touch" caption="Email" :error-message="emailError(validations)"
        :error="validations.local.email.$error" required-field :last="firstStep" :disable="!firstStep" />
      <template v-if="!firstStep">
        <ni-input in-modal caption="Prénom" :model-value="newUser.identity.firstname"
          @update:model-value="update($event, 'identity.firstname')" :disable="disableUserInfo" />
        <ni-input in-modal :model-value="newUser.identity.lastname" :error="validations.identity.lastname.$error"
          required-field @blur="validations.identity.lastname.$touch" caption="Nom"
          @update:model-value="update($event, 'identity.lastname')" :disable="disableUserInfo" />
        <phone-select in-modal :contact="newUser.contact" :required-field="!disableUserInfo"
          @blur="path => validations.contact[path].$touch()" :validation="validations.contact"
          :disable="disableUserInfo" :error-message="phoneNbrError(validations.contact)"
          @update="($event, path) => update($event.trim(), `contact.${path}`)" />
        <company-select in-modal :company-options="companyOptions" :company="newUser.company"
          @update="update($event.trim(), 'company')" required-field :validation="validations.company"
          :disable="disableCompany" />
        <ni-date-input caption="Date de rattachement" :model-value="newUser.userCompanyStartDate" in-modal last
          @update:model-value="update($event, 'userCompanyStartDate')" required
          :error="validations.userCompanyStartDate.$error" />
      </template>
      <template #footer>
        <ni-button v-if="firstStep" class="bg-primary full-width modal-btn" label="Suivant" color="white"
          :loading="loading" icon-right="add" @click="nextStep" />
        <ni-button v-else class="bg-primary full-width modal-btn" color="white" :label="secondStepFooterLabel"
          :loading="loading" icon-right="add" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import CompanySelect from '@components/form/CompanySelect';
import PhoneSelect from '@components/form/PhoneSelect';
import Input from '@components/form/Input';
import DateInput from '@components/form/DateInput';
import Button from '@components/Button';
import { useUser } from '@composables/user';
import set from 'lodash/set';

export default {
  name: 'LearnerCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    firstStep: { type: Boolean, default: true },
    disableCompany: { type: Boolean, default: false },
    disableUserInfo: { type: Boolean, default: false },
    newUser: { type: Object, default: () => ({}) },
    companyOptions: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    learnerEdition: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
    'company-select': CompanySelect,
    'phone-select': PhoneSelect,
    'ni-button': Button,
    'ni-date-input': DateInput,
  },
  emits: ['hide', 'update:model-value', 'submit', 'next-step', 'update:new-user'],
  setup (props, { emit }) {
    const { newUser, learnerEdition } = toRefs(props);
    const secondStepFooterLabel = computed(() => (learnerEdition.value ? 'Suivant' : 'Ajouter la personne'));

    const { emailError, phoneNbrError } = useUser();

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const nextStep = () => emit('next-step');

    const submit = () => emit('submit');

    const update = (event, path) => emit('update:new-user', set({ ...newUser.value }, path, event));

    return {
      // Computed
      secondStepFooterLabel,
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
