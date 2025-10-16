<template>
  <div class="relative-position table-spinner-container">
    <q-table v-if="!loading" flat :columns="columns" :pagination="pagination" binary-state-sort :selection="selection"
      :rows="data" :separator="separator" :selected="selected" @update:expanded="$emit('update:expanded', $event)"
      :visible-columns="formattedVisibleColumns" :hide-bottom="shouldHideBottom" @row-click="$emit('row-click', $event)"
      @update:pagination="$emit('update:pagination', $event)" @update:selected="$emit('update:selected', $event)"
      :class="['q-pa-sm large-table sticky-header', isClientInterface ? 'client-header' : 'vendor-header']"
      :row-key="rowKey" :virtual-scroll="virtualScroll">
      <template #header="props">
        <slot name="header" :props="props">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">{{ col.label }}</q-th>
          </q-tr>
        </slot>
      </template>
      <template v-if="$slots['top-row']" #top-row="props">
        <slot name="top-row" :props="props" />
      </template>
      <template #body="props">
        <slot name="body" :props="props">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :props="props" :data-label="col.label" :style="col.style"
              :class="col.name">
              {{ col.value }}
            </q-td>
          </q-tr>
        </slot>
      </template>
      <template #bottom="props">
        <ni-pagination :props="props" :pagination="pagination" :data="data" :options="paginationOptions"
          @update:pagination="update($event)" />
      </template>
      <template #bottom-row="props">
        <slot name="bottom-row" :props="props" />
      </template>
      <template #no-data>
        <div v-show="!loading" class="full-width row q-gutter-sm text-copper-grey-800">
          <span>Pas de données disponibles</span>
        </div>
      </template>
    </q-table>
    <div v-else class="loading-container" />
    <q-inner-loading :showing="loading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script>
import Pagination from '@components/table/Pagination';

export default {
  name: 'SimpleTable',
  props: {
    data: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    rowKey: { type: [String, Function], default: 'name' },
    visibleColumns: { type: Array, default: () => [] },
    selection: { type: String, default: 'none' },
    selected: { type: Array, default: () => [] },
    separator: { type: String, default: 'horizontal' },
    hideBottom: { type: Boolean, default: false },
    rowsPerPageOptions: { type: Array, default: () => [15, 50, 100, 200, 300] },
    virtualScroll: { type: Boolean, default: false },
  },
  emits: ['update:pagination', 'update:selected', 'row-click', 'update:expanded'],
  components: {
    'ni-pagination': Pagination,
  },
  data () {
    const isClientInterface = !/\/ad\//.test(this.$route.path);

    return {
      isClientInterface,
    };
  },
  computed: {
    shouldHideBottom () {
      return this.hideBottom || (!!this.data.length && this.data.length <= this.rowsPerPageOptions[0]);
    },
    paginationOptions () {
      return this.rowsPerPageOptions.filter(o => o <= this.data.length);
    },
    formattedVisibleColumns () {
      return this.visibleColumns.length ? this.visibleColumns : this.columns.map(col => col.name);
    },
  },
  methods: {
    update (event) {
      this.$emit('update:pagination', event);
    },
  },
};
</script>
