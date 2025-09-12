<template>
  <q-page padding :class="'q-pb-xl vendor-background'">
    <ni-profile-header title="Paiements">
      <template #title>
        <ni-select caption="Statut des paiements" :options="PAYMENT_STATUS_OPTIONS" multiple required-field
          :model-value="selectedStatus" @update:model-value="updateSelectedStatus" class="selector" />
      </template>
    </ni-profile-header>
    {{ paymentList }}
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { ref, watch } from 'vue';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import { NotifyNegative } from '@components/popup/notify';
import { PAYMENT_STATUS_OPTIONS } from '@data/constants';
import CoursePayments from '../../../../../core/api/CoursePayments';
import { PENDING } from '../../../../../core/data/constants';

export default {
  name: 'PaymentsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
  },
  setup () {
    const metaInfo = { title: 'Paiements' };
    useMeta(metaInfo);

    const selectedStatus = ref([PENDING]);
    const paymentList = ref([]);

    const refreshPayments = async (params) => {
      try {
        paymentList.value = await CoursePayments.list(params);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des paiements.');
      }
    };

    const updateSelectedStatus = (status) => { selectedStatus.value = status; };

    const created = async () => { await refreshPayments({ status: selectedStatus.value }); };

    created();

    let timeout;
    watch(selectedStatus, () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (selectedStatus.value.length) {
          await refreshPayments({
            status: selectedStatus.value,
          });
        } else {
          paymentList.value = [];
        }
      }, 1000);
    });

    return {
      // Data
      PAYMENT_STATUS_OPTIONS,
      selectedStatus,
      paymentList,
      // Computed
      // Methods
      updateSelectedStatus,
    };
  },
};

</script>
<style lang="sass" scoped>
.selector
  width: 50%
</style>
