<template>
  <div>
    <p class="text-weight-bold">Progression eLearning</p>
    <ni-expanding-table :data="learners" :columns="columns" v-model:pagination="pagination" :hide-bottom="false"
      :loading="loading" :visible-columns="visibleColumns">
      <template #row="{ props }">
        <q-td v-for="col in props.cols" :key="col.name" :props="props">
          <template v-if="col.name === 'progress'">
            <ni-progress class="progress" :value="col.value" />
          </template>
          <template v-else-if="col.name === 'expand'">
            <q-icon :name="props.expand ? 'expand_less' : 'expand_more'" />
          </template>
          <template v-else-if="col.name === 'connectionInfos'">
            <a v-if="col.value">{{ col.value }}</a>
            <connected-dot v-else />
          </template>
          <template v-else>
            <div v-if="canAccessTrainee" class="name clickable-name" @click="$event.stopPropagation()">
              <router-link :to="goToLearnerProfile(props.row)">{{ col.value }}</router-link>
            </div>
            <div v-else>{{ col.value }}</div>
          </template>
        </q-td>
      </template>
      <template #expanding-row="{ props }">
        <q-td colspan="100%">
          <div v-for="step in props.row.steps" :key="step._id" :props="props"
            class="q-ma-sm expanding-table-expanded-row">
            <div>
              <q-icon :name="getStepTypeIcon(step.type)" />
              {{ step.name }}
            </div>
            <div class="expanding-table-progress-container">
              <ni-progress class="expanding-table-sub-progress" :value="step.progress.eLearning" />
            </div>
          </div>
        </q-td>
      </template>
    </ni-expanding-table>
  </div>
</template>

<script>
import get from 'lodash/get';
import { computed, ref, toRefs } from 'vue';
import { useStore } from 'vuex';
import pick from 'lodash/pick';
import ExpandingTable from '@components/table/ExpandingTable';
import Progress from '@components/CourseProgress';
import { getStepTypeIcon } from '@helpers/courses';
import { sortStrings } from '@helpers/utils';
import { defineAbilitiesForCourse } from '@helpers/ability';
import { useCourses } from '@composables/courses';
import ConnectedDot from './ConnectedDot';

export default {
  name: 'ElearningFollowUpTable',
  components: {
    'ni-expanding-table': ExpandingTable,
    'ni-progress': Progress,
    'connected-dot': ConnectedDot,
  },
  props: {
    learners: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    isBlended: { type: Boolean, default: false },
  },
  setup (props) {
    const $store = useStore();

    const { isBlended } = toRefs(props);

    const { isClientInterface } = useCourses();

    const columns = ref([
      {
        name: 'name',
        label: 'Nom',
        field: 'identity',
        format: value => (value ? value.fullName : ''),
        align: 'left',
        sortable: true,
        sort: (a, b) => sortStrings(a.lastname, b.lastname),
        style: isBlended.value ? 'width: 40%' : 'width: 70%',
      },
      {
        name: 'connectionInfos',
        label: 'Code de connexion à l\'app mobile',
        field: 'loginCode',
        align: 'center',
      },
      {
        name: 'progress',
        label: 'Progression',
        field: row => get(row, 'progress.eLearning'),
        align: 'center',
        sortable: true,
        style: 'min-width: 150px; width: 20%',
      },
      { name: 'expand', label: '', field: '' },
    ]);
    const pagination = ref({ sortBy: 'name', ascending: true, page: 1, rowsPerPage: 15 });

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const canAccessTrainee = computed(() => {
      const ability = defineAbilitiesForCourse(pick(loggedUser.value, ['role']));

      return ability.can('access', 'trainee');
    });

    const visibleColumns = computed(() => (isBlended.value
      ? ['name', 'connectionInfos', 'progress', 'expand']
      : ['name', 'progress', 'expand']));

    const goToLearnerProfile = (row) => {
      const name = isClientInterface ? 'ni courses learners info' : 'ni users learners info';
      return { name, params: { learnerId: row._id }, query: { defaultTab: 'courses' } };
    };

    return {
      // Data
      columns,
      pagination,
      // Computed
      visibleColumns,
      canAccessTrainee,
      // Methods
      goToLearnerProfile,
      getStepTypeIcon,
    };
  },
};
</script>

<style lang="sass" scoped>
.progress
  width: 100%
.name
  width: fit-content
</style>
