<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Définir une <span class="text-weight-bold">règle d'accès</span>
    </template>
    <ni-option-group v-model="access" :options="ACCESS_OPTIONS" inline type="radio" @update:model-value="resetAccess" />
    <template v-if="access === RESTRICTED_ACCESS">
      <span class="text-italic">
        Seuls les apprenants des structures choisies auront accès à la formation.
        Vous pourrez modifier et rajouter des règles d’accès par la suite.
      </span>
      <company-select class="select" in-modal :company-options="companyOptions" :company="accessCompanies"
        required-field @update="update" :validation="v$.accessCompanies" multiple />
    </template>
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Publier avec cette règle d'accès" color="primary"
        icon-right="add" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, ref } from 'vue';
import useVuelidate from '@vuelidate/core';
import { requiredIf } from '@vuelidate/validators';
import { FREE_ACCESS, RESTRICTED_ACCESS, ACCESS_OPTIONS } from '@data/constants';
import Modal from '@components/modal/Modal';
import OptionGroup from '@components/form/OptionGroup';
import { NotifyWarning } from '@components/popup/notify';
import CompanySelect from '@components/form/CompanySelect';

export default {
  name: 'SubProgramPublicationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    companyOptions: { type: Array, default: () => [] },
  },
  components: {
    'ni-modal': Modal,
    'ni-option-group': OptionGroup,
    'company-select': CompanySelect,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (_, { emit }) {
    const access = ref(FREE_ACCESS);
    const accessCompanies = ref([]);

    const rules = computed(() => ({
      accessCompanies: { required: requiredIf(access.value === RESTRICTED_ACCESS) },
    }));

    const v$ = useVuelidate(rules, { accessCompanies });

    const hide = () => {
      access.value = FREE_ACCESS;
      accessCompanies.value = [];
      emit('hide');
    };

    const input = event => emit('update:model-value', event);

    const submit = () => {
      v$.value.accessCompanies.$touch();
      if (v$.value.accessCompanies.$error) return NotifyWarning('Champ(s) invalide(s)');

      emit('submit', accessCompanies.value);
    };

    const resetAccess = () => {
      accessCompanies.value = [];
      v$.value.accessCompanies.$reset();
    };

    const update = (event) => { accessCompanies.value = event; };

    return {
      // Validations
      v$,
      // Data
      RESTRICTED_ACCESS,
      ACCESS_OPTIONS,
      access,
      accessCompanies,
      // Methods
      hide,
      input,
      submit,
      resetAccess,
      update,
    };
  },
};
</script>

<style lang="sass" scoped>
.select
  margin-top: 32px
</style>
