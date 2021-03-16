import get from 'lodash/get';
import omit from 'lodash/omit';
import Pay from '@api/Pay';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import { END_CONTRACT_REASONS, SURCHARGES } from '@data/constants';
import { formatPrice, formatIdentity, formatHours, formatNumberForCSV } from '@helpers/utils';
import { downloadCsv, downloadFile } from '@helpers/file';
import moment from '@helpers/moment';

export const payMixin = {
  data () {
    return {
      columns: [
        {
          name: 'auxiliary',
          label: 'Auxiliaire',
          align: 'left',
          field: 'auxiliary',
          format: value => (value ? formatIdentity(value.identity, 'LF') : ''),
          sort: (a, b) => formatIdentity(a.identity, 'LF').localeCompare(formatIdentity(b.identity, 'LF')),
        },
        {
          name: 'sector',
          label: 'Équipe',
          align: 'left',
          field: 'auxiliary',
          format: value => (value && value.sector ? value.sector.name : ''),
          sort: (a, b) => get(a, 'sector.name', '').localeCompare(get(b, 'sector.name', '')),
        },
        {
          name: 'startDate',
          label: 'Début',
          align: 'left',
          field: 'startDate',
          format: value => (value ? moment(value).format('DD/MM') : ''),
          sort: (a, b) => new Date(a) - new Date(b),
        },
        {
          name: 'endNotificationDate',
          label: 'Date de notif',
          align: 'left',
          field: 'endNotificationDate',
          format: value => (value ? moment(value).format('DD/MM') : ''),
        },
        {
          name: 'endReason',
          label: 'Motif',
          align: 'left',
          field: 'endReason',
          format: (value) => {
            const reason = END_CONTRACT_REASONS.find(r => r.value === value);
            return reason ? reason.label : '';
          },
        },
        {
          name: 'endDate',
          label: 'Fin',
          align: 'left',
          field: 'endDate',
          format: value => (value ? moment(value).format('DD/MM') : ''),
        },
        {
          name: 'contractHours',
          label: 'Heures contrat',
          align: 'center',
          field: 'contractHours',
          format: value => formatHours(value),
        },
        {
          name: 'absencesHours',
          label: 'Heures d\'absences',
          align: 'center',
          field: row => row.absencesHours - (get(row, 'diff.absencesHours') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'hoursToWork',
          label: 'Heures à travailler',
          align: 'center',
          field: row => row.hoursToWork - (get(row, 'diff.absencesHours') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'workedHours',
          label: 'Heures travaillées',
          align: 'center',
          field: row => row.workedHours + (get(row, 'diff.workedHours') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'notSurchargedAndExempt',
          label: 'Dont exo non majo',
          align: 'center',
          field: row => row.notSurchargedAndExempt + (get(row, 'diff.notSurchargedAndExempt') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'surchargedAndExempt',
          label: 'Dont exo et majo',
          align: 'center',
          field: row => row.surchargedAndExempt + (get(row, 'diff.surchargedAndExempt') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'notSurchargedAndNotExempt',
          label: 'Dont non exo et non majo ',
          align: 'center',
          field: row => row.notSurchargedAndNotExempt + (get(row, 'diff.notSurchargedAndNotExempt') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'surchargedAndNotExempt',
          label: 'Dont non exo et majo',
          align: 'center',
          field: row => row.surchargedAndNotExempt + (get(row, 'diff.surchargedAndNotExempt') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'paidTransportHours',
          label: 'Temps de transport',
          align: 'center',
          field: row => row.paidTransportHours - (get(row, 'diff.paidTransportHours') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'hoursBalance',
          label: 'Solde heures',
          align: 'center',
          field: row => row.hoursBalance + (get(row, 'diff.hoursBalance') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'diff',
          label: 'Dont rattrapage',
          align: 'center',
          field: row => (get(row, 'diff.hoursBalance') || 0),
          format: value => formatHours(value),
        },
        {
          name: 'previousMonthHoursCounter',
          label: 'Compteur M-1',
          align: 'center',
          field: row => row.previousMonthHoursCounter,
          format: value => formatHours(value),
        },
        {
          name: 'hoursCounter',
          label: 'Compteur',
          align: 'center',
          field: row => row.hoursCounter - row.additionalHours - row.overtimeHours,
          format: value => formatHours(value),
        },
        {
          name: 'overtimeHours',
          label: 'Heures sup',
          align: 'center',
          field: 'overtimeHours',
          format: value => formatHours(value),
        },
        {
          name: 'additionalHours',
          label: 'Heures comp',
          align: 'center',
          field: 'additionalHours',
          format: value => formatHours(value),
        },
        {
          name: 'mutual',
          label: 'Mutuelle',
          align: 'center',
          field: 'mutual',
          format: value => (value ? 'Oui' : 'Non'),
          sort: (a, b) => {
            if (a === b) return 0;
            if (a) return -1;
            return 1;
          },
        },
        {
          name: 'transport',
          label: 'Transport',
          align: 'center',
          field: 'transport',
          format: formatPrice,
        },
        {
          name: 'phoneFees',
          label: 'Frais tél',
          align: 'center',
          field: 'phoneFees',
          format: formatPrice,
        },
        {
          name: 'bonus',
          label: 'Prime',
          align: 'center',
          field: 'bonus',
          format: formatPrice,
        },
        {
          name: 'compensation',
          label: 'Indémnité',
          align: 'center',
          field: 'compensation',
          format: formatPrice,
        },
      ],
      period: 0,
      periodOptions: [
        { label: 'Mois en cours', value: 0 },
        { label: 'Mois précédent', value: 1 },
      ],
      dates: {
        startDate: moment().startOf('M').toISOString(),
        endDate: moment().endOf('M').toISOString(),
      },
      pay: {},
      surchargeDetailKey: '',
    };
  },
  methods: {
    formatPayload (payload) {
      return {
        ...omit(
          payload,
          ['auxiliaryId', 'additionalHoursEdition', 'overtimeHoursEdition', 'bonusEdition', 'hoursCounterEdition',
            'compensationEdition', 'paidKm']
        ),
        hoursCounter: payload.hoursCounter - payload.overtimeHours - payload.additionalHours,
        auxiliary: payload.auxiliary._id,
      };
    },
    formatSurchargeDetails (details) {
      if (!details) return '';

      const formattedPlans = [];
      for (const plan of Object.keys(details)) {
        const surchages = Object.entries(omit(details[plan], 'planName'));
        if (surchages.length === 0) continue;

        const lines = [details[plan].planName];
        for (const [surchageKey, surcharge] of surchages) {
          lines.push(`${SURCHARGES[surchageKey]}, ${surcharge.percentage}%, ${formatHours(surcharge.hours)}`);
        }
        formattedPlans.push(lines.join(' / '));
      }

      return formattedPlans.join('\r\n');
    },
    formatHoursWithDiff (pay, key) {
      let hours = pay[key];
      if (pay.diff && pay.diff[key]) hours += pay.diff[key];

      return formatNumberForCSV(hours);
    },
    setSelectedPeriod (offset) {
      this.dates = {
        startDate: moment().subtract(offset, 'M').startOf('M').toISOString(),
        endDate: moment().subtract(offset, 'M').endOf('M').toISOString(),
      };
    },
    async exportToCSV () {
      const csvData = [[
        'Auxiliaire - Nom',
        'Auxiliaire - Prénom',
        'Équipe',
        'Début',
        'Fin',
        'Heures contrat',
        'Heures d\'absence',
        'Heures à travailler',
        'Heures travaillées',
        'Dont exo non majo',
        'Dont exo et majo',
        'Details exo et majo',
        'Dont non exo et non majo ',
        'Dont non exo et majo',
        'Details non exo et majo',
        'Temps de transport',
        'Solde heures',
        'Dont rattrapage',
        'Compteur',
        'Heures sup à payer',
        'Heures comp à payer',
        'Mutuelle',
        'Transport',
        'Frais téléphoniques',
        'Prime',
      ]];

      for (const draftPay of this.displayedDraftPay) {
        const { auxiliary, startDate, endDate } = draftPay;
        csvData.push([
          get(auxiliary, 'identity.lastname') || '',
          get(auxiliary, 'identity.firstname') || '',
          get(auxiliary, 'sector.name') || '',
          startDate ? moment(startDate).format('DD/MM/YYYY') : '',
          endDate ? moment(endDate).format('DD/MM/YYYY') : '',
          formatNumberForCSV(draftPay.contractHours),
          this.formatHoursWithDiff(draftPay, 'absencesHours'),
          formatNumberForCSV(draftPay.hoursToWork - draftPay.diff.absencesHours),
          this.formatHoursWithDiff(draftPay, 'workedHours'),
          this.formatHoursWithDiff(draftPay, 'notSurchargedAndExempt'),
          this.formatHoursWithDiff(draftPay, 'surchargedAndExempt'),
          `"${this.formatSurchargeDetails(draftPay.surchargedAndExemptDetails)}"` || '',
          this.formatHoursWithDiff(draftPay, 'notSurchargedAndNotExempt'),
          this.formatHoursWithDiff(draftPay, 'surchargedAndNotExempt'),
          `"${this.formatSurchargeDetails(draftPay.surchargedAndNotExemptDetails)}"` || '',
          this.formatHoursWithDiff(draftPay, 'paidTransportHours'),
          this.formatHoursWithDiff(draftPay, 'hoursBalance'),
          get(draftPay, 'diff.hoursBalance') ? formatNumberForCSV(draftPay.diff.hoursBalance) : '0,00',
          formatNumberForCSV(draftPay.hoursCounter),
          formatNumberForCSV(draftPay.overtimeHours),
          formatNumberForCSV(draftPay.additionalHours),
          draftPay.mutual ? 'Oui' : 'Non',
          formatNumberForCSV(draftPay.transport),
          formatNumberForCSV(draftPay.phoneFees),
          formatNumberForCSV(draftPay.bonus),
        ]);
      }

      return downloadCsv(csvData, `Paie_${moment().format('MM_YYYY')}.csv`);
    },
    async exportTxt (type) {
      try {
        const txt = await Pay.export(type, this.dates);
        await downloadFile(txt, `${type}_${moment(this.dates.startDate).format('MM_YYYY')}.txt`);

        NotifyPositive('Document téléchargé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement du document.');
      }
    },
    shouldDisplayDetails (id, details, draftPays) {
      const draft = draftPays.find(dp => dp.auxiliary._id === id);
      if (!draft) return false;

      return Object.keys(draft[details]).length || (draft.diff[details] && Object.keys(draft.diff[details]).length);
    },
    openSurchargeDetailModal (id, details, draftPays) {
      const draft = draftPays.find(ds => ds.auxiliary._id === id);
      if (!draft) return;

      this.pay = draft;
      this.surchargeDetailKey = details;
      this.surchargeDetailModal = true;
    },
    resetSurchargeDetail () {
      this.pay = {};
      this.surchargeDetailKey = '';
    },
  },
};
