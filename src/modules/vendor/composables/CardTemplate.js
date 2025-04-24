import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import get from 'lodash/get';
import set from 'lodash/set';
import Cards from '@api/Cards';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import {
  FILL_THE_GAPS,
  MULTIPLE_CHOICE_QUESTION,
  ORDER_THE_SEQUENCE,
  QUESTION_ANSWER,
  SINGLE_CHOICE_QUESTION,
  QUESTION_OR_TITLE_MAX_LENGTH,
  REQUIRED_LABEL,
  UPLOAD_IMAGE,
  UPLOAD_VIDEO,
  UPLOAD_AUDIO,
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  PUBLISHED,
} from '@data/constants';

export const useCardTemplate = (card, v$, refreshCard, cardParent) => {
  const tmpInput = ref('');
  const isUploading = ref(false);
  const $q = useQuasar();

  const mediaFileName = computed(() => {
    if (card.value && card.value.title) return card.value.title.replace(/ /g, '_');

    return cardParent.value.name.replace(/ /g, '_');
  });

  const mediaUploadUrl = computed(() => `${process.env.API_HOSTNAME}/cards/${card.value._id}/upload`);

  const extensions = computed(() => {
    switch (card.value.media.type) {
      case UPLOAD_VIDEO:
        return VIDEO_EXTENSIONS;
      case UPLOAD_AUDIO:
        return AUDIO_EXTENSIONS;
      case UPLOAD_IMAGE:
        return IMAGE_EXTENSIONS;
      default:
        return '';
    }
  });

  const maxFileSize = computed(() => {
    switch (card.value.media.type) {
      case UPLOAD_IMAGE:
        return 300 * 1000;
      case UPLOAD_AUDIO:
        return 5 * 1000 * 1000;
      case UPLOAD_VIDEO:
        return 25 * 1000 * 1000;
      default:
        return 0;
    }
  });

  const saveTmp = (path) => {
    tmpInput.value = get(card.value, path);
  };

  const updateCard = async (path) => {
    try {
      const value = get(card.value, path);
      if (tmpInput.value === value) return;

      const validation = get(v$.value.card, path);
      if (validation) {
        validation.$touch();
        if (validation.$error) return NotifyWarning('Champ(s) invalide(s)');
      }

      await Cards.updateById(card.value._id, set({}, path, typeof value === 'string' ? value.trim() : value));

      await refreshCard();
      NotifyPositive('Carte mise à jour.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la mise à jour de la carte.');
    }
  };

  const requiredOneCorrectAnswer = (path, index) => !get(v$.value, `card.${path}.minOneCorrectAnswer.$response`) &&
    !!`card.value.${path}[${index}].text`;

  const getError = (path, index) => !!get(v$.value, `card.${path}.$dirty`) &&
    get(v$.value, `card.${path}.$each.$response.$errors[${index}].text.0.$response`) === false;

  const getAnswerKeyToUpdate = (template) => {
    if ([MULTIPLE_CHOICE_QUESTION, SINGLE_CHOICE_QUESTION, QUESTION_ANSWER].includes(template)) return 'qcAnswers';
    if (template === ORDER_THE_SEQUENCE) return 'orderedAnswers';
    if (template === FILL_THE_GAPS) return 'gapAnswers';

    return '';
  };

  const updateTextAnswer = async (index) => {
    try {
      const key = getAnswerKeyToUpdate(card.value.template);
      const editedAnswer = get(card.value, `${key}[${index}]`);

      if (tmpInput.value === editedAnswer.text) return;

      get(v$.value, `card.${key}`).$touch();
      const validation = get(v$.value, `card.${key}.$each.$response.$errors[${index}].text.0.$response`);
      if (validation === false) return NotifyWarning('Champ(s) invalide(s).');

      await Cards.updateAnswer(
        { cardId: card.value._id, answerId: editedAnswer._id },
        { text: editedAnswer.text.trim() }
      );

      await refreshCard();
      NotifyPositive('Carte mise à jour.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la mise à jour de la carte.');
    }
  };

  const updateCorrectAnswer = async (editedAnswer) => {
    try {
      await Cards.updateAnswer(
        { cardId: card.value._id, answerId: editedAnswer._id },
        { isCorrect: editedAnswer.isCorrect }
      );

      await refreshCard();
      NotifyPositive('Carte mise à jour.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la mise à jour de la carte.');
    }
  };

  const updateGappedTextCard = async () => {
    try {
      const value = get(card.value, 'gappedText');
      if (tmpInput.value === value) return;

      const validation = get(v$.value.card, 'gappedText');
      if (validation) {
        validation.$touch();
        const error = !validation.required.$response || !validation.validTagsCount.$response ||
          (cardParent.value.status === PUBLISHED && !validation.matchingTagsCount.$response);
        if (error) return NotifyWarning('Champ(s) invalide(s)');
      }

      await Cards.updateById(card.value._id, { gappedText: value.trim() });

      await refreshCard();
      NotifyPositive('Carte mise à jour.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la mise à jour de la carte.');
    }
  };

  const addAnswer = async () => {
    try {
      await Cards.addAnswer(card.value._id);
      await refreshCard();

      NotifyPositive('Réponse ajoutée.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de l\'ajout de la réponse.');
    }
  };

  const validateAnswerDeletion = (index) => {
    $q.dialog({
      title: 'Confirmation',
      message: 'Êtes-vous sûr(e) de vouloir supprimer cette réponse&nbsp;?',
      html: true,
      ok: true,
      cancel: 'Annuler',
    }).onOk(() => deleteAnswer(index))
      .onCancel(() => NotifyPositive('Suppression annulée.'));
  };

  const deleteAnswer = async (index) => {
    try {
      const key = getAnswerKeyToUpdate(card.value.template);
      const answerId = get(card.value, `${key}[${index}]._id`);
      if (!answerId) return;

      await Cards.deleteAnswer({ cardId: card.value._id, answerId });

      await refreshCard();
      NotifyPositive('Réponse supprimée avec succès.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la suppression de la réponse.');
    }
  };

  const mediaUploaded = async () => {
    try {
      await refreshCard();
      NotifyPositive('Média envoyé');
    } catch (e) {
      NotifyNegative('Erreur lors de l\'envoi du média');
    }
  };

  const deleteMedia = async () => {
    try {
      if (get(card.value, 'media')) {
        await Cards.deleteMedia(card.value._id);

        await refreshCard();
        NotifyPositive('Média supprimé');
      } else NotifyNegative('Erreur lors de la suppression du média.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la suppression du média.');
    }
  };

  const validateMediaDeletion = (path) => {
    $q.dialog({
      title: 'Confirmation',
      message: 'Êtes-vous sûr(e) de vouloir supprimer ce média&nbsp;?',
      html: true,
      ok: true,
      cancel: 'Annuler',
    }).onOk(() => deleteMedia())
      .onCancel(() => NotifyPositive('Suppression annulée.'));
  };

  const start = () => { isUploading.value = true; };

  const finish = () => { isUploading.value = false; };

  const errorMsg = (path) => {
    if (get(v$.value, `card.${path}.required.$response`) === false) return REQUIRED_LABEL;
    if (get(v$.value, `card.${path}.maxLength.$response`) === false) {
      return `${QUESTION_OR_TITLE_MAX_LENGTH} caractères maximum.`;
    }

    return '';
  };

  return {
    // Data
    tmpInput,
    isUploading,
    // Computed
    mediaFileName,
    mediaUploadUrl,
    extensions,
    maxFileSize,
    errorMsg,
    // Methods
    saveTmp,
    updateCard,
    updateGappedTextCard,
    requiredOneCorrectAnswer,
    getError,
    updateTextAnswer,
    updateCorrectAnswer,
    addAnswer,
    validateAnswerDeletion,
    mediaUploaded,
    deleteMedia,
    validateMediaDeletion,
    start,
    finish,
  };
};
