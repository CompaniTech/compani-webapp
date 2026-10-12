<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
       Ajouter un <span class="text-weight-bold">contact pour la formation</span>
    </template>
    <div class="text-navy-70">
      C'est le contact donné aux stagiaires s'ils ont des questions pratiques concernant la formation
    </div>
      <ni-option-group in-modal :model-value="contact" @update:model-value="update" type="radio"
        :options="contactOptions" :error="validations.$error" />
      <template #footer>
        <ni-button class="bg-primary full-width modal-btn" label="Ajouter le contact pour la formation"
          icon-right="add" color="white" :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import OptionGroup from '@components/form/OptionGroup';
import Button from '@components/Button';

export default {
  name: 'CourseContactAdditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    contact: { type: String, default: '' },
    contactOptions: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-option-group': OptionGroup,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:contact'],
  setup (_, { emit }) {
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = event => emit('update:contact', event);

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
