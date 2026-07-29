<template>
  <q-card v-if="trainerInfos.courses.length || Object.keys(trainerInfos.collectiveSlots.slots).length"
    class="container clickable cursor-pointer" flat>
    <q-expansion-item class="q-my-md" v-model="displayDetails">
      <template #header>
        <div class="full-width items-center">
          <div class="trainerInfosContainer">
            <span v-if="isDashboard" class="text-copper-500">{{ formatIdentity(trainerInfos.identity, 'FL') }}</span>
            <ni-primary-button v-if="isTrainer" class="q-my-sm" label="Facturer les créneaux"
              @click.stop="openCourseSlotInvoiceModal" :disabled="selectedSlotIds.length === 0" />
            <ni-primary-button v-else class="q-my-sm" label="Changer le statut des créneaux sélectionnés"
              @click.stop="openCourseSlotStatusChangeModal" :disabled="selectedSlotIds.length === 0" />
          </div>
          <div class="q-py-sm">
            <span v-if="displayDuration(formattedTrainerDurations.notInvoiced)"
              class="text-weight-bold text-orange-400">
              Non facturé : {{ formattedTrainerDurations.notInvoiced }} -
              {{ formattedTrainerDurations.notInvoicedAmount }}
              &nbsp;(dont {{ formattedTrainerDurations.notInvoicedAbsence }} d'absence)
            </span>
            <span v-if="displayDuration(formattedTrainerDurations.invoiced)" class="text-weight-bold text-copper-500">
              <span v-if="displayDuration(formattedTrainerDurations.notInvoiced)">&nbsp;/ </span>Facturé :
              {{ formattedTrainerDurations.invoiced }} - {{ formattedTrainerDurations.invoicedAmount }} (dont
              &nbsp;{{ formattedTrainerDurations.invoicedAbsence }} d'absence)
            </span>
            <span v-if="displayDuration(formattedTrainerDurations.paid)" class="text-weight-bold text-green-600">
              <span v-if="displayDuration(formattedTrainerDurations.notInvoiced) ||
                displayDuration(formattedTrainerDurations.invoiced)">&nbsp;/ </span>réglé :
              {{ formattedTrainerDurations.paid }} - {{ formattedTrainerDurations.paidAmount }} (dont
              &nbsp;{{ formattedTrainerDurations.paidAbsence }} d'absence)
            </span>
          </div>
        </div>
      </template>
      <div class="q-pa-sm bg-peach-200">
        <q-expansion-item v-for="course of coursesWithFormattedData" :key="course._id" class="q-ma-sm bg-white"
          v-model="areCourseDetailsVisible[course._id]">
          <template #header>
            <div class="full-width">
              <router-link :to="goToCourse(course._id)" @click.stop>
                <span class="text-weight-bold text-copper-600 clickable-name">{{ course.name }}</span>
              </router-link>
              <span v-if="displayDuration(course.notInvoicedSingleSlotsDuration)"
                class="text-weight-bold text-orange-400">
                  <br> Non facturé : {{ course.notInvoicedSingleSlotsDuration }} -
                  {{ course.notInvoicedSingleSlotsAmount }} (dont
                  &nbsp;{{ course.notInvoicedSingleSlotsAbsenceDuration }} d'absence)
                </span>
                <span v-if="displayDuration(course.invoicedSingleSlotsDuration)"
                  class="text-copper-500 text-weight-bold">
                  &nbsp;/&nbsp;Facturé : {{ course.invoicedSingleSlotsDuration }} -
                  {{ course.invoicedSingleSlotsAmount }} (dont
                  &nbsp;{{ course.invoicedSingleSlotsAbsenceDuration }} d'absence)
                </span>
                <span class="text-weight-bold text-green-600" v-if="displayDuration(course.paidSingleSlotsDuration)">
                  &nbsp;/&nbsp;réglé : {{ course.paidSingleSlotsDuration }} - {{ course.paidSingleSlotsAmount }} (dont
                  &nbsp;{{ course.paidSingleSlotsAbsenceDuration }} d'absence)
                </span>
            </div>
          </template>
          <div class="q-pt-sm" v-if="areCourseDetailsVisible[course._id]">
            <div v-for="stepName of Object.keys(course.singleTraineeSlots)" :key="stepName" class="q-pa-sm q-pl-md">
              <span class="text-italic">{{ stepName }}</span>
              &nbsp;:&nbsp;
              <span class="text-orange-400"
                v-if="displayDuration(course.singleTraineeSlots[stepName].notInvoicedDuration)">
                {{ course.singleTraineeSlots[stepName].notInvoicedDuration }} non facturées
                &nbsp;({{ course.singleTraineeSlots[stepName].notInvoicedAmount }})
              </span>
              <span v-if="displayDuration(course.singleTraineeSlots[stepName].invoicedDuration)">
                <span v-if="displayDuration(course.singleTraineeSlots[stepName].notInvoicedDuration)"> , </span>
                {{ course.singleTraineeSlots[stepName].invoicedDuration }} facturées
                &nbsp;({{ course.singleTraineeSlots[stepName].invoicedAmount }})
              </span>
              <span v-if="displayDuration(course.singleTraineeSlots[stepName].paidDuration)">
                <span v-if="displayDuration(course.singleTraineeSlots[stepName].notInvoicedDuration) ||
                  displayDuration(course.singleTraineeSlots[stepName].invoicedDuration)"> , </span>
                {{ course.singleTraineeSlots[stepName].paidDuration }} réglées
                &nbsp;({{ course.singleTraineeSlots[stepName].paidAmount }})
              </span>
            </div>
            <ni-expanding-table :data="course.rows" :columns="singleSlotColumns" hide-bottom>
              <template #header="{ props }">
                <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
                  <template v-if="col.name === 'actions'">
                    <q-checkbox :model-value="areMultipleSlotsSelected(course.rows)" class="q-mr-sm" size="sm"
                      @update:model-value="selectSlotList($event, course.rows)"
                      :disable="course.rows.every(s => !isSlotSelectable(s))" />
                  </template>
                  <template v-else>{{ col.label }}</template>
                </q-th>
              </template>
              <template #row="{ props }">
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  <template v-if="col.name === 'actions'">
                    <q-checkbox class="q-mr-md" :model-value="selectedSlotIds.includes(props.row._id)" dense
                      @update:model-value="selectSlot($event, props.row)" :disable="!isSlotSelectable(props.row)" />
                  </template>
                  <template v-else>{{ col.value }}</template>
                  </q-td>
              </template>
            </ni-expanding-table>
          </div>
        </q-expansion-item>
        <q-expansion-item class="q-ma-sm bg-white" v-if="Object.keys(trainerInfos.collectiveSlots.slots).length">
          <template #header>
            <div class="full-width align-center">
              <span class="text-weight-bold text-copper-600"> Sessions collectives</span>
              <span v-if="displayDuration(formattedCollectiveSlots.notInvoiced)"
                class="text-weight-bold text-orange-400 q-ma-md">
                <br> Non facturé : {{ formattedCollectiveSlots.notInvoiced }} -
                &nbsp;{{ formattedCollectiveSlots.notInvoicedCollectiveSlotsAmount }} (dont
                &nbsp;{{ formattedCollectiveSlots.notInvoicedAbsence }} d'absence)
              </span>
              <span v-if="displayDuration(formattedCollectiveSlots.invoiced)"
                class="text-weight-bold text-copper-500 q-ma-md">
                &nbsp;/ Facturé : {{ formattedCollectiveSlots.invoiced }} -
                &nbsp;{{ formattedCollectiveSlots.invoicedCollectiveSlotsAmount }} (dont
                &nbsp;{{ formattedCollectiveSlots.invoicedAbsence }} d'absence)
              </span>
              <span class="text-weight-bold text-green-600" v-if="displayDuration(formattedCollectiveSlots.paid)">
                &nbsp;/ réglé : {{ formattedCollectiveSlots.paid }} -
                &nbsp;{{ formattedCollectiveSlots.paidCollectiveSlotsAmount }} (dont
                &nbsp;{{ formattedCollectiveSlots.paidAbsence }} d'absence)
              </span>
            </div>
          </template>
          <ni-banner class="bg-copper-grey-100 q-pa-lg" icon="info_outline">
              <template #message>
                <span>
                  Attention, les créneaux qui n'ont pas les mêmes horaires de début et de fin sont comptés séparément.
                  <br> Un créneau est comptabilisé dans les heures d'absence si tous les apprenants sont absents.
                  </span>
              </template>
            </ni-banner>
          <div v-for="day of Object.keys(formattedCollectiveSlots.slots)" :key="day">
            <q-item-label class="q-pl-lg text-weight-bold q-pt-lg">
              Session du {{ day }}
              <span v-if="displayDuration(formattedCollectiveSlots.slots[day].notInvoicedDuration)"
                class="text-orange-400 q-ma-md">
                &nbsp;Non facturé : {{ formattedCollectiveSlots.slots[day].notInvoicedDuration }}
                ({{ formattedCollectiveSlots.slots[day].notInvoicedAmount }})
              </span>
              <span class="text-copper-500 q-ma-md"
                v-if="displayDuration(formattedCollectiveSlots.slots[day].invoicedDuration)">
                &nbsp;/ Facturé : {{ formattedCollectiveSlots.slots[day].invoicedDuration }}
                ({{ formattedCollectiveSlots.slots[day].invoicedAmount }})
              </span>
              <span class="text-green-600"
                v-if="displayDuration(formattedCollectiveSlots.slots[day].paidDuration)">
                &nbsp;/ réglé : {{ formattedCollectiveSlots.slots[day].paidDuration }}
                &nbsp;({{ formattedCollectiveSlots.slots[day].paidAmount }})
              </span>
            </q-item-label>
            <ni-expanding-table :data="trainerInfos.collectiveSlots.slots[day].slots" :columns="collectiveSlotsColumns"
              hide-bottom>
              <template #header="{ props }">
                <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
                  <template v-if="col.name === 'actions'">
                    <q-checkbox :model-value="areMultipleSlotsSelected(trainerInfos.collectiveSlots.slots[day].slots)"
                    @update:model-value="selectSlotList($event, trainerInfos.collectiveSlots.slots[day].slots, true)"
                    :disable="trainerInfos.collectiveSlots.slots[day].slots.every(s => !isSlotSelectable(s))"
                    class="q-mr-sm" size="sm" />
                  </template>
                  <template v-else>{{ col.label }}</template>
                </q-th>
              </template>
              <template #row="{ props }">
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  <template v-if="col.name === 'traineeName'">
                    <router-link :to="goToCourse(props.row.courseId)" @click.stop>
                      <span class="text-weight-bold text-copper-600 clickable-name">{{ col.value }}</span>
                    </router-link>
                  </template>
                  <template v-else-if="col.name === 'actions'">
                    <q-checkbox class="q-mr-md" :model-value="selectedSlotIds.includes(props.row._id)" dense
                      @update:model-value="selectSlot($event, props.row, trainerInfos.collectiveSlots.slots[day].slots)"
                      :disable="!isSlotSelectable(props.row)" />
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
              </template>
            </ni-expanding-table>
          </div>
        </q-expansion-item>
      </div>
    </q-expansion-item>
  </q-card>

  <course-slot-status-change-modal v-model="courseSlotStatusChangeModal" :current-status="currentStatus"
    :new-status="newStatus" :validations="v$.newStatus" :selected-slots="selectedSlots"
    :loading="statusChangeLoading" @update:new-status="newStatus = $event"
    @hide="resetCourseSlotStatusChangeModal" @submit="submitStatusChange" />

  <course-slot-invoice-modal v-model="courseSlotInvoiceModal" :course-slots="selectedSlots"
    :loading="courseSlotInvoiceLoading" :invoice="invoice" :validations="v$.invoice" @hide="resetCourseSlotInvoiceModal"
    @submit="submitCourseSlotInvoice" />
</template>

<script>

import { ref, toRefs, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { LONG_DURATION_H_MM, DD_MM_YYYY, HHhMM, SLOT_STATUS, NOT_INVOICED } from '@data/constants';
import { formatIdentity, formatStringToPrice } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';
import ExpandingTable from '@components/table/ExpandingTable';
import Banner from '@components/Banner';
import Button from '@components/PrimaryButton';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import CourseSlotStatusChangeModal from 'src/modules/vendor/components/billing/CourseSlotStatusChangeModal';
import CourseSlotInvoiceModal from 'src/modules/vendor/components/billing/CourseSlotInvoiceModal';
import TrainerInvoices from '@api/TrainerInvoices';

export default {
  name: 'TrainerBillingInfosCard',
  props: {
    trainerInfos: { type: Object, default: () => ({}) },
    isTrainer: { type: Boolean, default: false },
  },
  components: {
    'ni-expanding-table': ExpandingTable,
    'ni-banner': Banner,
    'ni-primary-button': Button,
    'course-slot-status-change-modal': CourseSlotStatusChangeModal,
    'course-slot-invoice-modal': CourseSlotInvoiceModal,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { trainerInfos, isTrainer } = toRefs(props);
    const $route = useRoute();
    const isDashboard = /\/trainers-follow-up/.test($route.path);
    const isTrainerSection = /^\/ad\/trainers\//.test($route.path);
    const displayDetails = ref(!isDashboard);

    const areCourseDetailsVisible = ref({});
    const selectedSlotIds = ref([]);
    const invoice = ref({ number: '', file: '' });
    const courseSlotStatusChangeModal = ref(false);
    const currentStatus = ref('');
    const newStatus = ref('');
    const statusChangeLoading = ref(false);
    const courseSlotInvoiceModal = ref(false);
    const courseSlotInvoiceLoading = ref(false);

    const isSlotSelectable = slot => (isTrainer.value
      ? slot.status === NOT_INVOICED
      : slot.status !== NOT_INVOICED && !!slot.trainerInvoice);

    const singleSlotColumns = computed(() => [
      { name: 'stepName', label: 'Étape', field: 'stepName', align: 'left' },
      {
        name: 'startDate',
        label: 'Début',
        field: 'startDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'endDate',
        label: 'Fin',
        field: 'endDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'duration',
        label: 'Durée',
        field: 'duration',
        align: 'center',
        format: value => CompaniDuration(value).format(LONG_DURATION_H_MM),
      },
      {
        name: 'amount',
        label: 'Montant',
        field: 'amount',
        format: formatStringToPrice,
        align: 'center',
      },
      {
        name: 'isAbsence',
        label: 'Absence',
        field: 'isAbsence',
        align: 'center',
        format: value => (value ? 'Oui' : 'Non'),
      },
      {
        name: 'status',
        label: 'Statut',
        field: 'status',
        align: 'center',
        format: value => SLOT_STATUS[value],
      },
      {
        name: 'trainerBillNumber',
        label: 'Facture',
        field: 'trainerBillNumber',
        align: 'center',
      },
      { name: 'actions', label: '', field: '', align: 'right' },
    ]);

    const collectiveSlotsColumns = computed(() => [
      { name: 'traineeName', label: 'Apprenant', field: 'traineeName', align: 'left' },
      { name: 'stepName', label: 'Étape', field: 'stepName', align: 'left' },
      {
        name: 'startDate',
        label: 'Début',
        field: 'startDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'endDate',
        label: 'Fin',
        field: 'endDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'duration',
        label: 'Durée',
        field: 'duration',
        align: 'center',
        format: value => CompaniDuration(value).format(LONG_DURATION_H_MM),
      },
      {
        name: 'amount',
        label: 'Montant',
        field: 'amount',
        format: formatStringToPrice,
        align: 'center',
      },
      {
        name: 'isAbsence',
        label: 'Absence',
        field: 'isAbsence',
        align: 'center',
        format: value => (value ? 'Oui' : 'Non'),
      },
      {
        name: 'status',
        label: 'Statut',
        field: 'status',
        align: 'center',
        format: value => SLOT_STATUS[value],
      },
      {
        name: 'trainerBillNumber',
        label: 'Facture',
        field: 'trainerBillNumber',
        align: 'center',
      },
      { name: 'actions', label: '', field: '', align: 'right' },
    ]);

    const formatStatusDurations = (obj, prefix = '') => {
      const formatted = {
        [`notInvoiced${prefix}Duration`]: CompaniDuration(obj[`notInvoiced${prefix}Duration`])
          .format(LONG_DURATION_H_MM),
        [`notInvoiced${prefix}Amount`]: formatStringToPrice(obj[`notInvoiced${prefix}Amount`]),
        [`invoiced${prefix}Duration`]: CompaniDuration(obj[`invoiced${prefix}Duration`]).format(LONG_DURATION_H_MM),
        [`invoiced${prefix}Amount`]: formatStringToPrice(obj[`invoiced${prefix}Amount`]),
        [`paid${prefix}Duration`]: CompaniDuration(obj[`paid${prefix}Duration`]).format(LONG_DURATION_H_MM),
        [`paid${prefix}Amount`]: formatStringToPrice(obj[`paid${prefix}Amount`]),
      };

      // Absence duration is only tracked at the course/collective totals level (with a SingleSlots/CollectiveSlots
      // prefix), not on individual steps or days.
      if (!prefix) return formatted;

      return {
        ...formatted,
        [`notInvoiced${prefix}AbsenceDuration`]: CompaniDuration(obj[`notInvoiced${prefix}AbsenceDuration`])
          .format(LONG_DURATION_H_MM),
        [`invoiced${prefix}AbsenceDuration`]: CompaniDuration(obj[`invoiced${prefix}AbsenceDuration`])
          .format(LONG_DURATION_H_MM),
        [`paid${prefix}AbsenceDuration`]: CompaniDuration(obj[`paid${prefix}AbsenceDuration`])
          .format(LONG_DURATION_H_MM),
      };
    };

    const coursesWithFormattedData = computed(() => trainerInfos.value.courses.map((course) => {
      const singleSlots = Object.entries(course.singleTraineeSlots || {});

      const rows = singleSlots.flatMap(([stepName, obj]) => obj.slots.map(slot => ({ stepName, ...slot })));

      const formattedSingleTraineeSlots = Object.fromEntries(
        singleSlots.map(([stepName, obj]) => [stepName, { ...obj, ...formatStatusDurations(obj) }])
      );

      return {
        ...course,
        singleTraineeSlots: formattedSingleTraineeSlots,
        ...formatStatusDurations(course, 'SingleSlots'),
        rows,
      };
    }));

    const formattedTrainerDurations = computed(() => ({
      notInvoiced: CompaniDuration(trainerInfos.value.totalNotInvoicedSlotsDuration).format(LONG_DURATION_H_MM),
      notInvoicedAbsence: CompaniDuration(trainerInfos.value.totalNotInvoicedSlotsAbsenceDuration)
        .format(LONG_DURATION_H_MM),
      notInvoicedAmount: formatStringToPrice(trainerInfos.value.totalNotInvoicedSlotsAmount),
      invoiced: CompaniDuration(trainerInfos.value.totalInvoicedSlotsDuration).format(LONG_DURATION_H_MM),
      invoicedAbsence: CompaniDuration(trainerInfos.value.totalInvoicedSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      invoicedAmount: formatStringToPrice(trainerInfos.value.totalInvoicedSlotsAmount),
      paid: CompaniDuration(trainerInfos.value.totalPaidSlotsDuration).format(LONG_DURATION_H_MM),
      paidAbsence: CompaniDuration(trainerInfos.value.totalPaidSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      paidAmount: formatStringToPrice(trainerInfos.value.totalPaidSlotsAmount),
    }));

    const formattedCollectiveSlots = computed(() => {
      const { slots, totals } = trainerInfos.value.collectiveSlots;

      const formattedSlots = Object.fromEntries(
        Object.entries(slots).map(([day, slotGroup]) => [day, { ...slotGroup, ...formatStatusDurations(slotGroup) }])
      );

      const formattedTotals = formatStatusDurations(totals, 'CollectiveSlots');

      return {
        slots: formattedSlots,
        notInvoiced: formattedTotals.notInvoicedCollectiveSlotsDuration,
        notInvoicedAbsence: formattedTotals.notInvoicedCollectiveSlotsAbsenceDuration,
        invoiced: formattedTotals.invoicedCollectiveSlotsDuration,
        invoicedAbsence: formattedTotals.invoicedCollectiveSlotsAbsenceDuration,
        paid: formattedTotals.paidCollectiveSlotsDuration,
        paidAbsence: formattedTotals.paidCollectiveSlotsAbsenceDuration,
        ...formattedTotals,
      };
    });

    const rules = computed(() => ({
      invoice: { number: { required }, file: { required } },
      newStatus: { required },
    }));

    const v$ = useVuelidate(rules, { invoice, newStatus });

    const displayDuration = value => value !== '0min';

    const goToCourse = courseId => ({
      name: isTrainerSection ? 'trainers courses info' : 'ni management blended courses info',
      params: { courseId },
      query: { defaultTab: 'traineeFollowUp' },
    });

    const allSlots = computed(() => [
      ...coursesWithFormattedData.value.flatMap(course => course.rows),
      ...Object.values(trainerInfos.value.collectiveSlots.slots).flatMap(dayGroup => dayGroup.slots),
    ]);

    const selectedSlots = computed(() => allSlots.value.filter(slot => selectedSlotIds.value.includes(slot._id)));

    const selectSlot = (checked, slot, daySlots) => {
      let idsToSelect = [slot._id];
      if (slot.trainerInvoice) {
        idsToSelect = allSlots.value.filter(s => s.trainerInvoice === slot.trainerInvoice).map(s => s._id);
      } else if (daySlots) {
        idsToSelect = daySlots
          .filter(s => CompaniDate(s.startDate).isSame(slot.startDate) && CompaniDate(s.endDate).isSame(slot.endDate) &&
            isSlotSelectable(s))
          .map(s => s._id);
      }
      selectedSlotIds.value = checked
        ? [...new Set([...selectedSlotIds.value, ...idsToSelect])]
        : selectedSlotIds.value.filter(id => !idsToSelect.includes(id));
    };

    const selectSlotList = (checked, slots, isCollective) => {
      slots.filter(isSlotSelectable).forEach(slot => selectSlot(checked, slot, isCollective ? slots : undefined));
    };

    const areMultipleSlotsSelected = (slots) => {
      const selectableSlots = slots.filter(isSlotSelectable);
      return selectableSlots.length > 0 && selectableSlots.every(s => selectedSlotIds.value.includes(s._id));
    };

    const openCourseSlotStatusChangeModal = () => {
      const statuses = [...new Set(selectedSlots.value.map(s => s.status))];
      if (statuses.length > 1) return NotifyWarning('Les créneaux sélectionnés n\'ont pas tous le même statut.');

      currentStatus.value = statuses[0];
      courseSlotStatusChangeModal.value = true;
    };

    const resetCourseSlotStatusChangeModal = () => {
      courseSlotStatusChangeModal.value = false;
      newStatus.value = '';
      currentStatus.value = '';
      v$.value.newStatus.$reset();
    };

    const submitStatusChange = async () => {
      try {
        v$.value.newStatus.$touch();
        if (v$.value.newStatus.$error) return NotifyWarning('Champ(s) invalide(s).');

        statusChangeLoading.value = true;

        const trainerInvoiceIds = [...new Set(selectedSlots.value.map(s => s.trainerInvoice).filter(Boolean))];

        if (newStatus.value === NOT_INVOICED) {
          await Promise.all(trainerInvoiceIds.map(id => TrainerInvoices.remove(id)));
        } else {
          await Promise.all(
            trainerInvoiceIds.map(id => TrainerInvoices.update(id, { status: newStatus.value }))
          );
        }

        emit('refresh');
        courseSlotStatusChangeModal.value = false;

        NotifyPositive('Statut des créneaux modifié.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du statut des créneaux.');
      } finally {
        statusChangeLoading.value = false;
      }
    };

    const openCourseSlotInvoiceModal = () => { courseSlotInvoiceModal.value = true; };

    const resetCourseSlotInvoiceModal = () => {
      courseSlotInvoiceModal.value = false;
      invoice.value = { number: '', file: '' };
      v$.value.invoice.$reset();
    };

    const submitCourseSlotInvoice = async () => {
      try {
        v$.value.invoice.$touch();
        if (v$.value.invoice.$error) return NotifyWarning('Champ(s) invalide(s).');

        courseSlotInvoiceLoading.value = true;

        const form = new FormData();
        selectedSlots.value.forEach(slot => form.append('courseSlots', slot._id));
        form.append('number', invoice.value.number);
        form.append('file', invoice.value.file);

        await TrainerInvoices.create(form);
        emit('refresh');
        courseSlotInvoiceModal.value = false;

        NotifyPositive('Créneaux facturés.');
      } catch (e) {
        console.error(e);
        if (e.data && e.data.statusCode === 409 && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la facturation des créneaux.');
      } finally {
        courseSlotInvoiceLoading.value = false;
      }
    };

    watch(() => trainerInfos.value, (newVal) => {
      selectedSlotIds.value = [];

      areCourseDetailsVisible.value = Object.fromEntries(
        newVal.courses.map(course => [course._id, areCourseDetailsVisible.value[course._id]])
      );
    }, { immediate: true });

    return {
      // Data
      isDashboard,
      areCourseDetailsVisible,
      selectedSlotIds,
      invoice,
      courseSlotStatusChangeModal,
      currentStatus,
      newStatus,
      statusChangeLoading,
      courseSlotInvoiceModal,
      courseSlotInvoiceLoading,
      displayDetails,
      // Validation
      v$,
      // Computed
      singleSlotColumns,
      coursesWithFormattedData,
      collectiveSlotsColumns,
      formattedTrainerDurations,
      formattedCollectiveSlots,
      selectedSlots,
      // Methods
      formatIdentity,
      displayDuration,
      goToCourse,
      isSlotSelectable,
      areMultipleSlotsSelected,
      selectSlot,
      selectSlotList,
      openCourseSlotStatusChangeModal,
      resetCourseSlotStatusChangeModal,
      submitStatusChange,
      openCourseSlotInvoiceModal,
      resetCourseSlotInvoiceModal,
      submitCourseSlotInvoice,
    };
  },
};
</script>

<style lang="sass" scoped>
.trainerInfosContainer
  display: flex
  flex-direction: row
  flex-wrap: wrap
  justify-content: space-between
  align-items: center

  @media screen and (max-width: $breakpoint-md-max)
    flex-direction: column
    align-items: flex-start
</style>
