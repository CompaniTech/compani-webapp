<template>
  <q-card class="card" flat>
     <div class="header">
      <span class="text-weight-bold flex-1">{{ card.question }}</span>
      <ni-bi-color-button class="q-ml-sm" icon="content_copy" label="Copier les réponses &quot;Autre&quot;"
        @click="copyAnswers" size="14px" :disable="!otherAnswers.length" />
    </div>
    <div class="q-mb-lg subtitle">{{ subtitle }}</div>
    <div v-for="(line, index) in lines" :key="index" class="q-mt-sm bar-container">
      <div class="q-mr-sm percentage">{{ formatPercentage(line.percentage) }}</div>
      <q-linear-progress size="40px" :value="line.percentage" rounded class="text-peach-200 bg-peach-100">
        <div class="bar-label">
          <div>{{ line.title }}</div>
          <div><span class="text-weight-bold">{{ line.total }}</span> réponses</div>
        </div>
      </q-linear-progress>
    </div>
    <ni-table-list v-if="otherAnswers.length" :data="otherAnswers" :columns="columns" v-model:pagination="pagination"
      hide-header disabled :rows-per-page-options="rowsPerPageOptions">
      <template #body="{ col }">
        <q-item-section class="bg-peach-100 answer">{{ col.value }}</q-item-section>
      </template>
    </ni-table-list>
  </q-card>
</template>

<script>
import { toRefs, computed, ref } from 'vue';
import { copyToClipboard } from 'quasar';
import BiColorButton from '@components/BiColorButton';
import TableList from '@components/table/TableList';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import { formatPercentage, isObjectId } from '@helpers/utils';

export default {
  name: 'QuestionAnswerChart',
  props: {
    card: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-table-list': TableList,
    'ni-bi-color-button': BiColorButton,
  },
  setup (props) {
    const { card } = toRefs(props);

    const columns = ref([{ name: 'answer', field: 'answer', align: 'left' }]);
    const pagination = ref({ page: 1, rowsPerPage: 10 });
    const rowsPerPageOptions = ref([10, 20, 50, 100]);

    const subtitle = computed(() => `Question à choix
      ${card.value.isQuestionAnswerMultipleChoiced ? 'multiple' : 'simple'} : ${card.value.traineeCount} répondants
      pour ${card.value.historyCount} réponses`);

    const otherAnswers = computed(() => card.value.answers.filter(a => !isObjectId(a)).map(a => ({ answer: a })));

    const lines = computed(() => {
      const answersData = card.value.qcAnswers.map((pa) => {
        const total = card.value.answers.filter(a => a === pa._id).length;

        return { title: pa.text, total, percentage: total / card.value.answers.length || 0 };
      });

      if (card.value.allowOtherAnswer) {
        const total = otherAnswers.value.length;
        answersData.push({ title: 'Autre', total, percentage: total / card.value.answers.length || 0 });
      }
      return answersData;
    });

    const copyAnswers = () => {
      copyToClipboard(otherAnswers.value.map(a => a.answer).join(' \n'))
        .then(() => NotifyPositive('Réponses copiées !'))
        .catch(() => NotifyNegative('Erreur lors de la copie des réponses.'));
    };

    return {
      // Data
      columns,
      rowsPerPageOptions,
      pagination,
      // Computed
      subtitle,
      lines,
      otherAnswers,
      // Methods
      formatPercentage,
      copyAnswers,
    };
  },
};
</script>

<style lang="sass" scoped>
.card
  padding: 16px 32px

.header
  display: flex
  flex-direction: row
  align-items: start
  margin: 8px 0px 0px 0px

.subtitle
  color: $copper-grey-800
  font-size: 14px

.percentage
  text-align: center
  width: 56px

.bar-container
  display: flex
  align-items: center

:deep(.q-linear-progress__track)
  opacity: 0

.bar-label
  font-size: 14px
  position: absolute
  color: $copper-grey-700
  display: flex
  justify-content: space-between
  width: 100%
  align-items: center
  height: 100%
  padding: 0 24px

.answer
  padding: 12px

:deep(.table-list)
  padding: 20px 0px 0px 56px
  .q-table
    border-spacing: 0px
  & tbody
    & td
      padding: 0px
      .q-item__section--main
        font-size: 12px
  & .q-btn-toggle
    background-color: $copper-grey-100
</style>
