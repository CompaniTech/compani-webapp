<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Envoyer un <span class="text-weight-bold">message</span>
    </template>
    <ni-select in-modal caption="Modèle" :options="filteredMessageTypeOptions" :model-value="newSms.type"
      required-field @update:model-value="updateType($event)" :error="error.type.$error" />
    <ni-input in-modal caption="Message" :model-value="newSms.content" @update:model-value="update($event, 'content')"
      type="textarea" :rows="7" required-field :error="error.content.$error" />
    <template #footer>
      <ni-button class="bg-primary full-width modal-btn" label="Envoyer message" icon-right="send" color="white"
        :loading="loading" @click="send" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import Input from '@components/form/Input';
import Button from '@components/Button';

export default {
  name: 'SmsSendingModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newSms: {
      type: Object,
      validator: p => (typeof p.type === 'string') && (typeof p.content === 'string'),
      default: () => ({ type: '', content: '' }),
    },
    filteredMessageTypeOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
    'ni-input': Input,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'update-type', 'send', 'update:new-sms'],
  setup(props, { emit }) {
    const { newSms } = toRefs(props);

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const updateType = (event) => {
      emit('update-type', event);
      update(event, 'type');
    };

    const send = () => emit('send', newSms.value);

    const update = (event, prop) => emit('update:new-sms', { ...newSms.value, [prop]: event });

    return {
      // Methods
      hide,
      input,
      updateType,
      send,
      update,
    };
  },
};
</script>
