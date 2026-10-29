<template>
  <q-page padding class="vendor-background">
    <ni-title-header title="Historique de facturation" class="q-mb-xl" />
    <template v-if="!trainerBills.length && !tableLoading">
      <span class="text-italic q-pa-lg">Aucune facture transmise.</span>
    </template>
    <ni-simple-table v-else :data="trainerBills" :columns="columns" :loading="tableLoading"
      :pagination="{ rowsPerPage: 0 }" hide-bottom>
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
            <div v-if="col.name === 'status'" class="chip-container">
              <q-chip :class="[col.value === PAID ? 'green-chip' : 'orange-chip']" :label="getStatusLabel(col.value)" />
            </div>
            <a v-else-if="col.name === 'file' && col.value" :href="col.value" target="_blank" rel="noopener">
              Voir la facture
            </a>
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
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import TrainerBills from '@api/TrainerBills';
import TitleHeader from '@components/TitleHeader';
import SimpleTable from '@components/table/SimpleTable';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import { DD_MM_YYYY, PAID } from '@data/constants';
import { formatPrice } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  name: 'TrainerBillsHistory',
  components: {
    'ni-title-header': TitleHeader,
    'ni-simple-table': SimpleTable,
  },
  setup () {
    const metaInfo = { title: 'Historique de facturation' };
    useMeta(metaInfo);

    const $store = useStore();

    const trainerBills = ref([]);
    const tableLoading = ref(false);
    const columns = [
      {
        name: 'submittedAt',
        label: 'Date de soumission',
        field: 'submittedAt',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
        align: 'left',
      },
      { name: 'number', label: 'Numéro', field: 'number', align: 'left' },
      { name: 'amount', label: 'Montant TTC', field: 'amount', format: formatPrice, align: 'left' },
      { name: 'file', label: 'Lien', field: row => get(row, 'file.link', ''), align: 'left' },
      { name: 'status', label: 'Statut', field: row => get(row, 'payment.status', ''), align: 'center' },
    ];

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const getStatusLabel = status => (status === PAID ? 'Réglée' : 'Transmise');

    const refreshTrainerBills = async () => {
      try {
        tableLoading.value = true;
        trainerBills.value = await TrainerBills.list({ trainer: loggedUser.value._id });
        NotifyPositive('Factures récupérées.');
      } catch (e) {
        console.error(e);
        trainerBills.value = [];
        NotifyNegative('Erreur lors de la récupération des factures.');
      } finally {
        tableLoading.value = false;
      }
    };

    const created = async () => {
      await refreshTrainerBills();
    };
    created();

    return {
      // Data
      PAID,
      trainerBills,
      tableLoading,
      columns,
      // Methods
      getStatusLabel,
    };
  },
};
</script>

<style lang="sass" scoped>
.chip-container
  display: flex
  justify-content: center
</style>
