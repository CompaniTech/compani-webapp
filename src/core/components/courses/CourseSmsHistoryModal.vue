<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template v-if="sendSms" #title>Envoyer un <span class="text-weight-bold">message</span></template>
    <template v-else #title>Historique des <span class="text-weight-bold">messages</span></template>
    <ni-banner v-if="sendSms" icon="info_outline" icon-color="copper-500"
      class="bg-copper-grey-100 text-copper-grey-800">
      <template #message>Assurez-vous d'éviter les doublons de messages en consultant l'historique ci-dessous</template>
    </ni-banner>
    <div class="q-mb-lg">
      <div v-for="history of smsHistoryList" :key="history._id">
        <ni-banner v-if="history.missingPhones.length" icon="info_outline" icon-color="orange-700"
          class="bg-orange-50 text-orange-900">
          <template #message>
            Pour cet envoi, il manquait le numéro de téléphone de
            {{ formatQuantity('stagiaire', history.missingPhones.length) }} :
            {{ getMissingTraineesPhoneHistory(history).join(', ') }}.
          </template>
        </ni-banner>
        <sms-cell :history="history" :message-type-options="messageTypeOptions" @show-details="showDetails"
          :is-expanded="areDetailsVisible[history._id]" />
      </div>
    </div>
    <template v-if="sendSms" #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Poursuivre" icon-right="add" color="white"
        @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref } from 'vue';
import Banner from '@components/Banner';
import Button from '@components/Button';
import Modal from '@components/modal/Modal';
import SmsCell from '@components/courses/SmsCell';
import { formatQuantity, formatIdentity } from '@helpers/utils';

export default {
  name: 'CourseSmsHistoryModal',
  props: {
    modelValue: { type: Boolean, default: false },
    smsHistoryList: { type: Array, default: () => ([]) },
    messageTypeOptions: { type: Array, default: () => ([]) },
    missingTraineesPhoneHistory: { type: Array, default: () => ([]) },
    sendSms: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'sms-cell': SmsCell,
    'ni-banner': Banner,
    'ni-button': Button,
  },
  emits: ['hide', 'submit', 'update:model-value'],
  setup (props, { emit }) {
    const { smsHistoryList } = toRefs(props);
    const areDetailsVisible = ref(Object.fromEntries(smsHistoryList.value.map(history => [history._id, false])));

    const showDetails = (historyId) => { areDetailsVisible.value[historyId] = !areDetailsVisible.value[historyId]; };

    const getMissingTraineesPhoneHistory = history => history.missingPhones
      .map(mp => formatIdentity(mp.identity, 'FL'));

    const hide = () => emit('hide');
    const submit = () => emit('submit');
    const input = event => emit('update:model-value', event);

    return {
      // Data
      areDetailsVisible,
      // Methods
      showDetails,
      hide,
      submit,
      input,
      formatQuantity,
      getMissingTraineesPhoneHistory,
    };
  },
};
</script>
