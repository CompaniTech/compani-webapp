<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
       Envoyer <span class="text-weight-bold">les factures par email</span>
    </template>
    <div v-for="billInfos of billListInfos" :key="billInfos._id" class="text-copper-grey-600">
      <!-- {{ billInfos }} -->
    </div>
    <ni-select caption="Destinataires" :model-value="billListInfos.receivers" :options="receiversOptions"
      multiple in-modal @update:model-value="updateReceivers" @add-new-value="addNewValue"
      :error="validations.receivers.$error" :error-message="emailError" required-field />
    <template #footer>
      <ni-button class="bg-primary full-width modal-btn" label="Envoyer par email"
        icon-right="send" color="white" :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref, computed, watch } from 'vue';
import get from 'lodash/get';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { REQUIRED_LABEL } from '@data/constants';
import { set } from 'lodash';

export default {
  name: 'SendBillModal',
  props: {
    modelValue: { type: Boolean, default: false },
    emailOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    billListInfos: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-select': Select,
  },
  emits: ['hide', 'update:model-value', 'update:bill-list-infos', 'submit'],
  setup (props, { emit }) {
    const { emailOptions, validations, billListInfos } = toRefs(props);
    const receiversOptions = ref([]);

    const emailError = computed(() => (
      get(validations.value, 'receivers.required.$response') === false ? REQUIRED_LABEL : 'Email non valide'
    ));

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');

    const updateReceivers = (value) => {
      let newReceivers = value;
      if (value.some(el => typeof el !== 'string')) {
        newReceivers = value.map(el => el.value || el);
      }
      emit('update:bill-list-infos', set({ ...billListInfos.value }, 'receivers', newReceivers));
    };

    const addNewValue = (value) => {
      if (!value || receiversOptions.value.map(opt => opt.value).includes(value)) return;

      const newOption = { label: value, value, additionalFilters: [value] };
      receiversOptions.value = [...receiversOptions.value, newOption];

      updateReceivers([...billListInfos.value.receivers, newOption]);
    };

    watch(
      emailOptions,
      (newOptions) => { if (newOptions.length) receiversOptions.value = [...newOptions]; },
      { immediate: true }
    );

    return {
      // Data
      receiversOptions,
      // Computed
      emailError,
      // Methods
      hide,
      input,
      submit,
      updateReceivers,
      addNewValue,
    };
  },
};
</script>
<style lang="sass" scoped>
.details
  font-size: 14px
  color: $copper-grey-500
</style>
