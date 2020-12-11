import { mapState } from 'vuex';
import get from 'lodash/get';
import set from 'lodash/set';
import Cards from '@api/Cards';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import { QUESTION_MAX_LENGTH, REQUIRED_LABEL, UPLOAD_EXTENSION_OPTIONS } from '@data/constants';
import {
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  UPLOAD_IMAGE,
  UPLOAD_VIDEO,
  UPLOAD_AUDIO,
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  QUESTION_ANSWER,
} from '../../../core/data/constants';

export const templateMixin = {
  data () {
    return {
      tmpInput: '',
      imageExtensions: IMAGE_EXTENSIONS,
      extensionOptions: UPLOAD_EXTENSION_OPTIONS,
      isUploading: false,
    };
  },
  computed: {
    ...mapState('program', ['card', 'activity']),
    mediaFileName () {
      return this.card.title ? this.card.title.replace(/ /g, '_') : this.activity.name.replace(/ /g, '_');
    },
    mediaUploadUrl () {
      return `${process.env.API_HOSTNAME}/cards/${this.card._id}/upload`;
    },
    questionErrorMsg () {
      if (!this.$v.card.question.required) return REQUIRED_LABEL;
      if (!this.$v.card.question.maxLength) return `${QUESTION_MAX_LENGTH} caractères maximum.`;
      return '';
    },
    extensions () {
      switch (this.card.media.type) {
        case UPLOAD_VIDEO:
          return VIDEO_EXTENSIONS;
        case UPLOAD_AUDIO:
          return AUDIO_EXTENSIONS;
        case UPLOAD_IMAGE:
          return IMAGE_EXTENSIONS;
        default:
          return '';
      }
    },
    maxFileSize () {
      switch (this.card.media.type) {
        case UPLOAD_IMAGE:
          return 300 * 1000;
        case UPLOAD_AUDIO:
          return 5 * 1000 * 1000;
        case UPLOAD_VIDEO:
          return 25 * 1000 * 1000;
        default:
      }
    },
  },
  methods: {
    start () {
      this.isUploading = true;
    },
    finish () {
      this.isUploading = false;
    },
    saveTmp (path) {
      this.tmpInput = get(this.card, path);
    },
    async updateCard (path) {
      try {
        const value = get(this.card, path);
        if (this.tmpInput === value) return;

        const validation = get(this.$v.card, path);
        if (validation) {
          validation.$touch();
          if (validation.$error) return NotifyWarning('Champ(s) invalide(s)');
        }

        await Cards.updateById(this.card._id, set({}, path, typeof value === 'string' ? value.trim() : value));

        await this.refreshCard();
        NotifyPositive('Carte mise à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la mise à jour de la carte.');
      }
    },
    async updateTextAnswer (index) {
      try {
        const key = this.getAnswerKeyToUpdate(this.card.template);
        const editedAnswer = get(this.card, `${key}[${index}]`);

        if (this.tmpInput === editedAnswer.text) return;

        get(this.$v, `card.${key}.$each[${index}]`).$touch();
        if (get(this.$v, `card.${key}.$each[${index}].text.$error`)) return NotifyWarning('Champ(s) invalide(s).');

        await Cards.updateAnswer(
          { cardId: this.card._id, answerId: editedAnswer._id }, { text: editedAnswer.text.trim() }
        );

        await this.refreshCard();
        NotifyPositive('Carte mise à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la mise à jour de la carte.');
      }
    },
    async refreshCard () {
      try {
        await this.$store.dispatch('program/fetchActivity', { activityId: this.activity._id });
        const card = this.activity.cards.find(c => c._id === this.card._id);
        this.$store.dispatch('program/fetchCard', card);
      } catch (e) {
        console.error(e);
      }
    },
    async mediaUploaded () {
      try {
        await this.refreshCard();
        NotifyPositive('Média envoyé');
      } catch (e) {
        NotifyNegative('Erreur lors de l\'envoi du média');
      }
    },
    async deleteMedia () {
      try {
        if (get(this.card, 'media')) {
          await Cards.deleteMedia(this.card._id);

          await this.refreshCard();
          NotifyPositive('Média supprimé');
        } else NotifyNegative('Erreur lors de la suppression du média.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du média.');
      }
    },
    validateMediaDeletion (path) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Es-tu sûr(e) de vouloir supprimer ce média ?',
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => this.deleteMedia(path))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
    getAnswerKeyToUpdate (template) {
      if ([MULTIPLE_CHOICE_QUESTION, SINGLE_CHOICE_QUESTION, QUESTION_ANSWER].includes(template)) return 'qcAnswers';

      return '';
    },
  },
};
