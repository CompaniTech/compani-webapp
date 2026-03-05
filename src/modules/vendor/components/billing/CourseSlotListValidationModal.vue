<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Confirmation
    </template>
    <ni-banner class="bg-copper-grey-100 q-ma-md" icon="info_outline">
      <template #message>{{ message }}</template>
    </ni-banner>
    <ni-input caption="Numéro de facture de l'intervenant" in-modal v-model="courseSlotsToPay.billNumber"
      :error="validations.billNumber.$error" last required-field />
    <template #footer>
      <div class="q-pl-lg">Cette opération est définitive. Confirmez-vous&nbsp;?</div>
      <div class="row justify-end q-ma-md">
        <ni-button label="NON" :loading="loading" @click="cancel" />
        <ni-button label="OUI" :loading="loading" @click="submit" />
      </div>
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, computed } from 'vue';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import Banner from '@components/Banner';
import { formatQuantity } from '@helpers/utils';

export default {
  name: 'CourseSlotListValidationModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'ni-banner': Banner,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    courseSlotsToPay: { type: Object, required: true },
  },
  emits: ['hide', 'update:model-value', 'submit', 'cancel'],
  setup (props, { emit }) {
    const { courseSlotsToPay } = toRefs(props);
    const message = computed(() => {
      const count = courseSlotsToPay.value._ids.length;
      const isPlural = count > 1;

      return `${isPlural ? 'Les' : 'Le'} ${formatQuantity('créneau', count, 'x', isPlural)} précédemment `
      + `${formatQuantity('sélectionné', count, 's', false)} ${isPlural ? 'seront' : 'sera'} `
      + `${formatQuantity('marqué', count, 's', false)} comme "Réglé" et `
      + `${formatQuantity('associé', count, 's', false)} au numéro de facture que vous indiquerez `
      + 'ci-dessous.';
    });

    const hide = () => emit('hide');

    const cancel = () => emit('cancel');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    return {
      // Computed
      message,
      // Methods
      hide,
      cancel,
      input,
      submit,
      formatQuantity,
    };
  },
};
</script>
