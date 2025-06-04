<template>
  <q-page class="client-background" padding>
    <ni-title-header title="La formation Compani dans ma structure" />
    <div v-if="linkRequests.length" class="bg-yellow-100 q-my-md q-pa-md">
      <p class="text-orange-900 text-weight-bold">Demandes de rattachement à ma structure</p>
      <div class="request-container">
        <company-link-request-cell v-for="request in linkRequests" :key="request._id" :request="request"
          @click="refreshCompanyLinkRequests" />
      </div>
    </div>
    <div class="flex justify-between q-mt-xl">
      <p class="text-weight-bold section-title">Chiffres généraux</p>
      <ni-date-range v-model="dates" class="dates" borders />
    </div>
    <q-card flat class="q-pa-md row">
      <div class="text-weight-bold q-mb-sm col-md-4 col-xs-12 text-copper-grey-700">Le eLearning dans ma structure</div>
      <div class="row justify-around col-md-8 col-xs-12">
        <div class="column items-center">
          <ni-indicator :indicator="activeLearners" />
          <div class="text-center">apprenants actifs</div>
        </div>
        <div class="column items-center">
          <ni-indicator :indicator="activityHistoriesBetweenDates.length" />
          <div class="text-center">activités de eLearning réalisées</div>
        </div>
      </div>
    </q-card>
    <div class="row q-mt-md">
      <div class="col-xs-12 col-md-6 left-card">
        <q-card flat class="fit q-pa-md">
          <div class="text-weight-bold q-mb-sm text-copper-grey-700">Apprenants les plus assidus</div>
          <div class="row justify-end">
            <div class="col-4 text-copper-grey-500 text-center">Activités eLearning réalisées</div>
          </div>
          <div v-for="(learner, index) in learnerList.slice(0, 5)" :key="learner._id"
            class="justify-between items-center row q-my-sm">
            <div class="flex no-wrap items-center col-8">
              <ni-indicator :indicator="index + 1" />
              <img class="q-mx-md avatar" :src="learner.picture ? learner.picture.link : DEFAULT_AVATAR">
              <div class="text-copper-grey-800">{{ formatIdentity(learner.identity, 'FL') }}</div>
            </div>
            <div class="col-4 text-center">{{ learner.activityCount }}</div>
          </div>
        </q-card>
      </div>
      <div class="col-xs-12 col-md-6 right-card">
        <q-card flat class="fit q-pa-md">
          <div class="text-weight-bold q-mb-sm text-copper-grey-700">Formations les plus suivies</div>
          <div class="row justify-end">
            <div class="col-4 text-copper-grey-500 text-center">Nombre d'apprenants actifs</div>
          </div>
          <div v-for="(course, index) in courseList.slice(0, 5)" :key="course.name"
            class="justify-between items-center row q-my-sm">
            <div class="flex no-wrap items-center col-8">
              <ni-indicator :indicator="index + 1" />
              <div class="q-mx-md text-copper-grey-800">{{ upperCaseFirstLetter(course.name) }}</div>
            </div>
            <div class="col-4 text-center">{{ course.activeTraineesCount }}</div>
          </div>
        </q-card>
      </div>
    </div>
    <div class="q-mt-xl">
      <p class="text-weight-bold section-title">Evolution dans le temps</p>
      <div class="row">
        <ni-line-chart :data="traineesByMonth" :labels="monthAxisLabels" title="Apprenants actifs mensuels"
          class="col-md-6 col-xs-12 q-mt-sm line-chart-container" />
        <ni-line-chart :data="activitiesByMonth" :labels="monthAxisLabels"
          title="Nombre total d'activités réalisées par mois" class="col-md-6 col-xs-12 q-mt-sm line-chart-container" />
      </div>
    </div>
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { computed, ref, watch } from 'vue';
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import ActivityHistories from '@api/ActivityHistories';
import CompanyLinkRequests from '@api/CompanyLinkRequests';
import TitleHeader from '@components/TitleHeader';
import DateRange from '@components/form/DateRange';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import Indicator from '@components/courses/Indicator';
import LineChart from '@components/charts/LineChart';
import CompanyLinkRequestCell from '@components/CompanyLinkRequestCell';
import { DEFAULT_AVATAR, DAY, MONTH } from '@data/constants';
import { formatIdentity, upperCaseFirstLetter } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import { useCharts } from '@composables/charts';

export default {
  name: 'CourseDashboard',
  components: {
    'ni-title-header': TitleHeader,
    'ni-date-range': DateRange,
    'ni-indicator': Indicator,
    'ni-line-chart': LineChart,
    'company-link-request-cell': CompanyLinkRequestCell,
  },
  setup () {
    useMeta({ title: 'Tableau de bord des formations' });

    const dates = ref({
      startDate: CompaniDate().subtract('P1M').startOf(DAY).toISO(),
      endDate: CompaniDate().toISO(),
    });
    const activityHistoriesBetweenDates = ref([]);
    const traineesByMonth = ref([]);
    const activitiesByMonth = ref([]);
    const linkRequests = ref([]);

    const activeLearners = computed(() => uniqBy(activityHistoriesBetweenDates.value, 'user._id').length);

    const courseList = computed(() => {
      const usersParticipationsToPrograms = activityHistoriesBetweenDates.value
        .map(aH => aH.activity.steps.map(s => s.subPrograms.map(sP => ({ userId: aH.user._id, program: sP.program }))))
        .flat(3);
      const participationsGroupedByProgram = Object.values(groupBy(usersParticipationsToPrograms, 'program._id'));

      return participationsGroupedByProgram
        .map(group => ({ name: group[0].program.name, activeTraineesCount: new Set(group.map(a => a.userId)).size }))
        .sort((a, b) => b.activeTraineesCount - a.activeTraineesCount);
    });

    const learnerList = computed(() => {
      const groupedByLearners = Object.values(groupBy(activityHistoriesBetweenDates.value, h => h.user._id));

      return groupedByLearners.map(group => ({ ...group[0].user, activityCount: group.length }))
        .sort((a, b) => b.activityCount - a.activityCount);
    });

    const { getCountsByMonth, monthAxisLabels } = useCharts();

    watch(dates, () => getActivityHistories());

    const getActivityHistories = async () => {
      try {
        const { endDate, startDate } = dates.value;
        if (!endDate || CompaniDate(startDate).isAfter(endDate)) return;

        activityHistoriesBetweenDates.value = await ActivityHistories.list({
          startDate,
          endDate: CompaniDate(endDate).endOf(DAY).toISO(),
        });
        NotifyPositive('Données mises à jour.');
      } catch (e) {
        activityHistoriesBetweenDates.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des données.');
      }
    };

    const computeChartsData = async () => {
      try {
        const startDate = CompaniDate().subtract('P6M').startOf(MONTH).toISO();
        const endDate = CompaniDate().subtract('P1M').endOf(MONTH).toISO();
        const sixMonthsHistories = await ActivityHistories.list({ startDate, endDate });

        traineesByMonth.value = getCountsByMonth(sixMonthsHistories, 'user._id');
        activitiesByMonth.value = getCountsByMonth(sixMonthsHistories);
        NotifyPositive('Données mises à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des données.');
      }
    };

    const refreshCompanyLinkRequests = async () => {
      try {
        linkRequests.value = await CompanyLinkRequests.list();
        NotifyPositive('Données mises à jour.');
      } catch (e) {
        linkRequests.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des données.');
      }
    };

    const created = async () => {
      await Promise.all([getActivityHistories(), computeChartsData(), refreshCompanyLinkRequests()]);
    };

    created();

    return {
      // Data
      dates,
      activityHistoriesBetweenDates,
      linkRequests,
      monthAxisLabels,
      traineesByMonth,
      activitiesByMonth,
      DEFAULT_AVATAR,
      // Computed
      activeLearners,
      courseList,
      learnerList,
      // Methods
      formatIdentity,
      upperCaseFirstLetter,
      refreshCompanyLinkRequests,
    };
  },
};
</script>

<style lang="sass" scoped>
.left-card
  @media screen and (min-width: $breakpoint-md-min)
    padding-right: 16px
  @media screen and (max-width: $breakpoint-sm-max)
    padding-bottom: 16px

.rigth-card
  @media screen and (min-width: $breakpoint-md-min)
    padding-left: 16px
  @media screen and (max-width: $breakpoint-sm-max)
    padding-top: 16px

.line-chart-container
  @media screen and (min-width: $breakpoint-sm-max)
    padding-right: 16px

.section-title
  font-size: 24px
  color: $copper-grey-900
.request-container
  flex-direction: row
  grid-auto-flow: row
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(184px, 1fr))
</style>
