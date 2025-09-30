<template>
  <q-card class="relative-position table-spinner-container" flat>
    <q-table v-if="!loading" :columns="columns" :class="tableClass" :pagination="pagination" :row-key="rowKey"
      :hide-bottom="hideBottom" :visible-columns="formattedVisibleColumns" binary-state-sort :hide-header="hideHeader"
      :expanded="expanded" @update:pagination="$emit('update:pagination', $event)" :separator="separator" :rows="data"
      @update:expanded="$emit('update:expanded', $event)">
      <template #header="props">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props"> {{ col.label }} </q-th>
        </q-tr>
      </template>
      <template #body="props">
        <q-tr :props="props" @click="props.expand = !props.expand" class="cursor-pointer">
          <slot name="row" :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <template v-if="col.name === 'expand'">
                <q-icon :name="props.expand ? 'expand_less' : 'expand_more'" />
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </slot>
        </q-tr>
        <q-tr v-show="props.expand" :props="props">
          <slot name="expanding-row" :props="props" />
        </q-tr>
      </template>
      <template #bottom="props">
        <ni-pagination :props="props" :pagination="pagination" :data="data" :options="paginationOptions"
          @update:pagination="update($event)" />
      </template>
      <template #bottom-row="props">
        <slot name="bottom-row" :props="props" />
      </template>
    </q-table>
    <div v-else class="loading-container" />
    <q-inner-loading :showing="loading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script>
import Pagination from '@components/table/Pagination';

export default {
  name: 'ExpandingTable',
  emits: ['update:pagination', 'update:expanded'],
  components: {
    'ni-pagination': Pagination,
  },
  props: {
    data: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    pagination: { type: Object, default: () => ({ rowsPerPage: 0 }) },
    rowKey: { type: String, default: '_id' },
    hideBottom: { type: Boolean, default: false },
    visibleColumns: { type: Array, default: () => [] },
    rowsPerPage: { type: Array, default: () => [15, 50, 100, 200, 300] },
    hideHeader: { type: Boolean, default: false },
    expanded: { type: Array, default: undefined },
    separator: { type: String, default: 'horizontal' },
    tableClass: { type: String, default: 'q-pa-md' },
  },
  computed: {
    formattedVisibleColumns () {
      return this.visibleColumns.length ? this.visibleColumns : this.columns.map(c => c.name);
    },
    paginationOptions () {
      return this.rowsPerPage.filter(o => o <= this.data.length);
    },
  },
  methods: {
    update (event) {
      this.$emit('update:pagination', event);
    },
  },
};
</script>
