<template>
  <div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Utilisation du eLearning</p>
      <div class="row justify-between">
        <div class="col-md-6 col-xs-12 global-view-container">
          <q-card flat class="q-pa-md right-stats global-view column">
            <div class="text-weight-bold">Vue globale</div>
            <div class="self-center justify-center column learners-data">
              <div class="row items-center">
                <ni-indicator :indicator="eLearningCoursesOnGoing.length" class="q-pr-sm" />
                <div>{{ eLearningCoursesOnGoingText }}</div>
              </div>
              <div class="row items-center">
                <ni-indicator :indicator="eLearningCoursesCompleted.length" class="q-pr-sm" />
                <div>{{ eLearningCoursesCompletedText }}</div>
              </div>
              <div class="row items-center">
                <ni-indicator :indicator="eLearningActivitiesCompleted.length" class="q-pr-sm" />
                <div>{{ eLearningActivitesCompletedText }}</div>
              </div>
            </div>
          </q-card>
        </div>
        <ni-line-chart :data="activitiesByMonth" :labels="monthAxisLabels"
          class="col-md-6 col-xs-12 line-chart-container" title="Nombre total d'activités réalisées par mois" />
      </div>
    </div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Formations suivies</p>
      <q-card>
        <ni-expanding-table :data="traineeCourses" :columns="courseColumns" :loading="loading"
          v-model:pagination="traineePagination">
          <template #row="{ props }">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <template v-if="col.name === 'attendances' && has(col, 'value.attendanceDuration')">
                <div>
                  {{ CompaniDuration(get(col, 'value.attendanceDuration')).format(SHORT_DURATION_H_MM) }}
                  / {{ CompaniDuration(get(col, 'value.maxDuration')).format(SHORT_DURATION_H_MM) }}
                  </div>
              </template>
              <template v-else-if="col.name === 'eLearning' && col.value >= 0">
                <ni-progress class="q-ml-lg" :value="col.value" />
              </template>
              <template v-else-if="col.name === 'expand'">
                <q-icon :name="props.expand ? 'expand_less' : 'expand_more'" />
              </template>
              <template v-else-if="col.name === 'name'">
                <div @click="$event.stopPropagation()">
                  <router-link :to="goToCourseProfile(props, TRAINEE)" class="clickable-name">
                    {{ col.value }}
                  </router-link>
                </div>
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </template>
          <template #expanding-row="{ props }">
            <q-td colspan="100%">
              <div v-if="props.row.subProgram.liveSteps.length" class="text-weight-bold q-mb-sm">Présences</div>
              <div v-for="step in props.row.subProgram.liveSteps" :key="step._id" :props="props" class="q-mb-sm">
                <div v-for="slot in step.slots" :key="slot._id" class="q-ml-md slots">
                  <q-icon :name="getStepTypeIcon(step.type)" />
                  <div class="step-name">{{ step.name }}</div>
                  <div class="dates">{{ CompaniDate(slot.startDate).format(DD_MM_YYYY) }}</div>
                  <div class="hours">{{ formatSlotSchedule(slot) }}</div>
                  <div v-if="hasSlotPresences(slot)">
                    <q-icon size="12px" name="check_circle" color="green-600 attendance" />
                    <span class="text-green-600">Présent(e)</span>
                  </div>
                  <div v-else-if="hasSlotAbsences(slot)">
                    <q-icon size="12px" name="fas fa-times-circle" color="orange-700 attendance" />
                    <span class="text-orange-700">Absent(e)</span>
                  </div>
                  <div v-else-if="CompaniDate().isBefore(slot.endDate)" class="attendance">
                    <span class="q-mx-sm text-italic text-copper-grey-800">à venir</span>
                  </div>
                  <div v-else>
                    <span class="q-mx-sm text-italic text-copper-grey-800">non rempli</span>
                  </div>
                </div>
              </div>
              <div v-if="props.row.subProgram.elearningSteps.length" class="text-weight-bold q-my-sm">
                Complétion eLearning
              </div>
              <div v-for="step in props.row.subProgram.elearningSteps" :key="step._id" class="q-mb-xs q-ml-md row"
                :props="props">
                <q-icon name="stay_current_portrait" />
                <div class="col-9">{{ step.name }}</div>
                <ni-progress class="expanding-table-sub-progress col-2" :value="step.progress.eLearning" />
              </div>
            </q-td>
          </template>
        </ni-expanding-table>
      </q-card>
    </div>
    <div v-if="tutorCourses.length" class="q-mb-xl">
      <p class="text-weight-bold">Formations en tant que tuteur</p>
      <q-card>
        <ni-expanding-table :data="tutorCourses" :columns="courseNameColumn" :loading="loading"
          v-model:pagination="tutorPagination">
          <template #row="{ props }">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <router-link :to="goToCourseProfile(props)" class="clickable-name">{{ col.value }}</router-link>
            </q-td>
          </template>
        </ni-expanding-table>
      </q-card>
    </div>
    <div v-if="unsubscribedAttendances.length" class="q-mb-xl">
      <p class="text-weight-bold q-mb-sm">Emargements non prévus</p>
      <div class="text-italic q-my-xs">
        {{ formatIdentity(userProfile.identity, 'FL') }} a émargé dans certaines formations sans inscription.
      </div>
      <ni-expanding-table :data="unsubscribedAttendances" :columns="attendanceColumns"
        :pagination="attendancePagination" :hide-bottom="false" :loading="loading">
        <template #expanding-row="{ props }">
          <q-td colspan="100%">
            <div v-for="attendance in props.row.attendances" :key="attendance._id" :props="props"
              class="q-ma-sm expanding-table-expanded-row">
              <div class="dates">{{ attendance.date }}</div>
              <div class="hours">{{ attendance.hours }}</div>
              <div class="misc">{{ attendance.misc }}</div>
              <div class="trainers">{{ attendance.trainers }}</div>
            </div>
          </q-td>
        </template>
      </ni-expanding-table>
    </div>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { computed, ref } from 'vue';
import get from 'lodash/get';
import has from 'lodash/has';
import uniqBy from 'lodash/uniqBy';
import Courses from '@api/Courses';
import Attendances from '@api/Attendances';
import {
  BLENDED,
  E_LEARNING,
  STRICTLY_E_LEARNING,
  ON_SITE,
  REMOTE,
  PEDAGOGY,
  SHORT_DURATION_H_MM,
  DD_MM_YYYY,
  MONTH,
  DAY,
  TRAINEE,
  PRESENT,
  MISSING,
} from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { getISOTotalDuration, ascendingSort } from '@helpers/dates/utils';
import { sortStrings, formatIdentity } from '@helpers/utils';
import { getStepTypeIcon, formatSlotSchedule } from '@helpers/courses';
import LineChart from '@components/charts/LineChart';
import Progress from '@components/CourseProgress';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import ExpandingTable from '@components/table/ExpandingTable';
import Indicator from '@components/courses/Indicator';
import { useCourses } from '@composables/courses';
import { useCharts } from '@composables/charts';

export default {
  name: 'ProfileCourses',
  components: {
    'ni-progress': Progress,
    'ni-expanding-table': ExpandingTable,
    'ni-indicator': Indicator,
    'ni-line-chart': LineChart,
  },
  setup () {
    const $store = useStore();

    const { isVendorInterface, isClientInterface } = useCourses();
    const { getCountsByMonth, monthAxisLabels } = useCharts();
    const traineeCourses = ref([]);
    const tutorCourses = ref([]);
    const activitiesByMonth = ref([]);
    const loading = ref(false);
    const traineePagination = ref({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 15 });
    const tutorPagination = ref({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 15 });
    const attendancePagination = ref({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 15 });
    const courseNameColumn = ref([{
      name: 'name',
      label: 'Nom',
      field: row => row,
      align: 'left',
      sortable: true,
      format: value => (get(value, 'subProgram.program.name') || '') + (value.misc ? ` - ${value.misc}` : ''),
      sort: (a, b) => sortStrings(
        get(a, 'subProgram.program.name') + a.misc || '',
        get(b, 'subProgram.program.name') + b.misc || ''
      ),
      style: 'width: 30%',
    }]);
    const courseColumns = ref([
      ...courseNameColumn.value,
      {
        name: 'type',
        label: 'Type de formation',
        field: 'format',
        align: 'left',
        sortable: true,
        format: value => ((value === BLENDED) ? 'Mixte' : 'ELearning'),
        sort: sortStrings,
      },
      { name: 'attendances', label: 'Emargements', field: row => get(row, 'progress.presence'), align: 'center' },
      {
        name: 'eLearning',
        label: 'eLearning',
        field: row => get(row, 'progress.eLearning'),
        align: 'center',
        sortable: true,
        style: 'min-width: 150px; width: 20%',
      },
      { name: 'expand', label: '', field: '_id' },
    ]);
    const attendanceColumns = ref([
      { name: 'name', label: 'Nom', field: 'program', align: 'left' },
      { name: 'unexpectedAttendances', label: 'Emargements imprévus', field: 'attendancesCount', align: 'center' },
      { name: 'duration', label: 'Durée', field: 'duration', align: 'center' },
      { name: 'expand', label: '', field: '' },
    ]);
    const unsubscribedAttendances = ref([]);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const userProfile = computed(() => $store.state.userProfile.userProfile);

    const eLearningCourses = computed(() => traineeCourses.value.filter(c => c.format === STRICTLY_E_LEARNING) || []);

    const eLearningCoursesOnGoing = computed(() => eLearningCourses.value.filter(c => c.progress.eLearning < 1) || []);

    const eLearningCoursesOnGoingText = computed(() => {
      const formation = eLearningCoursesOnGoing.value.length > 1 ? 'formations' : 'formation';
      return `${formation} eLearning en cours`;
    });

    const eLearningCoursesCompleted = computed(() => eLearningCourses.value
      .filter(course => course.progress.eLearning === 1) || []);

    const eLearningCoursesCompletedText = computed(() => (eLearningCoursesCompleted.value.length > 1
      ? 'formations eLearning terminées'
      : 'formation eLearning terminée'));

    const eLearningActivitiesCompleted = computed(() => {
      const activityHistories = traineeCourses.value
        .map(c => c.subProgram.steps.map(s => s.activities.map(a => a.activityHistories).flat()).flat())
        .flat();

      return uniqBy(activityHistories, '_id');
    });

    const eLearningActivitesCompletedText = computed(() => (eLearningActivitiesCompleted.value.length > 1
      ? 'activités eLearning réalisées'
      : 'activité eLearning réalisée'));

    const goToCourseProfile = (props, role) => {
      if (!isVendorInterface && props.row.subProgram.isStrictlyELearning) {
        return { name: 'ni elearning courses info', params: { courseId: props.row._id } };
      }

      if (!isVendorInterface) {
        return {
          name: 'ni courses info',
          params: { courseId: props.row._id },
          query: { defaultTab: role === TRAINEE ? 'traineeFollowUp' : 'organization' },
        };
      }

      if (props.row.subProgram.isStrictlyELearning) {
        return { name: 'ni management elearning courses info', params: { courseId: props.row._id } };
      }

      return {
        name: 'ni management blended courses info',
        params: { courseId: props.row._id },
        query: { defaultTab: role === TRAINEE ? 'traineeFollowUp' : 'organization' },
      };
    };

    const getUserCourses = async () => {
      try {
        loading.value = true;
        const loggedUserHolding = get(loggedUser.value, 'holding._id');

        const { tutorCourses: tutorCourseList, traineeCourses: traineeCourseList } = await Courses.list({
          trainee: userProfile.value._id,
          action: PEDAGOGY,
          ...(isClientInterface && {
            ...loggedUserHolding ? { holding: loggedUserHolding } : { company: loggedUser.value.company._id },
          }),
        });

        tutorCourses.value = tutorCourseList;
        traineeCourses.value = traineeCourseList.map(course => ({
          ...course,
          subProgram: {
            ...course.subProgram,
            elearningSteps: course.subProgram.steps.filter(step => step.type === E_LEARNING),
            liveSteps: course.subProgram.steps.filter(step => [ON_SITE, REMOTE].includes(step.type)),
          },
        }));
      } catch (e) {
        NotifyNegative('Erreur lors de la récupération des formations');
        console.error(e);
        traineeCourses.value = [];
        tutorCourses.value = [];
      } finally {
        loading.value = false;
      }
    };

    const computeChartsData = async () => {
      loading.value = true;
      try {
        const startDate = CompaniDate().startOf(MONTH).subtract('P6M').toISO();
        const endDate = CompaniDate().endOf(MONTH).toISO();

        const filteredActivities = eLearningActivitiesCompleted.value
          .filter(ah => CompaniDate(ah.date).isSameOrBetween(startDate, endDate, DAY));

        activitiesByMonth.value = getCountsByMonth(filteredActivities);
        NotifyPositive('Données mises à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des données.');
      } finally {
        loading.value = false;
      }
    };

    const formatProgramAttendances = (attendancesGroupedByProgram, programId) => ({
      _id: programId,
      program: attendancesGroupedByProgram[programId][0].program.name,
      attendancesCount: attendancesGroupedByProgram[programId].length,
      duration: CompaniDuration(getISOTotalDuration(attendancesGroupedByProgram[programId].map(a => a.courseSlot)))
        .format(SHORT_DURATION_H_MM),
      attendances: attendancesGroupedByProgram[programId]
        .sort((a, b) => ascendingSort(a.courseSlot.startDate, b.courseSlot.startDate))
        .map(a => ({
          _id: a._id,
          date: CompaniDate(a.courseSlot.startDate).format(DD_MM_YYYY),
          hours: formatSlotSchedule(a.courseSlot),
          trainers: get(a, 'course.trainers', []).map(t => formatIdentity(t.identity, 'FL')).join(', '),
          misc: a.course.misc,
        })),
    });

    const getUnsubscribedAttendances = async () => {
      try {
        const query = { trainee: userProfile.value._id };
        const unsubscribedAttendancesGroupedByPrograms = await Attendances.listUnsubscribed(query);
        unsubscribedAttendances.value = Object.keys(unsubscribedAttendancesGroupedByPrograms)
          .map(programId => formatProgramAttendances(unsubscribedAttendancesGroupedByPrograms, programId));
      } catch (e) {
        console.error(e);
        unsubscribedAttendances.value = [];
        NotifyNegative('Erreur lors de la récupération des émargements non prévus.');
      }
    };

    const hasSlotPresences = slot => slot.attendances.find(a => a.status === PRESENT);
    const hasSlotAbsences = slot => slot.attendances.find(a => a.status === MISSING);

    const created = async () => {
      await getUserCourses();
      computeChartsData();
      getUnsubscribedAttendances();
    };

    created();

    return {
      // Data
      traineeCourses,
      tutorCourses,
      loading,
      traineePagination,
      tutorPagination,
      attendancePagination,
      courseColumns,
      courseNameColumn,
      attendanceColumns,
      unsubscribedAttendances,
      activitiesByMonth,
      monthAxisLabels,
      DD_MM_YYYY,
      SHORT_DURATION_H_MM,
      TRAINEE,
      // Computed
      userProfile,
      eLearningCoursesOnGoing,
      eLearningCoursesOnGoingText,
      eLearningCoursesCompleted,
      eLearningCoursesCompletedText,
      eLearningActivitiesCompleted,
      eLearningActivitesCompletedText,
      // Methods
      formatIdentity,
      get,
      has,
      goToCourseProfile,
      getStepTypeIcon,
      formatSlotSchedule,
      CompaniDate,
      CompaniDuration,
      hasSlotPresences,
      hasSlotAbsences,
    };
  },
};
</script>

<style lang="sass" scoped>

.right-stats
  margin-right: 8px
  @media screen and (max-width: 599px)
    margin-right: 0px
    margin-bottom: 8px

.global-view
  height: 100%
  &-container
    @media screen and (min-width: $breakpoint-sm-max)
      padding-right: 16px
.line-chart-container
  @media screen and (max-width: $breakpoint-sm-max)
    margin-top: 16px

.learners-data
  flex: 1
.step-progress
  align-items: center
  justify-content: space-between
  width: 20%
  margin: 0px 24px
  flex-direction: row
  display: flex
  color: $primary

.slots
  @media screen and (min-width: 767px)
    display: flex

.step-name
  @media screen and (min-width: 767px)
    width: 50%

.dates
  @media screen and (min-width: 767px)
    width: 10%

.hours
  @media screen and (min-width: 767px)
    width: 15%

.attendance
  @media screen and (min-width: 767px)
    width: 15%

.expanding-table-expanded-row
  justify-content: flex-start
  div
    justify-content: center
    align-items: center
    justify-content: flex-start
    margin-right: 2%
    word-break: break-word

.trainers
  display: inline-block
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.misc
  width: 15%
</style>
