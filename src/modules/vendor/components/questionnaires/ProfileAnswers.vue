<template>
  <div v-if="!isLoading">
    <template v-if="isRofOrVendorAdmin">
      <div class="flex justify-end">
        <ni-primary-button class="q-mb-md" label="Exporter les réponses" unelevated icon="import_export"
          @click="exportAnswers" />
      </div>
      <div class="filters-container">
        <ni-select :options="trainerOptions" :model-value="selectedTrainer" @update:model-value="updateSelectedTrainer"
          clearable />
        <ni-select :options="companyOptions" :model-value="selectedCompany" @update:model-value="updateSelectedCompany"
          clearable />
        <ni-select v-if="!isSelfPositionningAnswers" :options="programOptions" :model-value="selectedProgram"
          @update:model-value="updateSelectedProgram" clearable />
        <ni-select :options="holdingOptions" :model-value="selectedHolding" @update:model-value="updateSelectedHolding"
          clearable />
      </div>
      <div class="group-filter-container">
        <ni-select v-if="displayCourseSelect" caption="Groupe de formation" :options="courseOptions"
          :model-value="selectedCourses" @update:model-value="updateSelectedCourses" clearable multiple
          :blur-on-selection="false" />
        <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
      </div>
    </template>
    <q-card v-if="displayGlobalInfos" flat class="q-pa-md">
      <span class="q-pb-md text-weight-bold">Chiffres généraux</span>
      <div class="indicator-container">
        <div class="indicator-cell">
          <ni-indicator :indicator="globalInfo.traineeCount" />
          <span class="text-center">
            {{ formatQuantity('apprenant·e', globalInfo.traineeCount, 's', false ) }} ayant répondu *
          </span>
        </div>
        <div class="indicator-cell">
          <ni-indicator :indicator="globalInfo.historyCount" />
          <span>{{ formatQuantity('réponse', globalInfo.historyCount, 's', false) }}
          <span v-if="isSelfPositionningAnswers">**</span>
          </span>
        </div>
        <div v-if="isSelfPositionningAnswers" class="indicator-cell">
          <ni-indicator :indicator="startAnswersAverage" display-default-indicator />
          <span class="text-center">de moyenne pour les réponses au questionnaire de début</span>
        </div>
        <div v-if="isSelfPositionningAnswers" class="indicator-cell">
          <ni-indicator :indicator="endAnswersAverage" display-default-indicator />
          <span class="text-center">de moyenne pour les réponses au questionnaire de fin</span>
        </div>
      </div>
      <div class="q-pt-lg global-info-description">
        <span>
          * apprenant·es ayant répondu : prend en compte les apprenant·es ayant répondu au moins une fois au
          questionnaire
        </span>
        <span v-if="isSelfPositionningAnswers">
          ** réponses : {{ formatQuantity('réponse', startAnswersCount) }} au questionnaire de début et
          {{ formatQuantity('réponse', endAnswersCount) }} au questionnaire de fin
        </span>
      </div>
    </q-card>
    <template v-if="hasFilteredAnswers">
      <div v-if="isSelfPositionningAnswers" class="sp-answers-container">
        <questionnaire-answers-container title="Début de formation" :cards="startAnswers" />
        <questionnaire-answers-container title="Fin de formation" :cards="endAnswers" />
      </div>
      <template v-else>
        <questionnaire-answers-container :cards="cards" />
      </template>
    </template>
    <template v-else>
      <span class="text-italic">Aucune réponse ne correspond aux filtres sélectionnés</span>
    </template>
  </div>
  <q-inner-loading :showing="isLoading">
    <q-spinner-facebook size="30px" color="primary" />
  </q-inner-loading>
</template>

<script>
import { computed, toRefs, ref, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import uniq from 'lodash/uniq';
import keyBy from 'lodash/keyBy';
import uniqBy from 'lodash/uniqBy';
import mapValues from 'lodash/mapValues';
import pick from 'lodash/pick';
import Questionnaires from '@api/Questionnaires';
import Holdings from '@api/Holdings';
import Users from '@api/Users';
import Companies from '@api/Companies';
import Programs from '@api/Programs';
import Select from '@components/form/Select';
import {
  formatAndSortIdentityOptions,
  formatAndSortOptions,
  formatStringForExport,
  formatQuantity,
} from '@helpers/utils';
import { composeCourseName } from '@helpers/courses';
import CompaniDate from '@helpers/dates/companiDates';
import { downloadCsv } from '@helpers/file';
import { add, divide, toFixedToFloat } from '@helpers/numbers';
import { NotifyNegative } from '@components/popup/notify';
import PrimaryButton from '@components/PrimaryButton';
import Indicator from '@components/courses/Indicator';
import QuestionnaireAnswersContainer from 'src/modules/vendor/components/questionnaires/QuestionnaireAnswersContainer';
import {
  TRAINER,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  INTRA,
  INTRA_HOLDING,
  YES,
  NO,
  SURVEY,
  OPEN_QUESTION,
  DD_MM_YYYY,
  NO_DATA,
  QUESTION_ANSWER,
  START_COURSE,
  END_COURSE,
} from '@data/constants';

export default {
  name: 'ProfileAnswers',
  components: {
    'ni-indicator': Indicator,
    'ni-select': Select,
    'ni-primary-button': PrimaryButton,
    'questionnaire-answers-container': QuestionnaireAnswersContainer,
  },
  props: {
    profileId: { type: String, required: true },
    isSelfPositionningAnswers: { type: Boolean, default: false },
    course: { type: Object, default: () => ({}) },
  },
  setup (props) {
    const { profileId, course, isSelfPositionningAnswers } = toRefs(props);

    const $store = useStore();

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const isRofOrVendorAdmin = computed(() => [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER]
      .includes(loggedUser.value.role.vendor.name));

    const questionnaireAnswers = ref({});
    const selectedTrainer = ref('');
    const trainerOptions = ref([]);
    const selectedCompany = ref('');
    const companyOptions = ref([]);
    const selectedProgram = ref('');
    const programOptions = ref([]);
    const selectedHolding = ref('');
    const holdingOptions = ref([]);
    const holdingCompanies = ref([]);
    const selectedCourses = ref(get(course.value, '_id') ? [course.value._id] : []);
    const isLoading = ref(false);

    const filteredAnswers = computed(() => {
      if (!get(questionnaireAnswers.value, 'followUp')) return {};

      return { ...questionnaireAnswers.value, followUp: questionnaireAnswers.value.followUp.map(formatFollowUp) };
    });

    const hasFilteredAnswers = computed(() => get(filteredAnswers.value, 'followUp', [])
      .flatMap(a => a.answers).length > 0);

    const displayCourseSelect = computed(() => (selectedTrainer.value || selectedCompany.value ||
      selectedHolding.value || selectedProgram.value) && !!hasFilteredAnswers.value);

    const courseOptions = computed(() => {
      const options = [];

      if (displayCourseSelect.value && get(filteredAnswers.value, 'followUp')) {
        const answers = questionnaireAnswers.value.followUp.map(fu => fu.answers
          .filter(a => !selectedTrainer.value || (get(a, 'course.trainers', []).includes(selectedTrainer.value)))
          .filter(a => !selectedCompany.value || (a.traineeCompany === selectedCompany.value))
          .filter(a => !selectedProgram.value || (get(a, 'course.subProgram.program._id') === selectedProgram.value))
          .filter(a => !selectedHolding.value ||
            ((holdingCompanies.value[selectedHolding.value]).includes(a.traineeCompany))))
          .flat();

        options.push(...uniqBy(
          answers.map(a => ({ _id: a.course._id, name: composeCourseName(a.course, true) })),
          'name'
        ));
      }

      return formatAndSortOptions(options, 'name');
    });

    const cards = computed(() => get(filteredAnswers.value, 'followUp', [])
      .map(fu => ({ ...fu, answers: fu.answers.map(a => a.answer) })));

    const displayGlobalInfos = computed(() => isRofOrVendorAdmin.value && hasFilteredAnswers.value);

    const startAnswers = computed(() => get(filteredAnswers.value, 'followUp', [])
      .map(fu => ({
        ...fu,
        answers: fu.answers
          .filter(a => a.timeline === START_COURSE)
          .map(a => a.answer),
      })));

    const startAnswersCount = computed(() => {
      const maxTraineeCountAnswer = startAnswers.value.reduce(
        (accumulator, answer) => (answer.answers.length >= accumulator.answers.length ? answer : accumulator),
        startAnswers.value[0]
      );

      return get(maxTraineeCountAnswer, 'answers', []).length;
    });

    const startAnswersAverage = computed(() => {
      const answers = startAnswers.value
        .filter(fu => fu.template === SURVEY)
        .flatMap(startAnswer => startAnswer.answers);
      const average = answers.length
        ? divide(answers.reduce((accumulator, answer) => add(accumulator, answer), 0), answers.length)
        : 0;

      return toFixedToFloat(average, 2);
    });

    const endAnswers = computed(() => get(filteredAnswers.value, 'followUp', [])
      .map(fu => ({
        ...fu,
        answers: fu.answers
          .filter(a => a.timeline === END_COURSE)
          .map(a => a.answer),
      })));

    const endAnswersAverage = computed(() => {
      const answers = endAnswers.value.filter(fu => fu.template === SURVEY).flatMap(endAnswer => endAnswer.answers);
      const average = answers.length
        ? divide(answers.reduce((accumulator, answer) => add(accumulator, answer), 0), answers.length)
        : 0;

      return toFixedToFloat(average, 2);
    });

    const endAnswersCount = computed(() => {
      const maxTraineeCountAnswer = endAnswers.value.reduce(
        (accumulator, answer) => (answer.answers.length >= accumulator.answers.length ? answer : accumulator),
        endAnswers.value[0]
      );

      return get(maxTraineeCountAnswer, 'answers', []).length;
    });

    const globalInfo = computed(() => {
      const maxHistoryCountCard = cards.value
        .reduce(
          (accumulator, card) => (card.historyCount >= accumulator.historyCount ? card : accumulator),
          cards.value[0]
        );

      return pick(maxHistoryCountCard, ['historyCount', 'traineeCount']);
    });

    const getQuestionnaireAnswers = async () => {
      try {
        const query = isRofOrVendorAdmin.value ? {} : { course: course.value._id };
        questionnaireAnswers.value = await Questionnaires.getQuestionnaireAnswers(profileId.value, query);
      } catch (e) {
        questionnaireAnswers.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des réponses au questionnaire.');
      }
    };

    const getTrainerOptions = async () => {
      try {
        const trainers = await Users.list({ role: [TRAINER, TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN] });
        trainerOptions.value = [
          { label: 'Tous les intervenants', value: '' },
          ...formatAndSortIdentityOptions(trainers),
        ];
      } catch (e) {
        trainerOptions.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des formateurs.');
      }
    };

    const getCompanyOptions = async () => {
      try {
        const companies = await Companies.list();
        companyOptions.value = [
          { label: 'Toutes les structures', value: '' },
          ...formatAndSortOptions(companies, 'name'),
        ];
      } catch (e) {
        companyOptions.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des structures.');
      }
    };

    const getProgramOptions = async () => {
      try {
        const programs = await Programs.list();
        programOptions.value = [{ label: 'Tous les programmes', value: '' }, ...formatAndSortOptions(programs, 'name')];
      } catch (e) {
        programOptions.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des programmes.');
      }
    };

    const getHoldingOptions = async () => {
      try {
        const holdings = await Holdings.list();
        holdingOptions.value = [
          { label: 'Toutes les sociétés mères', value: '' },
          ...formatAndSortOptions(holdings, 'name'),
        ];

        holdingCompanies.value = mapValues(keyBy(holdings, '_id'), 'companies');
      } catch (e) {
        holdingOptions.value = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des programmes.');
      }
    };

    const updateSelectedTrainer = (trainerId) => { selectedTrainer.value = trainerId; };

    const updateSelectedCompany = (companyId) => { selectedCompany.value = companyId; };

    const updateSelectedProgram = (programId) => { selectedProgram.value = programId; };

    const updateSelectedHolding = (holdingId) => { selectedHolding.value = holdingId; };

    const updateSelectedCourses = (courseIds) => { selectedCourses.value = courseIds; };

    const formatFollowUp = (fu) => {
      const answers = fu.answers
        .filter(a => !selectedTrainer.value || (get(a, 'course.trainers', []).includes(selectedTrainer.value)))
        .filter(a => !selectedCompany.value || (a.traineeCompany === selectedCompany.value))
        .filter(a => !selectedProgram.value || (get(a, 'course.subProgram.program._id') === selectedProgram.value))
        .filter(a => !selectedHolding.value ||
          ((holdingCompanies.value[selectedHolding.value]).includes(a.traineeCompany)))
        .filter(a => !selectedCourses.value.length || (selectedCourses.value.includes(get(a, 'course._id'))));

      return {
        ...fu,
        answers,
        traineeCount: uniq(answers.map(a => a.trainee)).length,
        historyCount: uniq(answers.map(a => a.history)).length,
      };
    };

    const resetFilters = () => {
      selectedTrainer.value = '';
      selectedCompany.value = '';
      selectedProgram.value = '';
      selectedHolding.value = '';
      selectedCourses.value = [];
    };

    const getTraineeAnswer = (followUp, answer) => {
      if ([SURVEY, OPEN_QUESTION].includes(followUp.template)) return formatStringForExport(answer);
      if (followUp.template === QUESTION_ANSWER) return get(followUp.qcAnswers.find(a => a._id === answer), 'text');

      return '';
    };

    const getCsvName = () => {
      let fileName = `Réponses_questionnaire_${CompaniDate().format(DD_MM_YYYY)}`;

      if (selectedTrainer.value) {
        const trainer = trainerOptions.value.find(t => t.value === selectedTrainer.value).label;
        fileName += `_${trainer}`;
      }
      if (selectedCompany.value) {
        const company = companyOptions.value.find(c => c.value === selectedCompany.value).label;
        fileName += `_${company}`;
      }
      if (selectedProgram.value) {
        const program = programOptions.value.find(p => p.value === selectedProgram.value).label;
        fileName += `_${program}`;
      }
      if (selectedHolding.value) {
        const holding = holdingOptions.value.find(h => h.value === selectedHolding.value).label;
        fileName += `_${holding}`;
      }

      return fileName;
    };

    const formatAnswerTimeline = (timeline) => {
      switch (timeline) {
        case START_COURSE:
          return 'Début de formation';
        case END_COURSE:
          return 'Fin de formation';
        default:
          return '';
      }
    };

    const exportAnswers = () => {
      const answersRowsToExport = [];
      if (filteredAnswers.value.followUp.length) {
        for (const fu of filteredAnswers.value.followUp) {
          for (const a of fu.answers) {
            answersRowsToExport.push({
              Question: formatStringForExport(fu.question),
              'Réponse de l\'apprenant': getTraineeAnswer(fu, a.answer),
              'Question à choix multiples': fu.isQuestionAnswerMultipleChoiced ? YES : NO,
              'Date de réponse': CompaniDate(a.createdAt).format(DD_MM_YYYY),
              'Id de la formation': get(a, 'course._id'),
              ...(isSelfPositionningAnswers.value && { 'Période de la formation': formatAnswerTimeline(a.timeline) }),
            });
          }
        }
      }

      const fileName = getCsvName();

      return downloadCsv(
        answersRowsToExport.length
          ? [Object.keys(answersRowsToExport[0]), ...answersRowsToExport.map(a => Object.values(a))]
          : [[NO_DATA]],
        `${fileName}.csv`
      );
    };

    const created = async () => {
      try {
        isLoading.value = true;

        if (isRofOrVendorAdmin.value) {
          await Promise.all([
            getQuestionnaireAnswers(),
            getTrainerOptions(),
            getCompanyOptions(),
            getProgramOptions(),
            getHoldingOptions(),
          ]);

          if (get(course.value, '_id')) {
            selectedTrainer.value = course.value.trainers.length === 1 ? course.value.trainers[0]._id : '';
            selectedCompany.value = course.value.type === INTRA ? course.value.companies[0]._id : '';
            selectedProgram.value = course.value.subProgram.program._id;
            selectedHolding.value = course.value.type === INTRA_HOLDING ? course.value.holding : '';
            await nextTick();
            selectedCourses.value = [course.value._id];
          }
        } else {
          await getQuestionnaireAnswers();

          if (get(course.value, '_id')) selectedCourses.value = [course.value._id];
        }
      } catch (e) {
        console.error(e);
      } finally {
        isLoading.value = false;
      }
    };

    created();

    watch(profileId, async () => {
      await created();
      if (!course.value) resetFilters();
    });

    watch(selectedCompany, () => updateSelectedCourses([]));
    watch(selectedHolding, () => updateSelectedCourses([]));
    watch(selectedProgram, () => updateSelectedCourses([]));
    watch(selectedTrainer, () => updateSelectedCourses([]));

    return {
      // Data
      questionnaireAnswers,
      selectedTrainer,
      trainerOptions,
      selectedCompany,
      companyOptions,
      selectedProgram,
      programOptions,
      selectedHolding,
      holdingOptions,
      selectedCourses,
      isLoading,
      // Computed
      filteredAnswers,
      displayCourseSelect,
      courseOptions,
      isRofOrVendorAdmin,
      hasFilteredAnswers,
      displayGlobalInfos,
      cards,
      startAnswers,
      endAnswers,
      globalInfo,
      startAnswersAverage,
      endAnswersAverage,
      startAnswersCount,
      endAnswersCount,
      // Methods
      getQuestionnaireAnswers,
      getTrainerOptions,
      getCompanyOptions,
      getProgramOptions,
      updateSelectedTrainer,
      updateSelectedCompany,
      updateSelectedProgram,
      updateSelectedHolding,
      resetFilters,
      updateSelectedCourses,
      exportAnswers,
      formatQuantity,
    };
  },
};
</script>

<style lang="sass" scoped>
.filters-container
  display: grid
  grid-auto-flow: column
  grid-template-columns: auto
  @media screen and (max-width: 767px)
    grid-auto-flow: row
    grid-template-rows: auto

.group-filter-container
  flex-direction: column
  @media screen and (max-width: 767px)
    width: 95%

.sp-answers-container
  display: flex
  flex: 1
  gap: 20px
  @media screen and (max-width: 767px)
    flex-direction: column
  & > div
    flex: 1
    display: flex
    flex-direction: column

.global-info-description
  font-size: 12px
  font-style: italic
  display: flex
  flex-direction: column

.indicator-container
  display: flex
  flex-direction: row
  justify-content: space-evenly
  @media screen and (max-width: 767px)
    flex-direction: column
    align-items: center

.indicator-cell
  display: flex
  flex-direction: column
  align-items: center
  max-width: 15vw
  @media screen and (max-width: 767px)
    max-width: 50vw
</style>
