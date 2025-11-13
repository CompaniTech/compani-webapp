<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
       Envoyer <span class="text-weight-bold">les factures par email</span>
    </template>
    <div v-for="billInfos of billListInfos" :key="billInfos" class="text-copper-grey-600">
      <!-- {{ billInfos }} -->
    </div>
    <ni-select caption="Destinataires" :model-value="billListInfos.receivers" :options="receiversOptions"
      multiple in-modal @update:model-value="updateBillListInfos($event, 'receivers')" @add-new-value="addNewValue"
      :error="validations.receivers.$error" :error-message="emailError" required-field />
    <ni-option-group in-modal :model-value="billListInfos.type"
      @update:model-value="updateBillListInfos($event, 'type')" caption="Type d'email" :options="EMAIL_OPTIONS"
      type="radio" :error="validations.type.$error" required-field inline />
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
import OptionGroup from '@components/form/OptionGroup';
import { REQUIRED_LABEL, EMAIL_OPTIONS } from '@data/constants';
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
    'ni-option-group': OptionGroup,
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

    const updateBillListInfos = (event, path) => {
      if (path === 'receivers') {
        let newReceivers = event;
        if (event.some(el => typeof el !== 'string')) {
          newReceivers = event.map(el => el.value || el);
        }
        emit('update:bill-list-infos', set({ ...billListInfos.value }, path, newReceivers));
      } else {
        emit('update:bill-list-infos', set({ ...billListInfos.value }, path, event));
      }
    };

    const addNewValue = (value) => {
      if (!value || receiversOptions.value.map(opt => opt.value).includes(value)) return;

      const newOption = { label: value, value, additionalFilters: [value] };
      receiversOptions.value = [...receiversOptions.value, newOption];

      updateBillListInfos([...billListInfos.value.receivers, newOption], 'receivers');
    };

    watch(
      emailOptions,
      (newOptions) => { if (newOptions.length) receiversOptions.value = [...newOptions]; },
      { immediate: true }
    );

    return {
      // Data
      receiversOptions,
      EMAIL_OPTIONS,
      // Computed
      emailError,
      // Methods
      hide,
      input,
      submit,
      updateBillListInfos,
      addNewValue,
    };
  },
};
</script>
<style lang="sass" scoped>
.details
  font-size: 14px
  color: $copper-grey-500
:deep(.q-option-group)
  .q-radio
    .q-radio__label
      font-size: 12px
</style>
