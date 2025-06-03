<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Ajouter un article <span class="text-weight-bold">à facturer</span>
    </template>
    <div class="course-bill-infos">
      <div>{{ courseName }} </div>
      <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
        <template #message>Facture pour le compte de {{ companiesName }}</template>
      </ni-banner>
    </div>
    <ni-select in-modal caption="Article" :options="billingItemOptions" :model-value="newBillingPurchase.billingItem"
      required-field @blur="validations.billingItem.$touch" :error="validations.billingItem.$error"
      @update:model-value="update($event, 'billingItem')" />
    <ni-input in-modal caption="Prix unitaire" :error="validations.price.$error" type="number"
      :model-value="newBillingPurchase.price" @blur="validations.price.$touch" suffix="€" required-field
      :error-message="errorMessages.price" @update:model-value="update($event, 'price')" />
    <ni-input in-modal caption="Quantité" :error="validations.count.$error" type="number"
      :model-value="newBillingPurchase.count" @blur="validations.count.$touch" required-field
      :error-message="errorMessages.count" @update:model-value="update($event, 'count')" />
    <ni-input in-modal caption="Description" type="textarea" :model-value="newBillingPurchase.description"
      @update:model-value="update($event, 'description')" />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Ajouter l'article" icon-right="add" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import Select from '@components/form/Select';
import Banner from '@components/Banner';

export default {
  name: 'BillingPurchaseAdditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newBillingPurchase: { type: Object, default: () => ({}) },
    billingItemOptions: { type: Array, default: () => [] },
    errorMessages: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    courseName: { type: String, default: '' },
    companiesName: { type: String, default: '' },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'ni-select': Select,
    'ni-banner': Banner,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-billing-purchase'],
  setup (props, { emit }) {
    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');
    const update = (event, path) => {
      emit('update:new-billing-purchase', set({ ...props.newBillingPurchase }, path, event));
    };

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
