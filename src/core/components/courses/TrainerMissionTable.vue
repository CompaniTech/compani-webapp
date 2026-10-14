<template>
  <div v-if="!!trainerMissions.length"
    class="q-mb-xl">
    <p class="text-weight-bold">Ordres de mission</p>
    <div class="q-mb-sm">
      <q-card>
        <ni-responsive-table :data="trainerMissions" :columns="columns" v-model:pagination="pagination"
          :loading="loading" :rows-per-page-options="[5, 10, 15, 20]" :hide-bottom="false">
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props"
                :style="col.style" :class="[{ 'border': props.rowIndex === 0 }]">
                <template v-if="col.name === 'actions'">
                  <div v-if="props.row.cancelledAt" class="text-orange-500 q-mr-md">Annulé</div>
                  <div v-else>
                    <ni-button icon="file_download" color="primary" type="a" :href="props.row.file.link"
                      :disable="!props.row.file.link" />
                    <ni-button v-if="canUpdate" icon="close" color="primary"
                      @click="validateMissionCancellation(props.row._id)" />
                  </div>
                </template>
                <template v-else-if="col.name === 'courses'">
                  <div v-for="course of props.row.courses" :key="course._id" class="q-mb-xs course">
                    <router-link class="clickable-name" :to="gotToCourse(course._id)">
                      {{ composeCourseName(course, true) }}
                    </router-link>
                  </div>
                </template>
                <template v-else-if="col.name === 'fee'">
                  <div class="text-weight-bold">{{ col.value }}</div>
                </template>
                <template v-else>{{ col.value }}</template>
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
      </q-card>
    </div>
  </div>
  <div v-else class="text-italic">Pas d'ordres de mission</div>
</template>

<script>
import { ref, toRefs } from 'vue';
import { useQuasar } from 'quasar';
import Button from '@components/Button';
import ResponsiveTable from '@components/table/ResponsiveTable';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import CompaniDate from '@helpers/dates/companiDates';
import { DD_MM_YYYY, DAY } from '@data/constants';
import { formatPrice } from '@helpers/utils';
import { composeCourseName } from '@helpers/courses';
import TrainerMissions from '@api/TrainerMissions';

export default {
  name: 'TrainerMissionTable',
  props: {
    loading: { type: Boolean, default: false },
    trainerMissions: { type: Array, default: () => [] },
    canUpdate: { type: Boolean, default: false },
  },
  components: {
    'ni-button': Button,
    'ni-responsive-table': ResponsiveTable,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const $q = useQuasar();
    const { canUpdate } = toRefs(props);

    const screenWidth = ref(window.innerWidth);
    const pagination = ref({ rowsPerPage: 5, sortBy: 'date', descending: true });
    const columns = ref([
      {
        name: 'date',
        label: 'Date',
        align: 'left',
        field: 'date',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
      },
      {
        name: 'courses',
        label: 'Formation',
        align: 'left',
        field: 'courses',
        style: screenWidth.value > 767 && 'width: 65%',
      },
      {
        name: 'fee',
        label: 'Frais de formateur',
        align: 'center',
        field: 'fee',
        format: formatPrice,
      },
      { name: 'actions', label: '', align: 'right', field: '', style: screenWidth.value > 767 && 'width: 15%' },
    ]);

    const gotToCourse = courseId => ({
      name: canUpdate.value ? 'ni management blended courses info' : 'trainers courses info',
      params: { courseId },
      query: { defaultTab: 'organization' },
    });

    const validateMissionCancellation = (trainerMissionId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir annuler cet ordre de mission&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => cancelTrainerMission(trainerMissionId))
        .onCancel(() => NotifyPositive('Annulation de l\'ordre de mission annulée.'));
    };

    const cancelTrainerMission = async (trainerMissionId) => {
      try {
        await TrainerMissions.update(trainerMissionId, { cancelledAt: CompaniDate().startOf(DAY).toISO() });

        emit('refresh');
        NotifyPositive('Ordre de mission annulé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'annulation de l\'ordre de mission.');
      }
    };

    return {
      // Data
      columns,
      pagination,
      // Methods
      composeCourseName,
      gotToCourse,
      validateMissionCancellation,
    };
  },
};
</script>

<style lang="sass" scoped>
.course
  @media screen and (max-width: 767px)
    text-align: left
  @media screen and (max-width: 840px)
    margin-left: 4px
.course:first-child
  @media screen and (max-width: 767px)
    margin-top: 24px
</style>
