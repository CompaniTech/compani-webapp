<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
        Ajouter une <span class="text-weight-bold">personne</span>
      </template>
      <ni-select in-modal :model-value="newUserRegistration.user" @update:model-value="updateUser"
        :caption="label" :options="usersOptions" required-field option-slot :error="validations.user.$error">
        <template #option="{ scope }">
          <q-item v-bind="scope.itemProps">
            <q-item-section avatar>
              <img class="avatar" :src="scope.opt.picture">
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ scope.opt.label }}</q-item-label>
              <q-item-label class="details">
                <div class="q-mb-xs">{{ scope.opt.email }}</div>
                <div>{{ scope.opt.company }}</div>
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
        <template #no-option>
          <ni-button v-if="displayNoOptionsSlot" color="primary" icon="add" label="Créer un nouveau compte"
            @click="openUserCreationModal" />
        </template>
      </ni-select>
      <company-select v-if="displayCompanySelect" in-modal :company="newUserRegistration.company"
        @update="update($event, 'company')" :company-options="companyOptionsForUser"
        required-field :validation="validations.company" :disable="companyOptionsForUser.length < 2" />
      <q-checkbox v-if="displayIsCertified" in-modal :model-value="newUserRegistration.isCertified" class="q-mb-lg"
        label="Le stagiaire passe la certification" @update:model-value="update($event, 'isCertified')" dense />
      <template #footer>
        <ni-button class="bg-primary full-width modal-btn" label="Ajouter la personne" icon-right="add" color="white"
          :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>

import set from 'lodash/set';
import { computed, toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import CompanySelect from '@components/form/CompanySelect';
import Button from '@components/Button';

export default {
  name: 'UserAdditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    usersOptions: { type: Array, default: () => [] },
    newUserRegistration: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    usersCompanyOptions: { type: Object, default: () => ({}) },
    displayCompanySelect: { type: Boolean, default: false },
    label: { type: String, default: '' },
    displayNoOptionsSlot: { type: Boolean, default: false },
    displayIsCertified: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
    'company-select': CompanySelect,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-user-registration', 'open-user-creation-modal'],
  setup (props, { emit }) {
    const { newUserRegistration, usersCompanyOptions, displayIsCertified } = toRefs(props);

    const companyOptionsForUser = computed(() => {
      if (!newUserRegistration.value.user) return [];

      return usersCompanyOptions.value[newUserRegistration.value.user] || [];
    });

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const update = (event, path) => {
      emit('update:new-user-registration', set({ ...newUserRegistration.value }, path, event));
    };

    const submit = () => emit('submit');

    const updateUser = (event) => {
      const userHasOneCompany = Object.keys(usersCompanyOptions.value).length &&
        usersCompanyOptions.value[event].length === 1;
      const isCertified = displayIsCertified.value ? newUserRegistration.value.isCertified : null;
      const user = {
        user: event,
        ...(isCertified !== null && { isCertified }),
        ...(userHasOneCompany && { company: usersCompanyOptions.value[event][0].value }),
      };
      emit('update:new-user-registration', set(user));
    };

    const openUserCreationModal = () => emit('open-user-creation-modal');

    return {
      // Computed
      companyOptionsForUser,
      // Methods
      hide,
      input,
      update,
      submit,
      updateUser,
      openUserCreationModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.details
  font-size: 14px
  color: $petrol-80
</style>
