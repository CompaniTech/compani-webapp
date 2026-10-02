<template>
  <ni-responsive-table :data="trainingContracts" :columns="columns" v-model:pagination="pagination" separator="none"
    :loading="loading">
    <template #body="{ props }">
      <q-tr :props="props">
        <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props"
          :style="col.style" :class="[{ 'border': props.rowIndex === 0 }]">
          <template v-if="col.name === 'actions'">
            <ni-button icon="file_download" color="primary" type="a" :href="props.row.file.link"
              :disable="!props.row.file.link" />
            <ni-button v-if="showDeleteButton" icon="delete" @click="deleteTrainingContract(props.row._id)"
              :disable="isArchived || !props.row.file.link" />
          </template>
          <template v-else>{{ col.value }}</template>
        </q-td>
      </q-tr>
    </template>
  </ni-responsive-table>
</template>

<script>
import { computed, ref, toRefs } from 'vue';
import get from 'lodash/get';
import Button from '@components/Button';
import ResponsiveTable from '@components/table/ResponsiveTable';

export default {
  name: 'TrainingContractTable',
  props: {
    trainingContracts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    showDeleteButton: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    companyOptions: { type: Array, default: () => [] },
    isSingleCourse: { type: Boolean, default: false },
  },
  components: {
    'ni-button': Button,
    'ni-responsive-table': ResponsiveTable,
  },
  emits: ['delete', 'download'],
  setup (props, { emit }) {
    const { companyOptions, trainingContracts, isSingleCourse } = toRefs(props);
    const pagination = ref({ rowsPerPage: 0, sortBy: 'lastname' });
    const columns = computed(() => [
      {
        name: 'company',
        label: isSingleCourse.value ? 'Convention' : 'Structure',
        align: 'left',
        field: 'company',
        format: (value, row) => (isSingleCourse.value
          ? `Convention ${trainingContracts.value.findIndex(tc => tc._id === row._id) + 1}`
          : get(companyOptions.value.find(option => value === option.value), 'label') || ''),
      },
      { name: 'actions', label: '', align: 'right', field: '' },
    ]);

    const deleteTrainingContract = trainingContractId => emit('delete', trainingContractId);

    return {
      // Data
      columns,
      pagination,
      // Methods
      deleteTrainingContract,
    };
  },
};
</script>
<style lang="sass" scoped>
.border
  @media screen and (min-width: 767px)
    border-top: 1px solid $copper-grey-200
</style>
