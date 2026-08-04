import useVuelidate from '@vuelidate/core';
import pick from 'lodash/pick';
import get from 'lodash/get';
import { ref, computed } from 'vue';
import CourseSlots from '@api/CourseSlots';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { MONTH, SLOT_STATUS, MINUTE, NOT_INVOICED, INVOICED, PAID } from '@data/constants';
import { formatAndSortIdentityOptions } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import { add } from '@helpers/numbers';

export const useTrainerBillingInfos = (trainer, loggedUserIsTrainer = { value: false }) => {
  const slotsLoading = ref(false);
  const trainerBillingInfos = ref({});
  const dateRange = ref({
    startDate: CompaniDate().subtract('P3M').startOf(MONTH).toISO(),
    endDate: CompaniDate().subtract('P1M').endOf(MONTH).toISO(),
  });
  const maxMonthsPeriod = loggedUserIsTrainer.value ? 3 : 4;
  const min = ref(CompaniDate().subtract(`P${maxMonthsPeriod}M`).startOf(MONTH).toISO());
  const max = ref(CompaniDate().add(`P${maxMonthsPeriod}M`).endOf(MONTH).toISO());
  const selectedTrainer = ref('');
  const selectedStatus = ref('');
  const selectedProgram = ref('');

  const statusOptions = [
    ...Object.entries(SLOT_STATUS).map(([value, label]) => ({ label, value })),
    { label: 'Tous', value: '' },
  ];

  const rules = computed(() => ({
    dateRange: {
      startDate: { minDate: minDate(min.value) },
      endDate: { maxDate: maxDate(max.value), minDate: minDate(dateRange.value.startDate) },
    },
  }));

  const v$ = useVuelidate(rules, { dateRange });

  const refreshCourseSlots = async () => {
    try {
      await v$.value.dateRange.$touch();
      if (v$.value.dateRange.$error) return NotifyWarning('Date(s) invalide(s)');

      slotsLoading.value = true;
      const slots = await CourseSlots.list({
        startDate: dateRange.value.startDate,
        endDate: dateRange.value.endDate,
        ...get(trainer, 'value') && { trainerId: trainer.value._id },
      });
      trainerBillingInfos.value = slots;
      NotifyPositive('Créneaux de l\'intervenant·es récupérés.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la récupération des créneaux de l\'intervenant·es.');
    } finally {
      slotsLoading.value = false;
    }
  };

  const initStatusTotals = () => ({
    [NOT_INVOICED]: { duration: CompaniDuration('PT0S'), amount: 0, absenceDuration: CompaniDuration('PT0S') },
    [INVOICED]: { duration: CompaniDuration('PT0S'), amount: 0, absenceDuration: CompaniDuration('PT0S') },
    [PAID]: { duration: CompaniDuration('PT0S'), amount: 0, absenceDuration: CompaniDuration('PT0S') },
  });

  const addToStatusTotals = (totals, status, durationObj, amount, isAbsence) => ({
    ...totals,
    [status]: {
      duration: totals[status].duration.add(durationObj),
      amount: add(totals[status].amount, amount),
      absenceDuration: isAbsence ? totals[status].absenceDuration.add(durationObj) : totals[status].absenceDuration,
    },
  });

  const mergeStatusTotals = (target, source) => Object.fromEntries(
    [NOT_INVOICED, INVOICED, PAID].map(status => [status, {
      duration: target[status].duration.add(source[status].duration),
      amount: add(target[status].amount, source[status].amount),
      absenceDuration: target[status].absenceDuration.add(source[status].absenceDuration),
    }])
  );

  const getFilteredData = (data, slotFilter) => Object.fromEntries(
    Object.entries(data).map(([trainerId, trainerInfos]) => {
      // Single slots
      const courses = trainerInfos.courses
        .map((course) => {
          let courseTotals = initStatusTotals();

          const singleTraineeSlots = Object.fromEntries(
            Object.entries(course.singleTraineeSlots).map(([stepName, step]) => {
              let stepTotals = initStatusTotals();

              const filteredStepSlots = step.slots.filter(slotFilter);

              filteredStepSlots.forEach((slot) => {
                const duration = CompaniDate(slot.endDate).diff(slot.startDate, MINUTE);
                const durObj = CompaniDuration(duration);

                stepTotals = addToStatusTotals(stepTotals, slot.status, durObj, slot.amount, slot.isAbsence);
                courseTotals = addToStatusTotals(courseTotals, slot.status, durObj, slot.amount, slot.isAbsence);
              });

              return [
                stepName,
                {
                  slots: filteredStepSlots,
                  notInvoicedDuration: stepTotals[NOT_INVOICED].duration.toISO(),
                  notInvoicedAmount: stepTotals[NOT_INVOICED].amount,
                  invoicedDuration: stepTotals[INVOICED].duration.toISO(),
                  invoicedAmount: stepTotals[INVOICED].amount,
                  paidDuration: stepTotals[PAID].duration.toISO(),
                  paidAmount: stepTotals[PAID].amount,
                },
              ];
            }).filter(([, val]) => val.slots.length)
          );

          return {
            ...course,
            singleTraineeSlots,
            notInvoicedSingleSlotsDuration: courseTotals[NOT_INVOICED].duration.toISO(),
            notInvoicedSingleSlotsAmount: courseTotals[NOT_INVOICED].amount,
            notInvoicedSingleSlotsAbsenceDuration: courseTotals[NOT_INVOICED].absenceDuration.toISO(),
            invoicedSingleSlotsDuration: courseTotals[INVOICED].duration.toISO(),
            invoicedSingleSlotsAmount: courseTotals[INVOICED].amount,
            invoicedSingleSlotsAbsenceDuration: courseTotals[INVOICED].absenceDuration.toISO(),
            paidSingleSlotsDuration: courseTotals[PAID].duration.toISO(),
            paidSingleSlotsAmount: courseTotals[PAID].amount,
            paidSingleSlotsAbsenceDuration: courseTotals[PAID].absenceDuration.toISO(),
          };
        })
        .filter(c => Object.keys(c.singleTraineeSlots).length);

      // Collective slots
      let collectiveTotals = initStatusTotals();

      const collectiveSlots = Object.fromEntries(
        Object.entries(trainerInfos.collectiveSlots.slots).map(([day, daySlotGroup]) => {
          const filteredSlots = daySlotGroup.slots.filter(slotFilter);

          let dayTotals = initStatusTotals();

          const slotsByDates = {};
          filteredSlots.forEach((slot) => {
            const dur = CompaniDate(slot.endDate).diff(slot.startDate, MINUTE);
            const durObj = CompaniDuration(dur);
            const dates = `${slot.startDate}_${slot.endDate}`;
            if (!slotsByDates[dates]) {
              slotsByDates[dates] = {
                durationObj: durObj,
                amount: slot.amount,
                status: slot.status,
                allAbsent: slot.isAbsence,
              };
            } else {
              slotsByDates[dates].allAbsent = slotsByDates[dates].allAbsent && slot.isAbsence;
            }
          });

          Object.values(slotsByDates).forEach(({ durationObj, amount, status, allAbsent }) => {
            dayTotals = addToStatusTotals(dayTotals, status, durationObj, amount, allAbsent);
            collectiveTotals = addToStatusTotals(collectiveTotals, status, durationObj, amount, allAbsent);
          });

          return [
            day,
            {
              slots: filteredSlots,
              notInvoicedDuration: dayTotals[NOT_INVOICED].duration.toISO(),
              notInvoicedAmount: dayTotals[NOT_INVOICED].amount,
              invoicedDuration: dayTotals[INVOICED].duration.toISO(),
              invoicedAmount: dayTotals[INVOICED].amount,
              paidDuration: dayTotals[PAID].duration.toISO(),
              paidAmount: dayTotals[PAID].amount,
            },
          ];
        }).filter(([, val]) => val.slots.length)
      );

      // Trainer totals
      const singleSlotsTotals = courses.reduce((acc, c) => mergeStatusTotals(acc, {
        [NOT_INVOICED]: {
          duration: CompaniDuration(c.notInvoicedSingleSlotsDuration),
          amount: c.notInvoicedSingleSlotsAmount,
          absenceDuration: CompaniDuration(c.notInvoicedSingleSlotsAbsenceDuration),
        },
        [INVOICED]: {
          duration: CompaniDuration(c.invoicedSingleSlotsDuration),
          amount: c.invoicedSingleSlotsAmount,
          absenceDuration: CompaniDuration(c.invoicedSingleSlotsAbsenceDuration),
        },
        [PAID]: {
          duration: CompaniDuration(c.paidSingleSlotsDuration),
          amount: c.paidSingleSlotsAmount,
          absenceDuration: CompaniDuration(c.paidSingleSlotsAbsenceDuration),
        },
      }), initStatusTotals());

      const trainerTotals = mergeStatusTotals(singleSlotsTotals, collectiveTotals);

      return [
        trainerId,
        {
          ...trainerInfos,
          courses,
          collectiveSlots: {
            slots: collectiveSlots,
            totals: {
              notInvoicedCollectiveSlotsDuration: collectiveTotals[NOT_INVOICED].duration.toISO(),
              notInvoicedCollectiveSlotsAmount: collectiveTotals[NOT_INVOICED].amount,
              notInvoicedCollectiveSlotsAbsenceDuration: collectiveTotals[NOT_INVOICED].absenceDuration.toISO(),
              invoicedCollectiveSlotsDuration: collectiveTotals[INVOICED].duration.toISO(),
              invoicedCollectiveSlotsAmount: collectiveTotals[INVOICED].amount,
              invoicedCollectiveSlotsAbsenceDuration: collectiveTotals[INVOICED].absenceDuration.toISO(),
              paidCollectiveSlotsDuration: collectiveTotals[PAID].duration.toISO(),
              paidCollectiveSlotsAmount: collectiveTotals[PAID].amount,
              paidCollectiveSlotsAbsenceDuration: collectiveTotals[PAID].absenceDuration.toISO(),
            },
          },
          totalNotInvoicedSlotsDuration: trainerTotals[NOT_INVOICED].duration.toISO(),
          totalNotInvoicedSlotsAbsenceDuration: trainerTotals[NOT_INVOICED].absenceDuration.toISO(),
          totalNotInvoicedSlotsAmount: trainerTotals[NOT_INVOICED].amount,
          totalInvoicedSlotsDuration: trainerTotals[INVOICED].duration.toISO(),
          totalInvoicedSlotsAbsenceDuration: trainerTotals[INVOICED].absenceDuration.toISO(),
          totalInvoicedSlotsAmount: trainerTotals[INVOICED].amount,
          totalPaidSlotsDuration: trainerTotals[PAID].duration.toISO(),
          totalPaidSlotsAbsenceDuration: trainerTotals[PAID].absenceDuration.toISO(),
          totalPaidSlotsAmount: trainerTotals[PAID].amount,
        },
      ];
    })
  );

  const slotFilter = (slot) => {
    if (selectedProgram.value && slot.tradeName !== selectedProgram.value) return false;
    if (selectedStatus.value && slot.status !== selectedStatus.value) return false;
    return true;
  };

  const filteredData = computed(() => {
    let data = trainerBillingInfos.value;
    if (selectedTrainer.value) data = pick(data, selectedTrainer.value);
    if (!selectedProgram.value && !selectedStatus.value) return data;
    return getFilteredData(data, slotFilter);
  });

  const trainerOptions = computed(() => [
    { label: 'Tous les intervenant·es', value: '' },
    ...formatAndSortIdentityOptions(
      Object.entries(trainerBillingInfos.value)
        .filter(([, t]) => t.courses.length || Object.keys(t.collectiveSlots.slots).length)
        .map(([trainerId, t]) => ({ _id: trainerId, identity: t.identity }))
    ),
  ]);

  const programOptions = computed(() => {
    const tradeNames = Object.values(trainerBillingInfos.value).flatMap((t) => {
      const singleTraineeSlotsTradeNames = t.courses
        .flatMap(c => Object.values(c.singleTraineeSlots).flatMap(stepInfos => stepInfos.slots.map(s => s.tradeName)));
      const collectiveSlotsTradeNames = Object.values(t.collectiveSlots.slots)
        .flatMap(slotGroup => (slotGroup.slots || []).map(s => s.tradeName));

      return [...singleTraineeSlotsTradeNames, ...collectiveSlotsTradeNames];
    });

    const uniqTradeNames = [...new Set(tradeNames)];

    return [
      { label: 'Tous les programmes', value: '' },
      ...uniqTradeNames.map(name => ({ label: name, value: name })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  });

  const dateRangeErrorMessage = computed(() => {
    if (CompaniDate(dateRange.value.endDate).isBefore(dateRange.value.startDate)) {
      return 'La date de fin doit être postérieure à la date de début';
    }

    if (CompaniDate(dateRange.value.startDate).add(`P${maxMonthsPeriod}M`).isBefore(dateRange.value.endDate)) {
      return `Date(s) invalide(s) : la période maximale est ${maxMonthsPeriod} mois`;
    }

    return '';
  });

  const input = (date) => {
    min.value = CompaniDate(date.endDate).subtract(`P${maxMonthsPeriod}M`).add('P1D').toISO();
    max.value = CompaniDate(date.startDate).add(`P${maxMonthsPeriod}M`).subtract('P1D').toISO();
  };

  const goToPreviousMonth = () => {
    const date = CompaniDate(dateRange.value.startDate).startOf(MONTH).subtract('P3M');
    dateRange.value = { startDate: date.toISO(), endDate: date.add('P2M').endOf(MONTH).toISO() };
    input(dateRange.value);
  };

  const goToNextMonth = () => {
    const date = CompaniDate(dateRange.value.startDate).startOf(MONTH).add('P3M');
    dateRange.value = { startDate: date.toISO(), endDate: date.add('P2M').endOf(MONTH).toISO() };
    input(dateRange.value);
  };

  return {
    // Data
    dateRange,
    selectedStatus,
    selectedTrainer,
    statusOptions,
    selectedProgram,
    slotsLoading,
    // Computed
    v$,
    filteredData,
    trainerOptions,
    dateRangeErrorMessage,
    programOptions,
    // Methods
    refreshCourseSlots,
    input,
    goToPreviousMonth,
    goToNextMonth,
  };
};
