<template>
  <q-page padding :class="'q-pb-xl vendor-background'">
    <ni-profile-header title="Paiements">
      <template #title>
        <ni-select caption="Statut des paiements" :options="PAYMENT_STATUS_OPTIONS" multiple required-field
          :model-value="selectedStatus" @update:model-value="updateSelectedStatus" class="selector" />
      </template>
    </ni-profile-header>
     <template v-if="!paymentList.length">
      <span class="text-italic q-pa-lg">Aucun paiement pour les statuts sélectionnés.</span>
    </template>
    <ni-simple-table v-else :data="paymentList" :columns="columns" :loading="tableLoading"
      v-model:pagination="pagination">
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td :props="props" v-for="col in props.cols" :key="col.name" :class="col.name" :style="col.style">
              <div v-if="col.name === 'status'" class="chip-container">
                <q-chip :class="[getStatusClass(col.value)]" :label="getItemStatus(col.value)" />
              </div>
              <template v-else-if="col.name === 'payer'">
                <div v-if="props.row.courseBill.isPayerCompany" @click="$event.stopPropagation()">
                  <router-link :to="goToCompany(props.row.courseBill.payer)" :class="'clickable-name cursor-pointer'">
                  {{ col.value }}
                  </router-link>
                </div>
                <div v-else class="company-name">{{ col.value }}</div>
              </template>
              <template v-else>{{ col.value }}</template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
  </q-page>
</template>

<script>
import get from 'lodash/get';
import { useMeta } from 'quasar';
import { ref, watch } from 'vue';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import { NotifyNegative } from '@components/popup/notify';
import SimpleTable from '@components/table/SimpleTable';
import { PAYMENT_STATUS_OPTIONS, DD_MM_YYYY, PENDING, PAYMENT_OPTIONS } from '@data/constants';
import { formatPrice } from '@helpers/utils';
import CoursePayments from '@api/CoursePayments';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  name: 'PaymentsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
  },
  setup () {
    const metaInfo = { title: 'Paiements' };
    useMeta(metaInfo);

    const selectedStatus = ref([PENDING]);
    const paymentList = ref([]);
    const tableLoading = ref(false);
    const pagination = ref({ page: 1, rowsPerPage: 15 });
    const columns = [
      {
        name: 'date',
        label: 'Date',
        field: 'date',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
        align: 'left',
      },
      { name: 'number', label: '#', field: 'number', align: 'left' },
      {
        name: 'netInclTaxes',
        label: 'Montant',
        field: 'netInclTaxes',
        format: formatPrice,
        align: 'left',
      },
      {
        name: 'courseBillNumber',
        label: '# Facture',
        field: row => row.courseBill.number,
        align: 'left',
      },
      {
        name: 'payer',
        label: 'Payeur',
        field: row => get(row, 'courseBill.payer.name', ''),
        align: 'left',
      },
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        format: value => PAYMENT_OPTIONS.find(opt => opt.value === value).label,
        align: 'left',
      },
      {
        name: 'status',
        label: 'Statut',
        field: 'status',
        align: 'center',
        class: 'status',
      },
    ];
    const refreshPayments = async (params) => {
      try {
        tableLoading.value = true;
        paymentList.value = await CoursePayments.list(params);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des paiements.');
      } finally {
        tableLoading.value = false;
      }
    };

    const getItemStatus = status => PAYMENT_STATUS_OPTIONS.find(s => s.value === status).label;

    const getStatusClass = status => (status === PENDING ? 'orange-chip' : 'green-chip');

    const updateSelectedStatus = (status) => { selectedStatus.value = status; };

    const goToCompany = row => ({
      name: 'ni users companies info', params: { companyId: row._id }, query: { defaultTab: 'bills' },
    });

    const created = async () => { await refreshPayments({ status: selectedStatus.value }); };

    created();

    let timeout;
    watch(selectedStatus, () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (selectedStatus.value.length) await refreshPayments({ status: selectedStatus.value });
        else paymentList.value = [];
      }, 1000);
    });

    return {
      // Data
      PAYMENT_STATUS_OPTIONS,
      selectedStatus,
      paymentList,
      columns,
      tableLoading,
      pagination,
      // Computed
      // Methods
      updateSelectedStatus,
      getItemStatus,
      getStatusClass,
      goToCompany,
    };
  },
};

</script>
<style lang="sass" scoped>
.selector
  width: 50%
.status
  width: 10%
.company-name
  color: $primary
  width: fit-content
  cursor: default
</style>
