<template>
  <ni-simple-table :data="completionCertificates" :columns="columns" :loading="tableLoading"
    v-model:pagination="pagination">
    <template #body="{ props }">
      <q-tr :props="props">
        <q-td :props="props" v-for="col in props.cols" :key="col.name" :data-label="col.label" :class="col.name"
          :style="col.style">
            <template v-if="col.name === 'actions'">
              <div v-if="has(props, 'row.file.link')">
                <ni-button icon="file_download" color="primary" type="a" :href="get(props.row, 'file.link')" />
                <ni-button icon="delete" color="primary" type="a" @click="removeFile(props.row._id)" />
              </div>
              <div v-else>
                <ni-primary-button label="Générer" icon="add" @click="generate(props.row._id)"
                  :disabled="disabledButton" />
              </div>
            </template>
            <template v-else-if="col.name === 'course'">
              <div @click="$event.stopPropagation()">
                <router-link :to="goToCourseProfile(get(props, 'row.course._id'))" class="clickable-name">
                  {{ col.value }}
                </router-link>
              </div>
            </template>
            <template v-else> {{ col.value }} </template>
        </q-td>
      </q-tr>
    </template>
  </ni-simple-table>
</template>

<script>
import get from 'lodash/get';
import has from 'lodash/has';
import { ref } from 'vue';
import SimpleTable from '@components/table/SimpleTable';
import Button from '@components/Button';
import PrimaryButton from '@components/PrimaryButton';

export default {
  name: 'CompletionCertificateTable',
  props: {
    completionCertificates: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    tableLoading: { type: Boolean, default: false },
    disabledButton: { type: Boolean, default: false },
  },
  components: {
    'ni-simple-table': SimpleTable,
    'ni-button': Button,
    'ni-primary-button': PrimaryButton,
  },
  emits: ['generate', 'removeFile'],
  setup (_, { emit }) {
    const pagination = ref({ page: 1, rowsPerPage: 15 });

    const generate = event => emit('generate', event);

    const removeFile = event => emit('removeFile', event);

    const goToCourseProfile = courseId => ({
      name: 'ni management blended courses info',
      params: { courseId },
      query: { defaultTab: 'traineeFollowUp' },
    });

    return {
      // Data
      pagination,
      // Methods
      generate,
      goToCourseProfile,
      get,
      has,
      removeFile,
    };
  },
};
</script>
