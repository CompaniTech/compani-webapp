<template>
  <q-page padding :class="'q-pb-xl vendor-background'">
    <ni-profile-header title="Paiements">
      <template #title>
        <ni-select caption="Statut des paiements" :options="PAYMENT_STATUS_OPTIONS" multiple required-field
          :model-value="selectedStatus" @update:model-value="updateSelectedStatus" class="selector" />
      </template>
    </ni-profile-header>
    <div>
      <ni-button v-if="paymentList.length" label="Télécharger le fichier de prélèvements SEPA"
        @click="openXmlFileModal" :disable="!selectedPayments.length" />
    </div>
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
              <template v-else-if="col.name === 'actions'">
                <q-checkbox class="q-ma-md" v-model="selectedPayments" :val="props.row._id" dense />
              </template>
              <template v-else>{{ col.value }}</template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
  </q-page>

  <ni-xml-file-download-modal v-model="xmlFileDownloadModal" v-model:transaction-name="transactionName"
    :loading="xmlFileDownloadLoading" :validations="v$.transactionName" @submit="getXmlFile"
    @hide="resetXmlFileDownload" />
</template>

<script>
import get from 'lodash/get';
import { useMeta } from 'quasar';
import { ref, watch, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import { NotifyNegative, NotifyWarning } from '@components/popup/notify';
import SimpleTable from '@components/table/SimpleTable';
import Button from '@components/Button';
import { PAYMENT_STATUS_OPTIONS, DD_MM_YYYY, PENDING, PAYMENT_OPTIONS, RECEIVED } from '@data/constants';
import CoursePayments from '@api/CoursePayments';
import XmlSEPAFileInfos from '@api/XmlSEPAFileInfos';
import { formatPrice, sortStrings } from '@helpers/utils';
import { ascendingSort } from '@helpers/dates/utils';
import CompaniDate from '@helpers/dates/companiDates';
import { downloadFile } from '@helpers/file';
import XmlFileDownloadModal from 'src/modules/vendor/components/billing/XmlFileDownloadModal';

export default {
  name: 'PaymentsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
    'ni-button': Button,
    'ni-xml-file-download-modal': XmlFileDownloadModal,
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
        sortable: true,
        sort: (a, b) => ascendingSort(CompaniDate(a), CompaniDate(b)),
      },
      { name: 'number', label: '#', field: 'number', align: 'left', sortable: true, sort: sortStrings },
      { name: 'netInclTaxes', label: 'Montant', field: 'netInclTaxes', format: formatPrice, align: 'left' },
      {
        name: 'courseBillNumber',
        label: '# Facture',
        field: row => row.courseBill.number,
        align: 'left',
        sortable: true,
        sort: sortStrings,
      },
      {
        name: 'payer',
        label: 'Payeur',
        field: row => get(row, 'courseBill.payer.name', ''),
        align: 'left',
        sortable: true,
        sort: sortStrings,
      },
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        format: value => PAYMENT_OPTIONS.find(opt => opt.value === value).label,
        align: 'left',
        sortable: true,
        sort: (a, b) => {
          const valueA = PAYMENT_OPTIONS.find(opt => opt.value === a).label;
          const valueB = PAYMENT_OPTIONS.find(opt => opt.value === b).label;
          return sortStrings(valueA, valueB);
        },
      },
      { name: 'status', label: 'Statut', field: 'status', align: 'center', class: 'status' },
      {
        name: 'xmlSEPAFileInfosName',
        label: 'Nom de lot',
        align: 'center',
        field: row => get(row, 'xmlSEPAFileInfos.name'),
        sortable: true,
        sort: sortStrings,
      },
      { name: 'actions', label: '', field: '', align: 'center' },
    ];
    const selectedPayments = ref([]);
    const xmlFileDownloadModal = ref(false);
    const transactionName = ref('');
    const xmlFileDownloadLoading = ref(false);

    const rules = computed(() => ({ transactionName: { required } }));
    const v$ = useVuelidate(rules, { transactionName });

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

    const getStatusClass = (status) => {
      switch (status) {
        case PENDING:
          return 'orange-chip';
        case RECEIVED:
          return 'green-chip';
        default:
          return 'peach-chip';
      }
    };

    const updateSelectedStatus = (status) => { selectedStatus.value = status; };

    const goToCompany = row => ({
      name: 'ni users companies info', params: { companyId: row._id }, query: { defaultTab: 'bills' },
    });

    const openXmlFileModal = () => { xmlFileDownloadModal.value = true; };

    const getXmlFile = async () => {
      try {
        xmlFileDownloadLoading.value = true;
        v$.value.transactionName.$touch();
        if (v$.value.transactionName.$error) return NotifyWarning('Champ invalide.');

        const file = await XmlSEPAFileInfos.create({ payments: selectedPayments.value, name: transactionName.value });
        const fileName = `Prelevements_SEPA_${transactionName.value.replace(/ /g, '')}.xml`;
        await downloadFile(file, fileName);

        await refreshPayments({ status: selectedStatus.value });

        xmlFileDownloadModal.value = false;
        selectedPayments.value = [];
      } catch (e) {
        console.error(e);
        if (e.data instanceof Blob) {
          const text = await e.data.text();
          const error = JSON.parse(text);
          if ([409, 404, 403].includes(error.statusCode) && error.message) return NotifyNegative(error.message);
        }
        NotifyNegative('Erreur lors du téléchargement du fichier des prélèvements SEPA.');
      } finally {
        xmlFileDownloadLoading.value = false;
      }
    };

    const resetXmlFileDownload = () => {
      xmlFileDownloadModal.value = false;
      xmlFileDownloadLoading.value = false;
      transactionName.value = '';
      v$.value.transactionName.$reset();
    };

    let timeout;
    watch(selectedStatus, () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (selectedStatus.value.length) await refreshPayments({ status: selectedStatus.value });
        else paymentList.value = [];
      }, 1000);
      pagination.value = { page: 1, rowsPerPage: 15 };
      selectedPayments.value = [];
    });

    const created = async () => { await refreshPayments({ status: selectedStatus.value }); };

    created();

    return {
      // Data
      PAYMENT_STATUS_OPTIONS,
      selectedStatus,
      paymentList,
      columns,
      tableLoading,
      pagination,
      selectedPayments,
      PENDING,
      xmlFileDownloadModal,
      transactionName,
      xmlFileDownloadLoading,
      v$,
      // Methods
      updateSelectedStatus,
      getItemStatus,
      getStatusClass,
      goToCompany,
      openXmlFileModal,
      getXmlFile,
      resetXmlFileDownload,
    };
  },
};

</script>
<style lang="sass" scoped>
.selector
  width: 50%
.status
  width: 15%
.company-name
  color: $primary
  width: fit-content
  cursor: default
</style>
