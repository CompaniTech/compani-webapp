<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Ajouter un <span class="text-weight-bold">nom commercial</span>
    </template>
    <ni-input in-modal :model-value="newTradeName" :error="validations.$error" caption="Nom commercial"
      @blur="validations.$touch" required-field @update:model-value="$emit('update:new-trade-name', $event)" />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" label="Ajouter le nom commercial" color="primary" :loading="loading"
        icon-right="add" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';

export default {
  name: 'TradeNameAdditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newTradeName: { type: String, default: '' },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  emits: ['hide', 'update:model-value', 'update:new-trade-name', 'submit'],
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
  },
  setup (_, { emit }) {
    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    return {
      hide,
      input,
      submit,
    };
  },
};
</script>
