<template>
  <div>
    <q-card class="container">
      <div class="row justify-between items-center cursor-pointer" @click="showDetails">
        <div>
          <div class="text-weight-bold">SMS de {{ getHistoryType }}</div>
          <div>envoyé {{ getSmsTimeStamp }} par {{ senderIdentity }}</div>
        </div>
        <q-icon size="24px" :name="isExpanded ? 'expand_less' : 'expand_more'" />
      </div>
      <div v-if="isExpanded" class="q-mt-md">{{ history.message }}</div>
    </q-card>
  </div>
</template>

<script>

import { toRefs, computed } from 'vue';
import { DD_MM_YYYY } from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { formatISODurationWithBestUnit } from '@helpers/dates/utils';

export default {
  name: 'SmsCell',
  props: {
    history: { type: Object, default: () => ({}) },
    messageTypeOptions: { type: Array, default: () => ([]) },
    isExpanded: { type: Boolean, default: false },
  },
  emits: ['show-details'],
  setup (props, { emit }) {
    const { messageTypeOptions, history } = toRefs(props);

    const getHistoryType =
      computed(() => messageTypeOptions.value.find(option => option.value === history.value.type).label.toLowerCase());

    const getSmsTimeStamp = computed(() => {
      const diffInDaysISO = CompaniDate().diff(history.value.date, 'days');

      if (CompaniDuration(diffInDaysISO).isLongerThan('P15D')) {
        return `le ${CompaniDate(history.value.date).format(DD_MM_YYYY)}`;
      }

      return `il y a ${formatISODurationWithBestUnit(diffInDaysISO)}`;
    });

    const senderIdentity = computed(() => formatIdentity(history.value.sender.identity, 'FL'));

    const showDetails = () => {
      emit('show-details', history.value._id);
    };

    return {
      // Computed
      senderIdentity,
      // Methods
      getHistoryType,
      getSmsTimeStamp,
      formatIdentity,
      showDetails,
    };
  },
};
</script>

<style lang="sass" scoped>
div
  white-space: pre-wrap
.container
  background-color: $turquoise-10
  margin: 0px 0px 16px 0px
  padding: 8px
  word-break: break-word
</style>
