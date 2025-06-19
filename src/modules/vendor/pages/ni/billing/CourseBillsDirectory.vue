<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Répertoire factures" search-placeholder="Rechercher une facture"
      @update-search="updateSearch" :search="searchStr" />
    <ni-simple-table :data="filteredBills" :columns="columns" :loading="tableLoading" v-model:pagination="pagination">
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td :props="props" v-for="col in props.cols" :key="col.name" :data-label="col.label" :class="col.name"
            :style="col.style">
            <template v-if="col.name === 'number'">
              <div class="clickable-name cursor-pointer" @click.stop="downloadBill(props.row)">
                {{ col.value }}
              </div>
              <div class="row items-center" v-if="props.row.courseCreditNote">
                <q-icon size="12px" name="fas fa-times-circle" color="orange-500" />
                <div class="q-ml-xs text-orange-500">
                  Annulée par avoir -
                  <span class="clickable-name text-orange-500 cursor-pointer"
                    @click.stop="downloadCreditNote(props.row.courseCreditNote)">
                    {{ props.row.courseCreditNote.number }}
                  </span>
                </div>
              </div>
            </template>
            <template v-else-if="col.name === 'action'">
              <router-link :to="goToCourse(col.value)">
                <q-icon size="20px" name="open_in_new" color="primary" />
              </router-link>
            </template>
            <template v-else>{{ col.value }}</template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import escapeRegExp from 'lodash/escapeRegExp';
import { computed, ref } from 'vue';
import CourseBills from '@api/CourseBills';
import DirectoryHeader from '@components/DirectoryHeader';
import { NotifyNegative } from '@components/popup/notify';
import SimpleTable from '@components/table/SimpleTable';
import { DD_MM_YYYY, DASHBOARD } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import { useCourseBilling } from '@composables/courseBills';
import { descendingSortBy } from '@helpers/dates/utils';
import { removeDiacritics, formatPrice } from '@helpers/utils';

export default {
  name: 'HoldingsDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-simple-table': SimpleTable,
  },
  setup () {
    const metaInfo = { title: 'Répertoire factures' };
    useMeta(metaInfo);

    const courseBills = ref([]);
    const tableLoading = ref(false);
    const columns = [
      {
        name: 'date',
        label: 'Date',
        field: 'billedAt',
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
      { name: 'action', label: '', field: 'course' },
    ];
    const pagination = ref({ sortBy: 'name', ascending: true, page: 1, rowsPerPage: 15 });
    const searchStr = ref('');

    const filteredBills = computed(() => {
      const formattedString = escapeRegExp(removeDiacritics(searchStr.value));
      return courseBills.value.filter(bill => bill.number.match(new RegExp(formattedString, 'i')));
    });

    const updateSearch = (value) => { searchStr.value = value; };

    const { downloadBill, downloadCreditNote } = useCourseBilling(courseBills);

    const refreshCourseBills = async () => {
      try {
        tableLoading.value = true;
        const billList = await CourseBills.list({ isValidated: true, action: DASHBOARD });

        courseBills.value = billList.sort(descendingSortBy('billedAt'));
      } catch (e) {
        console.error(e);
        courseBills.value = [];
        NotifyNegative('Erreur lors de la récupération des factures.');
      } finally {
        tableLoading.value = false;
      }
    };

    const goToCourse = courseId => ({
      name: 'ni management blended courses info',
      params: { courseId },
      query: { defaultTab: 'billing' },
    });

    const created = async () => {
      await refreshCourseBills();
    };

    created();

    return {
      // Data
      searchStr,
      columns,
      tableLoading,
      pagination,
      // Computed
      filteredBills,
      // Methods
      updateSearch,
      downloadBill,
      downloadCreditNote,
      goToCourse,
    };
  },

};
</script>
