<template>
  <div class="history">
    <div class="history-cell">
      <div class="history-title">
        <div class="history-title-text">
          {{ formatedHistory.title.pre }}
          <span class="history-type">{{ formatedHistory.title.type }}</span>
          {{ formatedHistory.title.post }}
          <span class="history-info"> {{ formatedHistory.title.infos }}.</span>
        </div>
        <ni-button class="history-button" v-if="formatedHistory.details" color="primary" size="sm" icon="remove_red_eye"
          @click="toggleDetails" />
      </div>
      <div class="history-details" v-if="displayDetails">
        <div>{{ formatedHistory.details }}</div>
      </div>
      <div class="history-signature">
        <img :src="getAvatar(courseHistory.createdBy)" class="avatar history-avatar">
        <div>{{ historySignature }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, toRefs } from 'vue';
import get from 'lodash/get';
import {
  SLOT_CREATION,
  DEFAULT_AVATAR,
  SLOT_DELETION,
  SLOT_EDITION,
  TRAINEE_ADDITION,
  TRAINEE_DELETION,
  ESTIMATED_START_DATE_EDITION,
  DD_MM_YYYY,
  HHhMM,
  COMPANY_ADDITION,
  COMPANY_DELETION,
  TRAINER_ADDITION,
  TRAINER_DELETION,
  COURSE_INTERRUPTION,
  COURSE_RESTART,
} from '@data/constants';
import Button from '@components/Button';
import CompaniDate from '@helpers/dates/companiDates';
import { formatIdentity } from '@helpers/utils';

export default {
  name: 'CourseHistory',
  props: {
    courseHistory: { type: Object, required: true },
  },
  components: {
    'ni-button': Button,
  },
  setup (props) {
    const displayDetails = ref(false);
    const { courseHistory } = toRefs(props);

    const historySignature = computed(() => {
      const date = CompaniDate(courseHistory.value.createdAt).format(DD_MM_YYYY);
      const hour = CompaniDate(courseHistory.value.createdAt).format(HHhMM);
      const user = formatIdentity(courseHistory.value.createdBy.identity, 'FL');

      return `${user} le ${date} à ${hour}.`;
    });

    const toggleDetails = () => { displayDetails.value = !displayDetails.value; };

    const getAvatar = user => get(user, 'picture.link') || DEFAULT_AVATAR;

    const getSlotCreationTitle = () => {
      const date = CompaniDate(courseHistory.value.slot.startDate).format(DD_MM_YYYY);
      const startHour = CompaniDate(courseHistory.value.slot.startDate).format(HHhMM);
      const endHour = CompaniDate(courseHistory.value.slot.endDate).format(HHhMM);
      const infos = `${date} de ${startHour} à ${endHour}`;

      return { pre: 'Nouveau', type: 'créneau', post: 'le', infos };
    };

    const getSlotCreationDetails = () => get(courseHistory.value, 'slot.address.fullAddress') ||
      get(courseHistory.value, 'slot.meetingLink') ||
      'Pas d\'adresse renseignée.';

    const getSlotDeletionTitle = () => {
      const date = CompaniDate(courseHistory.value.slot.startDate).format(DD_MM_YYYY);

      return { pre: 'Suppression du', type: 'créneau', post: 'du', infos: date };
    };

    const getSlotDeletionDetails = () => {
      let address = '.\r\nPas d\'adresse renseignée.';
      if (get(courseHistory.value, 'slot.address.fullAddress')) {
        address = ` au ${get(courseHistory.value, 'slot.address.fullAddress')}`;
      } else if (get(courseHistory.value, 'slot.meetingLink')) {
        address = ` sur ${get(courseHistory.value, 'slot.meetingLink')}`;
      }

      return `Créneau initialement prévu de ${CompaniDate(courseHistory.value.slot.startDate).format(HHhMM)}`
        + ` à ${CompaniDate(courseHistory.value.slot.endDate).format(HHhMM)}${address}`;
    };

    const getSlotEditionTitle = () => {
      if (courseHistory.value.update.startDate && courseHistory.value.update.startHour) {
        const previousStartDate = CompaniDate(courseHistory.value.update.startDate.from).format(DD_MM_YYYY);
        const startDate = CompaniDate(courseHistory.value.update.startDate.to).format(DD_MM_YYYY);
        const startHour = CompaniDate(courseHistory.value.update.startHour.to).format(HHhMM);
        const endHour = CompaniDate(courseHistory.value.update.endHour.to).format(HHhMM);

        return {
          pre: 'Nouvelles',
          type: 'date et horaire',
          post: ' pour le créneau du',
          infos: `${previousStartDate} : le ${startDate} de ${startHour} à ${endHour}`,
        };
      }
      if (courseHistory.value.update.startDate) {
        const from = CompaniDate(courseHistory.value.update.startDate.from).format(DD_MM_YYYY);
        const to = CompaniDate(courseHistory.value.update.startDate.to).format(DD_MM_YYYY);

        return { type: 'Créneau', post: ' déplacé du', infos: `${from} au ${to}` };
      }
      if (courseHistory.value.update.startHour) {
        const date = CompaniDate(courseHistory.value.update.startHour.from).format(DD_MM_YYYY);
        const startHour = CompaniDate(courseHistory.value.update.startHour.to).format(HHhMM);
        const endHour = CompaniDate(courseHistory.value.update.endHour.to).format(HHhMM);

        return { type: 'Nouvel horaire', post: ' pour le créneau du', infos: `${date} : ${startHour} - ${endHour}` };
      }
      return '';
    };

    const getSlotEditionDetails = () => {
      if (courseHistory.value.update.startDate && courseHistory.value.update.startHour) {
        const previousStartDate = CompaniDate(courseHistory.value.update.startDate.from).format(DD_MM_YYYY);
        const previousStartHour = CompaniDate(courseHistory.value.update.startHour.from).format(HHhMM);
        const previousEndHour = CompaniDate(courseHistory.value.update.endHour.from).format(HHhMM);

        return `Créneau initialement prévu le ${previousStartDate} de ${previousStartHour} à ${previousEndHour}`;
      }
      if (courseHistory.value.update.startHour) {
        const previousStartHour = CompaniDate(courseHistory.value.update.startHour.from).format(HHhMM);
        const previousEndHour = CompaniDate(courseHistory.value.update.endHour.from).format(HHhMM);

        return `Créneau initialement prévu de ${previousStartHour} à ${previousEndHour}`;
      }
      return '';
    };

    const getTraineeAdditionTitle = () => ({
      pre: 'Ajout d\'un(e)',
      type: 'stagiaire',
      post: 'à la formation\u00A0:',
      infos: `\r\n${formatIdentity(courseHistory.value.trainee.identity, 'FL')}`,
    });

    const getTraineeDeletionTitle = () => ({
      pre: 'Retrait d\'un(e)',
      type: 'stagiaire',
      post: 'de la formation\u00A0:',
      infos: `\r\n${formatIdentity(courseHistory.value.trainee.identity, 'FL')}`,
    });

    const getEstimatedStartDateEditionTitle = () => ({
      pre: 'Nouvelle',
      type: 'date de démarrage souhaitée',
      post: 'le',
      infos: CompaniDate(courseHistory.value.update.estimatedStartDate.to).format(DD_MM_YYYY),
    });

    const getEstimatedStartDateEditionDetails = () => {
      if (courseHistory.value.update.estimatedStartDate.from) {
        const previousStartDate = CompaniDate(courseHistory.value.update.estimatedStartDate.from).format(DD_MM_YYYY);

        return `Début précédemment souhaité le ${previousStartDate}`;
      }
      return '';
    };

    const getCompanyAdditionTitle = () => ({
      pre: 'Rattachement d\'une',
      type: 'structure',
      post: 'à la formation\u00A0:',
      infos: `\r\n${courseHistory.value.company.name}`,
    });

    const getCompanyDeletionTitle = () => ({
      pre: 'Détachement d\'une',
      type: 'structure',
      post: 'de la formation\u00A0:',
      infos: `\r\n${courseHistory.value.company.name}`,
    });

    const getTrainerAdditionTitle = () => ({
      pre: 'Ajout d\'un(e)',
      type: 'intervenant(e)',
      post: 'à la formation\u00A0:',
      infos: `\r\n${formatIdentity(courseHistory.value.trainer.identity, 'FL')}`,
    });

    const getTrainerDeletionTitle = () => ({
      pre: 'Retrait d\'un(e)',
      type: 'intervenant(e)',
      post: 'de la formation\u00A0:',
      infos: `\r\n${formatIdentity(courseHistory.value.trainer.identity, 'FL')}`,
    });

    const getInterruptionTitle = () => ({ type: 'Mise en pause', post: 'de la formation' });

    const getRestartTitle = () => ({ type: 'Reprise', post: 'de la formation' });

    const formatedHistory = computed(() => {
      switch (courseHistory.value.action) {
        case TRAINEE_DELETION:
          return { title: getTraineeDeletionTitle() };
        case TRAINEE_ADDITION:
          return { title: getTraineeAdditionTitle() };
        case TRAINER_ADDITION:
          return { title: getTrainerAdditionTitle() };
        case TRAINER_DELETION:
          return { title: getTrainerDeletionTitle() };
        case COMPANY_ADDITION:
          return { title: getCompanyAdditionTitle() };
        case COMPANY_DELETION:
          return { title: getCompanyDeletionTitle() };
        case SLOT_DELETION:
          return { title: getSlotDeletionTitle(), details: getSlotDeletionDetails() };
        case SLOT_EDITION:
          return { title: getSlotEditionTitle(), details: getSlotEditionDetails() };
        case ESTIMATED_START_DATE_EDITION:
          return { title: getEstimatedStartDateEditionTitle(), details: getEstimatedStartDateEditionDetails() };
        case COURSE_INTERRUPTION:
          return { title: getInterruptionTitle() };
        case COURSE_RESTART:
          return { title: getRestartTitle() };
        case SLOT_CREATION:
        default:
          return { title: getSlotCreationTitle(), details: getSlotCreationDetails() };
      }
    });

    return {
      // Data
      displayDetails,
      // Computed
      formatedHistory,
      historySignature,
      // Methods
      toggleDetails,
      getAvatar,
    };
  },
};
</script>
