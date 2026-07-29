<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Changement de statut des créneaux
    </template>
    <ni-banner class="bg-copper-grey-100 q-ma-md" icon="info_outline">
      <template #message>
        <div v-for="group in invoiceGroups" :key="group.number" class="row invoice-row">
          <span class="text-bold">{{ group.number }} :</span>
          <span>{{ formatQuantity('créneau', group.count, 'x') }}</span>
        </div>
        <span class="q-ma-sm">(statut actuel : {{ SLOT_STATUS[currentStatus] }})</span>
      </template>
    </ni-banner>
    <ni-select caption="Nouveau statut" in-modal :model-value="newStatus" :options="statusOptions"
      :error="validations.$error" @update:model-value="updateStatus" @blur="validations.$touch" last
      required-field />
    <template #footer>
      <div class="q-pl-lg">Cette opération est définitive. Confirmez-vous&nbsp;?</div>
      <div class="row justify-end q-ma-md">
        <ni-button label="NON" :loading="loading" @click="hide" />
        <ni-button label="OUI" :loading="loading" @click="submit" />
      </div>
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import { useQuasar } from 'quasar';
import groupBy from 'lodash/groupBy';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import Button from '@components/Button';
import Banner from '@components/Banner';
import { NotifyPositive } from '@components/popup/notify';
import { STATUS_CHANGE_OPTIONS, NOT_INVOICED, SLOT_STATUS } from '@data/constants';
import { formatQuantity } from '@helpers/utils';

export default {
  name: 'CourseSlotStatusChangeModal',
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
    'ni-button': Button,
    'ni-banner': Banner,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    currentStatus: { type: String, default: '' },
    newStatus: { type: String, default: '' },
    selectedSlots: { type: Array, default: () => [] },
  },
  emits: ['hide', 'update:model-value', 'update:new-status', 'submit'],
  setup (props, { emit }) {
    const { currentStatus, newStatus, selectedSlots } = toRefs(props);
    const $q = useQuasar();

    const statusOptions = computed(() => STATUS_CHANGE_OPTIONS[currentStatus.value] || []);

    const invoiceGroups = computed(() => {
      const groups = groupBy(selectedSlots.value, 'trainerBillNumber');
      return Object.entries(groups).map(([number, slots]) => ({ number, count: slots.length }));
    });

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const updateStatus = value => emit('update:new-status', value);

    const submit = () => {
      if (newStatus.value === NOT_INVOICED) {
        return $q.dialog({
          title: 'Confirmation',
          message: 'Les factures associées à ces créneaux seront annulées. Confirmez-vous&nbsp;?',
          html: true,
          ok: 'Oui',
          cancel: 'Non',
        }).onOk(() => emit('submit'))
          .onCancel(() => NotifyPositive('Annulation des factures abandonnée.'));
      }

      return emit('submit');
    };

    return {
      // Data
      SLOT_STATUS,
      // Computed
      statusOptions,
      invoiceGroups,
      // Methods
      formatQuantity,
      hide,
      input,
      updateStatus,
      submit,
    };
  },
};
</script>

<style lang="sass" scoped>
:deep(.q-banner__content > div)
  flex: 1
.invoice-row
  width: 60%
  justify-content: space-between
  margin: 8px
</style>
