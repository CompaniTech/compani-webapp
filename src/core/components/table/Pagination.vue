<template>
  <div class="row justify-between full-width text-navy-70">
    <div class="row items-center">
      <q-btn-toggle class="on-left no-shadow" :model-value="rowsPerPage" :options="rowsPerPageOptions" dense size="12px"
        toggle-text-color="primary" toggle-color="white" @update:model-value="update($event, 'rowsPerPage')" no-caps />
      <div>Eléments par page</div>
    </div>
    <div class="row items-center">
      <div class="on-left">{{ paginationLabel }}</div>
      <div>
        <ni-button icon="chevron_left" class="no-shadow" :disable="props.isFirstPage" @click="props.prevPage" />
        <ni-button icon="chevron_right" class="no-shadow" :disable="props.isLastPage" @click="props.nextPage" />
      </div>
    </div>
  </div>
</template>

<script>
import Button from '@components/Button';

export default {
  name: 'Pagination',
  components: {
    'ni-button': Button,
  },
  props: {
    props: { type: Object, default: () => ({}) },
    data: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({}) },
    options: { type: Array, default: () => [15, 50, 100, 200, 300] },
  },
  emits: ['update:pagination'],
  data () {
    return {
      rowsPerPage: 0,
    };
  },
  computed: {
    rowsPerPageOptions () {
      return [...this.options.map(o => ({ label: o, value: o })), { label: 'Tous', value: 0 }];
    },
    firstRowIndex () {
      const { page, rowsPerPage } = this.pagination;
      return (page - 1) * rowsPerPage;
    },
    lastRowIndex () {
      const { page, rowsPerPage } = this.pagination;
      return page * rowsPerPage;
    },
    computedRowNumber () {
      if (this.pagination.rowsPerPage) {
        return this.data.slice(this.firstRowIndex, this.lastRowIndex).length + this.firstRowIndex;
      }
      return this.data.length;
    },
    paginationLabel () {
      const { rowsPerPage } = this.pagination;
      return rowsPerPage
        ? `${this.firstRowIndex + 1}-${Math.min(this.lastRowIndex, this.computedRowNumber)} de ${this.data.length}`
        : `1-${this.data.length} de ${this.data.length}`;
    },
  },
  watch: {
    'pagination.rowsPerPage': function () {
      this.refreshRowsPerPage();
    },
  },
  created () {
    this.refreshRowsPerPage();
  },
  methods: {
    update (event, prop) {
      this.$emit('update:pagination', { ...this.pagination, [prop]: event });
    },
    refreshRowsPerPage () {
      this.rowsPerPage = this.options.some(o => o === this.pagination.rowsPerPage)
        ? this.pagination.rowsPerPage
        : 0;
    },
  },
};
</script>

<style lang="sass" scoped>
:deep(.q-btn-group)
  & > .q-btn-item:first-child
    border: 1px solid $navy-20
  & > .q-btn-item:not(:first-child)
    border: 1px solid $navy-20
    border-left: none
  & > .q-btn-item:last-child
    font-weight: bold
</style>
