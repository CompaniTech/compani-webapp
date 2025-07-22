<template>
  <div>
    <div v-if="displayMetaInfos">
      <q-card class="q-my-md" flat>
        <p class="q-pa-md section-title text-weight-bold ">Données générales *</p>
        <div class="meta-infos">
          <div class="column items-center">
            <ni-indicator :indicator="registeredTraineesCount" />
            <span class="text-center">
              {{ formatQuantity('apprenant·e inscrit·e', registeredTraineesCount, 's', false) }}
            </span>
          </div>
          <div class="column items-center">
            <ni-indicator :indicator="presentTraineesCount" />
            <span class="text-center">
              {{ formatQuantity('apprenant·e inscrit·e', presentTraineesCount, 's', false) }}
              ayant émargé<br>au moins une fois
            </span>
          </div>
          <div class="column items-center">
            <ni-indicator :indicator="absenceRate" is-percentage />
            <span class="text-center">de taux d'absence</span>
          </div>
          <div class="column items-center">
            <ni-indicator :indicator="realAbsenceRate" is-percentage />
            <span class="text-center">de taux d'absence réel **</span>
          </div>
        </div>
        <div class="column q-my-md">
          <span class="meta-infos-footer">
            * Ces données ne prennent pas en compte les émargements des stagiaires non-inscrits<br>
          </span>
          <span class="meta-infos-footer">
            ** Taux d'absence réel : ne prend en compte que les apprenant·es inscrit·es ayant émargé au moins une fois
          </span>
        </div>
      </q-card>
    </div>
    <q-card flat>
      <q-table v-if="courseHasSlot" :rows="traineesWithAttendance" :columns="attendanceColumns" class="q-pa-md table"
        separator="none" :hide-bottom="!noTrainees" :loading="loading" :pagination="attendancePagination">
        <template #header="props">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props">
              <div v-if="/(slot)/.test(col.name)">
                <div class="text-primary date">{{ col.month }}</div>
                <div class="number">{{ col.day }}</div>
                <div class="text-weight-bold date">{{ col.weekDay }}</div>
                <div class="text-copper-grey-400">
                  <div>{{ col.startHour }}</div>
                  <div>{{ col.endHour }}</div>
                </div>
                <div class="text-copper-grey-800">
                  <q-icon name="supervisor_account" />
                  {{ traineesCount(col.slot) }}
                </div>
                <q-checkbox v-if="canUpdate && course.trainees.length" :model-value="slotCheckboxValue(col.slot)"
                  dense size="sm" @update:model-value="updateSlotCheckbox(col.slot)" :disable="disableCheckbox" />
              </div>
            </q-th>
          </q-tr>
        </template>
        <template #body="props">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :props="props" :class="getDelimiterClass(props.rowIndex)">
              <q-item v-if="col.name === 'trainee'" class="rows">
                <q-item-section avatar>
                  <img class="avatar" :src="props.row.picture ? props.row.picture.link : DEFAULT_AVATAR">
                </q-item-section>
                <q-item-section>
                  <q-item-label v-if="canAccessTrainee" class="ellipsis clickable-name cursor-pointer">
                    <router-link :to="goToLearnerProfile(props.row)">{{ col.value }}</router-link>
                  </q-item-label>
                  <q-item-label v-else class="ellipsis">{{ col.value }}</q-item-label>
                  <q-item-label v-if="props.row.external" class="unsubscribed">Pas inscrit</q-item-label>
                </q-item-section>
              </q-item>
              <q-checkbox v-else :model-value="attendanceCheckboxValue(col.value, col.slot)" dense size="sm"
                @update:model-value="updateAttendanceCheckbox(col.value, col.slot)" :disable="disableCheckbox" />
            </q-td>
          </q-tr>
        </template>
        <template #no-data>
          <div class="text-center text-italic">Aucun·e stagiaire n'a été ajouté·e à cette formation</div>
        </template>
      </q-table>
      <div v-if="!courseHasSlot" class="text-center text-italic q-pa-lg no-data">
        Aucun créneau n'a été ajouté à cette formation
      </div>
      <ni-button v-if="courseHasSlot && canUpdate && !isSingleCourse" color="primary" icon="add" class="q-mb-sm"
        :disable="loading" label="Ajouter un·e participant·e non inscrit·e"
        @click="openTraineeAttendanceAdditionModal" />
    </q-card>

    <ni-simple-table :data="formattedAttendanceSheets" :columns="attendanceSheetColumns"
      v-model:pagination="attendanceSheetPagination" :visible-columns="attendanceSheetVisibleColumns"
      :loading="attendanceSheetTableLoading">
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td :props="props" v-for="col in props.cols" :key="col.name" :data-label="col.label" :class="col.name"
            :style="col.style">
            <template v-if="col.name === 'actions'">
              <div v-if="!props.row.file" class="justify-end overflow-hidden-nowrap flex items-center">
                <div v-if="props.row.slots.some(s => !s.traineesSignature)" class="text-italic text-primary">
                  En attente de signature
                </div>
                <ni-primary-button v-else label="Générer" icon="add" :disabled="modalLoading"
                  @click="generateAttendanceSheet(props.row._id)" />
                <ni-button v-if="canUpdate" icon="delete" color="primary"
                  @click="validateAttendanceSheetDeletion(props.row)" :disable="!!course.archivedAt" />
              </div>
              <div v-else class="row no-wrap table-actions justify-end">
                <ni-button v-if="canUpdate && isSingleCourse" icon="edit" color="primary"
                  @click="openAttendanceSheetEditionModal(props.row)" :disable="disableSheetEdition(props.row)" />
                <ni-button icon="file_download" color="primary" type="a" :href="get(props.row, 'file.link')"
                  :disable="!get(props.row, 'file.link')" />
                <ni-button v-if="canUpdate" icon="delete" color="primary"
                  @click="validateAttendanceSheetDeletion(props.row)" :disable="disableSheetDeletion(props.row)" />
              </div>
            </template>
            <template v-else-if="col.name === 'trainee' && get(props.row, 'slots.length')">
              {{ formatSingleAttendanceSheetName(col.value, props.row.slots) }}
            </template>
            <template v-else>
              {{ col.value }}
              <div v-if="get(props.row, 'trainee.external')" class="unsubscribed text-primary">Pas inscrit</div>
            </template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
    <div class="flex justify-end">
      <ni-button v-if="canUpdate" class="bg-primary" color="white" icon="add"
        label="Ajouter une feuille d'émargement" @click="openAttendanceSheetAdditionModal" />
    </div>

    <trainee-attendance-creation-modal v-model="traineeAdditionModal" :course="course" @hide="resetNewTraineeAttendance"
      :loading="modalLoading" :validation="attendanceValidations.newTraineeAttendance"
      :trainee-filter-options="traineeFilterOptions" v-model:new-trainee-attendance="newTraineeAttendance"
      :trainees="traineesWithAttendance" @submit="addTrainee" />

    <attendance-sheet-addition-modal v-model="attendanceSheetAdditionModal" @hide="resetAttendanceSheetAdditionModal"
      @submit="addAttendanceSheet" v-model:new-attendance-sheet="newAttendanceSheet" :loading="modalLoading"
      :steps-by-id="stepsById" :validations="attendanceSheetValidations.newAttendanceSheet" :course="course"
      :slots="notLinkedSlotOptions" />
    <attendance-sheet-edition-modal v-model="attendanceSheetEditionModal" @hide="resetAttendanceSheetEditionModal"
      @submit="updateAttendanceSheet" v-model:edited-attendance-sheet="editedAttendanceSheet" :loading="modalLoading"
      :validations="attendanceSheetValidations.editedAttendanceSheet" :steps-by-id="stepsById"
      :edition-slots-grouped-by-step="editionSlotsGroupedByStep" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { computed, toRefs, ref } from 'vue';
import { useRouter } from 'vue-router';
import pick from 'lodash/pick';
import get from 'lodash/get';
import { DEFAULT_AVATAR, TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN, DD_MM_YYYY } from '@data/constants';
import { defineAbilitiesFor, defineAbilitiesForCourse } from '@helpers/ability';
import { descendingSortBy } from '@helpers/dates/utils';
import { formatQuantity } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import { multiply, subtract, divide } from '@helpers/numbers';
import Button from '@components/Button';
import PrimaryButton from '@components/PrimaryButton';
import SimpleTable from '@components/table/SimpleTable';
import AttendanceSheetAdditionModal from '@components/courses/AttendanceSheetAdditionModal';
import Indicator from '@components/courses/Indicator';
import TraineeAttendanceCreationModal from '../TraineeAttendanceCreationModal';
import AttendanceSheetEditionModal from '../../courses/AttendanceSheetEditionModal.vue';
import { useAttendances } from './Composables/Attendances';
import { useAttendanceSheets } from './Composables/AttendanceSheets';

export default {
  name: 'AttendanceTable',
  props: {
    course: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-button': Button,
    'ni-primary-button': PrimaryButton,
    'ni-simple-table': SimpleTable,
    'trainee-attendance-creation-modal': TraineeAttendanceCreationModal,
    'attendance-sheet-addition-modal': AttendanceSheetAdditionModal,
    'attendance-sheet-edition-modal': AttendanceSheetEditionModal,
    'ni-indicator': Indicator,
  },
  setup (props) {
    const { course } = toRefs(props);
    const $router = useRouter();
    const $store = useStore();

    const isClientInterface = !/\/ad\//.test($router.currentRoute.value.path);
    const attendancePagination = ref({ rowsPerPage: 0 });
    const attendanceSheetPagination = ref({ page: 1, rowsPerPage: 15 });
    const modalLoading = ref(false);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const canUpdate = computed(() => {
      const ability = defineAbilitiesFor(pick(loggedUser.value, ['role', 'company', '_id', 'sector']));

      return ability.can('update', 'course_trainee_follow_up');
    });

    const canAccessTrainee = computed(() => {
      const ability = defineAbilitiesForCourse(pick(loggedUser.value, ['role']));

      return ability.can('access', 'trainee');
    });

    const isLastSlotStarted = computed(() => {
      if (course.value.slotsToPlan.length) return false;

      const sortedSlots = [...course.value.slots].sort(descendingSortBy('startDate'));
      return CompaniDate().isSameOrAfter(sortedSlots[0].startDate);
    });

    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    const isRofOrVendorAdmin = computed(() => [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(vendorRole.value));

    const registeredTraineesCount = computed(() => course.value.trainees.length);

    const displayMetaInfos = computed(() => !isClientInterface && isRofOrVendorAdmin.value && isLastSlotStarted.value &&
      registeredTraineesCount.value);

    const {
      // Data
      traineeAdditionModal,
      loading,
      newTraineeAttendance,
      attendances,
      // Computed
      attendanceColumns,
      traineesWithAttendance,
      noTrainees,
      courseHasSlot,
      traineeFilterOptions,
      disableCheckbox,
      canAccessLearnerProfile,
      // Methods
      traineesCount,
      getPotentialTrainees,
      attendanceCheckboxValue,
      refreshAttendances,
      updateAttendanceCheckbox,
      slotCheckboxValue,
      addTrainee,
      resetNewTraineeAttendance,
      openTraineeAttendanceAdditionModal,
      updateSlotCheckbox,
      goToLearnerProfile,
      // Validations
      attendanceValidations,
    } = useAttendances(course, isClientInterface, canUpdate, loggedUser, modalLoading);

    const attendancesForRegisteredTrainees = computed(() => attendances.value
      .filter(a => course.value.trainees.some(t => t._id === a.trainee)));

    const presentTraineesCount = computed(() => course.value.trainees
      .filter(trainee => attendancesForRegisteredTrainees.value.some(a => a.trainee === trainee._id))
      .length);

    const absenceRate = computed(() => {
      const numerator = attendancesForRegisteredTrainees.value.length;
      const denominator = multiply(course.value.slots.length, registeredTraineesCount.value);
      const res = denominator > 0 ? multiply(subtract(1, divide(numerator, denominator)), 100) : 100;

      return Math.round(res);
    });

    const realAbsenceRate = computed(() => {
      const numerator = attendancesForRegisteredTrainees.value.length;
      const denominator = multiply(course.value.slots.length, presentTraineesCount.value);
      const res = denominator > 0 ? multiply(subtract(1, divide(numerator, denominator)), 100) : 100;

      return Math.round(res);
    });

    const lastPassedSlotId = computed(() => {
      const lastPassedSlot = [...course.value.slots]
        .sort(descendingSortBy('startDate'))
        .find(slot => CompaniDate(slot.startDate).isBefore(CompaniDate()));

      return lastPassedSlot ? lastPassedSlot._id : null;
    });

    const {
      // Data
      attendanceSheetTableLoading,
      attendanceSheetAdditionModal,
      newAttendanceSheet,
      attendanceSheetColumns,
      attendanceSheetEditionModal,
      editedAttendanceSheet,
      stepsById,
      // Computed
      attendanceSheetVisibleColumns,
      formattedAttendanceSheets,
      notLinkedSlotOptions,
      editionSlotsGroupedByStep,
      isSingleCourse,
      // Methods
      disableSheetDeletion,
      disableSheetEdition,
      refreshAttendanceSheets,
      openAttendanceSheetAdditionModal,
      resetAttendanceSheetAdditionModal,
      addAttendanceSheet,
      validateAttendanceSheetDeletion,
      resetAttendanceSheetEditionModal,
      updateAttendanceSheet,
      openAttendanceSheetEditionModal,
      generateAttendanceSheet,
      // Validations
      attendanceSheetValidations,
    } = useAttendanceSheets(course, isClientInterface, canUpdate, loggedUser, modalLoading);

    const getDelimiterClass = (index) => {
      if (index === course.value.trainees.length) return 'unsubscribed-delimiter';
      if (index === course.value.trainees.length - 1) return 'last-subscribed-interline';
    };

    const formatSingleAttendanceSheetName = (traineeName, slots) => {
      const dates = [...new Set(slots.map(slot => CompaniDate(slot.slotId.startDate).format(DD_MM_YYYY)))].join(', ');
      return `${traineeName} - ${dates}`;
    };

    const scrollToDate = () => {
      const lastPassedSlotIndex = course.value.slots.findIndex(slot => slot._id === lastPassedSlotId.value);
      if (lastPassedSlotIndex >= 0) {
        const column = document.querySelectorAll('th')[lastPassedSlotIndex];
        if (column) column.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    };

    const created = async () => {
      await Promise.all([
        refreshAttendances({ course: course.value._id }),
        refreshAttendanceSheets(),
        ...!isSingleCourse.value ? [getPotentialTrainees()] : [],
      ]);

      if (lastPassedSlotId.value) scrollToDate();
    };

    created();

    return {
      // Data
      DEFAULT_AVATAR,
      loading,
      modalLoading,
      attendanceSheetTableLoading,
      traineeAdditionModal,
      newTraineeAttendance,
      attendanceSheetAdditionModal,
      newAttendanceSheet,
      attendanceSheetColumns,
      attendanceSheetPagination,
      attendancePagination,
      attendanceSheetEditionModal,
      editedAttendanceSheet,
      stepsById,
      // Computed
      canAccessLearnerProfile,
      attendanceColumns,
      attendanceSheetVisibleColumns,
      noTrainees,
      courseHasSlot,
      traineesWithAttendance,
      formattedAttendanceSheets,
      traineeFilterOptions,
      canUpdate,
      canAccessTrainee,
      disableCheckbox,
      displayMetaInfos,
      registeredTraineesCount,
      presentTraineesCount,
      absenceRate,
      realAbsenceRate,
      notLinkedSlotOptions,
      editionSlotsGroupedByStep,
      isSingleCourse,
      // Methods
      get,
      attendanceCheckboxValue,
      disableSheetDeletion,
      disableSheetEdition,
      traineesCount,
      openAttendanceSheetAdditionModal,
      resetAttendanceSheetAdditionModal,
      addAttendanceSheet,
      validateAttendanceSheetDeletion,
      updateAttendanceCheckbox,
      addTrainee,
      resetNewTraineeAttendance,
      openTraineeAttendanceAdditionModal,
      slotCheckboxValue,
      updateSlotCheckbox,
      getDelimiterClass,
      goToLearnerProfile,
      resetAttendanceSheetEditionModal,
      updateAttendanceSheet,
      formatQuantity,
      openAttendanceSheetEditionModal,
      generateAttendanceSheet,
      formatSingleAttendanceSheetName,
      // Validations
      attendanceSheetValidations,
      attendanceValidations,
    };
  },
};
</script>

<style lang="sass" scoped>
.number
  font-size: 24px
.date
  font-size: 16px
.no-data
  font-size: 12px

.ellipsis
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  display: block

.table
  thead tr:first-child th:first-child
    background-color: white
  td:first-child
    background-color: white
  th
    border-right: 1px solid $copper-grey-200
  tr:first-child
    td:first-child
      .rows
        border-top: 1px solid $copper-grey-200
        padding-top: 8px
        margin-right: 16px
  tr:last-child
    td:first-child
      .rows
        border-bottom: 1px solid $copper-grey-200
        padding-bottom: 8px
        margin-right: 16px
  td:first-child, th:first-child
    position: sticky
    left: 0
    z-index: 1

.unsubscribed
  color: $secondary
  line-height: 1
  font-size: 11px
  font-style: italic
  padding-top: 3px

.unsubscribed-delimiter
  border-top: 1px solid $copper-grey-200
  padding-top: 16px

.last-subscribed-interline
  padding-bottom: 16px

.meta-infos
  display: flex
  flex-direction: row
  justify-content: space-around
  @media screen and (max-width: 767px)
    flex-direction: column

.meta-infos-footer
  font-size: 12px
  font-style: italic
  padding: 4px 16px
</style>
