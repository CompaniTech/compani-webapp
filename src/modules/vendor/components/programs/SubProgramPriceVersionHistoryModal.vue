<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Historique <span class="text-weight-bold">des tarifs</span>
    </template>
    <ni-responsive-table :data="subProgramPrices" :columns="subProgramPricesColumns" :hide-bottom="false"
      no-data-label="Pas de tarifs renseignés pour ce sous-programme." v-model:pagination="pagination"
      :rows-per-page-options="rowsPerPageOptions" />
  </ni-modal>
</template>

<script>
import { toRefs, computed, ref } from 'vue';
import CompaniDate from '@helpers/dates/companiDates';
import { descendingSortBy } from '@helpers/dates/utils';
import Modal from '@components/modal/Modal';
import ResponsiveTable from '@components/table/ResponsiveTable';
import { E_LEARNING, DD_MM_YYYY } from '@data/constants';

export default {
  name: 'SubProgramPriceVersionHistoryModal',
  props: {
    modelValue: { type: Boolean, default: false },
    subProgram: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-responsive-table': ResponsiveTable,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const { subProgram } = toRefs(props);

    const pagination = ref({ page: 1, rowsPerPage: 5 });
    const rowsPerPageOptions = ref([5, 10]);

    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };
    const submit = () => { emit('submit'); };

    const subProgramPrices = computed(() => (subProgram.value.priceVersions || [])
      .sort(descendingSortBy('effectiveDate'))
      .map(version => ({
        effectiveDate: version.effectiveDate,
        ...Object.fromEntries(version.prices.map(price => [price.step, price.hourlyAmount])),
      })));

    const subProgramPricesColumns = computed(() => [
      {
        name: 'effectiveDate',
        label: 'Date d\'effet',
        field: 'effectiveDate',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
        align: 'center',
        style: 'width: 15%',
      },
      ...subProgram.value.steps.filter(s => s.type !== E_LEARNING).map(step => ({
        name: 'stepName',
        label: `${step.name} \n\n (€ / h)`,
        field: step._id,
        align: 'center',
      })),
    ]);

    return {
      // Data
      pagination,
      rowsPerPageOptions,
      // Computed
      subProgramPrices,
      subProgramPricesColumns,
      // Methods
      hide,
      input,
      submit,
    };
  },
};
</script>
