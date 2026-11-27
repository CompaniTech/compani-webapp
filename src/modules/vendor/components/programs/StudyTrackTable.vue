<template>
  <div>
    <div class="summary-bar">
      <label class="row items-center no-wrap">
        <span class="q-mr-sm">Durée du parcours</span>
        <q-input dense outlined type="number" min="1" :max="MAX_STUDY_TRACK_MONTHS" hide-bottom-space no-error-icon
          class="months-input" input-class="text-center text-weight-bold" :model-value="studyTrack.monthsCount"
          :error="validations.monthsCount.$error" @update:model-value="updateMonthsCount" @blur="applyMonthsCount"
          @keyup.enter="applyMonthsCount" />
        <span class="q-ml-sm">mois</span>
      </label>
      <span>Total <span class="total-hours">{{ formatHours(totalHours) }} h</span></span>
      <span v-if="targetTotals.length">
        <template v-for="(item, index) in targetTotals" :key="item.value">
          <span v-if="index"> · </span>{{ item.label }} <b>{{ formatHours(item.hours) }} h</b>
        </template>
      </span>
    </div>
    <p v-if="validations.monthsCount.$error" class="text-caption text-secondary q-mt-sm q-mb-none">
      {{ monthsCountError }}
    </p>

    <div class="durations-container q-mt-md">
      <table class="durations-table">
        <thead>
          <tr>
            <th scope="col" class="row-head">Action de formation</th>
            <th scope="col" class="total-col">Total (h)</th>
            <th v-for="month in columnsCount" :key="month" scope="col">M{{ month }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="row.key">
            <th scope="row" class="row-head">
              <div class="row items-center no-wrap">
                <span :class="{ 'text-secondary': hasRowError(row.durations) }">{{ row.name }}</span>
                <q-btn v-if="row.targets" flat round dense size="xs" icon="add" class="q-ml-xs">
                  <q-menu>
                    <div class="q-pa-sm">
                      <ni-option-group type="checkbox" :model-value="row.targets" :display-caption="false"
                        :options="STEP_TARGET_OPTIONS" @update:model-value="updateStepTargets($event, rowIndex)" />
                    </div>
                  </q-menu>
                </q-btn>
              </div>
              <div v-if="row.targets?.length" class="step-targets">
                <q-chip v-for="target in row.targets" :key="target" dense removable
                  @remove="updateStepTargets(row.targets.filter(t => t !== target), rowIndex)">
                  {{ getTargetLabel(target) }}
                </q-chip>
              </div>
            </th>
            <td class="total-col">{{ formatHours(sumHours(row.durations)) }}</td>
            <td v-for="(duration, monthIndex) in row.durations" :key="monthIndex">
              <q-input dense outlined type="number" min="0" step="0.5" placeholder="–" input-class="text-center"
                hide-bottom-space no-error-icon class="duration-input" :model-value="getDisplayedDuration(duration)"
                @update:model-value="updateDuration($event, rowIndex, monthIndex)"
                @blur="roundDuration(rowIndex, monthIndex)" />
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="milestones-row">
            <th scope="row" class="row-head">Jalons</th>
            <td class="total-col">{{ studyTrack.milestones.length }}</td>
            <td v-for="(labels, monthIndex) in milestoneLabelsByMonth" :key="monthIndex">
              <span v-if="labels.length" class="milestone-flag" :title="labels.join(' · ')">
                ◆<template v-if="labels.length > 1"> {{ labels.length }}</template>
              </span>
            </td>
          </tr>
          <tr class="total-row">
            <th scope="row" class="row-head">Total</th>
            <td class="total-col">{{ formatHours(totalHours) }} h</td>
            <td v-for="(total, monthIndex) in monthTotals" :key="monthIndex">{{ formatHours(total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p v-if="hasHoursError" class="text-caption text-secondary q-mt-sm q-mb-none">
      Les heures doivent être des nombres positifs avec au plus une décimale.
    </p>
    <p v-if="hasEmptyRowError" class="text-caption text-secondary q-mt-sm q-mb-none">
      Chaque étape doit avoir au moins une valeur différente de 0.
    </p>

    <div class="row items-center justify-between q-mt-lg q-mb-lg">
      <p class="text-weight-bold q-mb-none">Jalons</p>
      <ni-secondary-button label="Ajouter un jalon" icon="add" @click="addMilestone" />
    </div>
    <div v-for="(milestone, index) in studyTrack.milestones" :key="index" class="milestone-grid milestone-row">
      <ni-select in-modal caption="Mois" required-field :model-value="milestone.month" :options="monthOptions"
        :error="milestoneErrors[index].month" :error-message="REQUIRED_LABEL"
        @update:model-value="updateMilestone($event, index, 'month')" />
      <ni-input in-modal caption="Libellé" required-field :model-value="milestone.label"
        :error="milestoneErrors[index].label" :error-message="REQUIRED_LABEL"
        @update:model-value="updateMilestone($event.trim(), index, 'label')" />
      <ni-select in-modal multiple caption="Cibles" required-field :model-value="milestone.targets"
        :options="MILESTONE_TARGET_OPTIONS" :error="milestoneErrors[index].targets" :error-message="REQUIRED_LABEL"
        :blur-on-selection="false" @update:model-value="updateMilestone($event, index, 'targets')" />
      <div>
        <p class="input-caption">&nbsp;</p>
        <ni-button class="milestone-delete" icon="close" @click="removeMilestone(index)" />
      </div>
    </div>
  </div>
</template>

<script>
import { toRefs, computed } from 'vue';
import { REQUIRED_LABEL, MILESTONE_TARGET_OPTIONS, STEP_TARGET_OPTIONS, MAX_STUDY_TRACK_MONTHS } from '@data/constants';
import { everyFractionDigits, hasNonZeroValue } from '@helpers/vuelidateCustomVal';
import { toFixedToFloat } from '@helpers/numbers';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
import OptionGroup from '@components/form/OptionGroup';
import Button from '@components/Button';
import SecondaryButton from '@components/SecondaryButton';

export default {
  name: 'StudyTrackTable',
  props: {
    studyTrack: { type: Object, default: () => ({ subProgram: { steps: [] }, detailsPerStep: [], milestones: [] }) },
    validations: { type: Object, default: () => ({}) },
    showErrors: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-select': Select,
    'ni-option-group': OptionGroup,
    'ni-button': Button,
    'ni-secondary-button': SecondaryButton,
  },
  emits: ['update:study-track'],
  setup (props, { emit }) {
    const { studyTrack, validations, showErrors } = toRefs(props);

    const columnsCount = computed(() => {
      if (studyTrack.value.detailsPerStep?.length) return studyTrack.value.detailsPerStep[0].durations.length;

      return studyTrack.value.eLearningDurations?.length || 0;
    });

    const monthOptions = computed(() => Array.from({ length: columnsCount.value }, (_, i) => ({
      label: `M${i + 1}`,
      value: i,
    })));

    const monthsCountError = `La durée du parcours doit être un nombre entier entre 1 et ${MAX_STUDY_TRACK_MONTHS}`;

    const milestoneErrors = computed(() => (studyTrack.value.milestones || []).map(m => ({
      label: showErrors.value && !m.label.trim(),
      targets: showErrors.value && !m.targets.length,
      month: showErrors.value && m.month === null,
    })));

    const getStepName = stepId => (studyTrack.value.subProgram.steps || []).find(s => s._id === stepId)?.name || '';

    const rows = computed(() => [
      ...(studyTrack.value.detailsPerStep || [])
        .map(d => ({ key: d.step, name: getStepName(d.step), durations: d.durations, targets: d.targets })),
      ...studyTrack.value.eLearningDurations
        ? [{ key: 'e_learning', name: 'E-learning', durations: studyTrack.value.eLearningDurations, isELearning: true }]
        : [],
    ]);

    const hasRowError = durations => showErrors.value &&
      (!hasNonZeroValue(durations) || !everyFractionDigits(1)(durations));

    const hasHoursError = computed(() => (
      showErrors.value && !everyFractionDigits(1)(rows.value.flatMap(r => r.durations))
    ));

    const hasEmptyRowError = computed(() => showErrors.value && rows.value.some(r => !hasNonZeroValue(r.durations)));

    const sumHours = durations => (durations || []).reduce((acc, duration) => acc + Number(duration || 0), 0);

    const formatHours = hours => String(toFixedToFloat(hours, 1)).replace('.', ',');

    const monthTotals = computed(() => Array.from({ length: columnsCount.value }, (_, i) => (
      sumHours(rows.value.map(r => r.durations[i]))
    )));

    const totalHours = computed(() => sumHours(monthTotals.value));

    const targetTotals = computed(() => {
      const details = studyTrack.value.detailsPerStep || [];

      return STEP_TARGET_OPTIONS
        .filter(option => details.some(d => d.targets.includes(option.value)))
        .map(option => ({
          ...option,
          hours: sumHours(details.filter(d => d.targets.includes(option.value)).flatMap(d => d.durations)),
        }));
    });

    const getTargetLabel = value => MILESTONE_TARGET_OPTIONS.find(option => option.value === value)?.label || value;

    const milestoneLabelsByMonth = computed(() => Array.from({ length: columnsCount.value }, (_, i) => (
      (studyTrack.value.milestones || []).filter(m => m.month === i).map(m => m.label || 'Sans libellé')
    )));

    const getDisplayedDuration = duration => (duration === 0 ? '' : duration);
    const toStoredDuration = value => (value === '' || value === null || Number(value) === 0 ? 0 : value);

    const updateStudyTrack = (event) => { emit('update:study-track', { ...studyTrack.value, ...event }); };

    const updateMonthsCount = (value) => { updateStudyTrack({ monthsCount: value }); };

    const applyMonthsCount = () => {
      validations.value.monthsCount.$touch();
      const count = Number(studyTrack.value.monthsCount);
      if (validations.value.monthsCount.$invalid || count === columnsCount.value) return;

      const resize = durations => (
        count > durations.length
          ? [...durations, ...Array(count - durations.length).fill(0)]
          : durations.slice(0, count)
      );

      updateStudyTrack({
        detailsPerStep: studyTrack.value.detailsPerStep.map(d => ({ ...d, durations: resize(d.durations) })),
        ...studyTrack.value.eLearningDurations && { eLearningDurations: resize(studyTrack.value.eLearningDurations) },
        milestones: studyTrack.value.milestones
          .map(m => (m.month !== null && m.month >= count ? { ...m, month: null } : m)),
      });
    };

    const updateDuration = (value, rowIndex, monthIndex) => {
      const updateDurations = durations => durations
        .map((duration, i) => (i === monthIndex ? toStoredDuration(value) : duration));

      if (rows.value[rowIndex].isELearning) {
        updateStudyTrack({ eLearningDurations: updateDurations(studyTrack.value.eLearningDurations) });
      } else {
        updateStudyTrack({
          detailsPerStep: studyTrack.value.detailsPerStep
            .map((d, i) => (i === rowIndex ? { ...d, durations: updateDurations(d.durations) } : d)),
        });
      }
    };

    const roundDuration = (rowIndex, monthIndex) => {
      const value = rows.value[rowIndex].durations[monthIndex];
      if (value !== 0) updateDuration(toFixedToFloat(value, 1), rowIndex, monthIndex);
    };

    const updateStepTargets = (targets, rowIndex) => {
      updateStudyTrack({
        detailsPerStep: studyTrack.value.detailsPerStep.map((d, i) => (i === rowIndex ? { ...d, targets } : d)),
      });
    };

    const addMilestone = () => {
      updateStudyTrack({ milestones: [...studyTrack.value.milestones, { label: '', targets: [], month: null }] });
    };

    const removeMilestone = (index) => {
      updateStudyTrack({ milestones: studyTrack.value.milestones.filter((_, i) => i !== index) });
    };

    const updateMilestone = (value, index, path) => {
      updateStudyTrack({
        milestones: studyTrack.value.milestones.map((m, i) => (i === index ? { ...m, [path]: value } : m)),
      });
    };

    return {
      // Data
      REQUIRED_LABEL,
      MILESTONE_TARGET_OPTIONS,
      STEP_TARGET_OPTIONS,
      MAX_STUDY_TRACK_MONTHS,
      // Computed
      columnsCount,
      monthOptions,
      monthsCountError,
      milestoneErrors,
      rows,
      monthTotals,
      totalHours,
      targetTotals,
      milestoneLabelsByMonth,
      hasHoursError,
      hasEmptyRowError,
      // Methods
      hasRowError,
      sumHours,
      formatHours,
      getDisplayedDuration,
      getTargetLabel,
      updateStepTargets,
      updateMonthsCount,
      applyMonthsCount,
      updateDuration,
      roundDuration,
      addMilestone,
      removeMilestone,
      updateMilestone,
    };
  },
};
</script>

<style lang="sass" scoped>
$light-blue: #EBF9FB
$row-head-width: 260px

.summary-bar
  display: flex
  flex-wrap: wrap
  align-items: center
  gap: 12px 32px
  padding: 12px 16px
  border: 1px solid $copper-grey-200
  border-radius: 4px
  background-color: $orange-100
.months-input
  width: 80px
  background-color: white
.total-hours
  font-size: 20px
  font-weight: bold
.durations-container
  overflow-x: auto
  border: 1px solid $copper-grey-300
  border-radius: 4px
.durations-table
  border-collapse: collapse
  min-width: 100%
  th, td
    padding: 6px
    text-align: center
    border-bottom: 1px solid $copper-grey-200
  th
    font-weight: bold
  thead th
    background-color: $light-blue
  .row-head
    position: sticky
    left: 0
    z-index: 2
    width: $row-head-width
    min-width: $row-head-width
    max-width: $row-head-width
    text-align: left
    background-color: white
  thead .row-head
    background-color: $light-blue
  .total-col
    position: sticky
    left: $row-head-width
    z-index: 2
    min-width: 76px
    font-weight: bold
    background-color: $light-blue
    box-shadow: 1px 0 0 $copper-grey-300
  tfoot
    .milestones-row th, .milestones-row td
      background-color: $orange-100
    .total-row th, .total-row td
      background-color: $light-blue
      font-weight: bold
    .milestones-row .total-col
      background-color: $orange-100
.step-targets
  display: flex
  flex-wrap: wrap
  align-items: center
  :deep(.q-chip)
    min-height: 20px
    margin: 2px 4px 2px 0
    font-size: 11px
    font-weight: bold
    color: $copper-500
    background-color: $light-blue
.months-input
  &.q-field--error:not(.q-field--focused)
    :deep(.q-field__control:after)
      border-color: transparent
  &.q-field--error.q-field--focused
    :deep(.q-field__control:after)
      border-color: $primary
.duration-input
  display: flex
  width: 64px
  margin: 0 auto
  :deep(input:focus::placeholder)
    color: transparent
.milestone-flag
  display: inline-block
  min-width: 20px
  padding: 1px 6px
  border-radius: 15px
  background-color: $orange-500
  color: white
  font-size: 11px
  font-weight: bold
  cursor: help
.milestone-grid
  display: grid
  grid-template-columns: 90px minmax(0, 1fr) minmax(0, 1fr) 40px
  gap: 0 12px
  align-items: start
.milestone-delete
  height: 40px
.milestone-row
  margin-bottom: 8px
  &:last-child
    margin-bottom: 24px
  :deep(.q-chip)
    min-height: 22px
    margin: 2px 4px 2px 0
    font-size: 12px
  :deep(.q-field__native)
    row-gap: 0
</style>
