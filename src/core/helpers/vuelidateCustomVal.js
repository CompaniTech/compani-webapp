import axios from 'axios';
import get from 'lodash/get';
import { helpers } from '@vuelidate/validators';
import { isValidIBAN, isValidBIC } from 'ibantools';
import { isGreaterThan, isGreaterThanOrEqual } from '@helpers/numbers';
import CompaniDate from '@helpers/dates/companiDates';

export const frPhoneNumber = (value) => {
  if (!value) return true;

  return /^[0]{1}[1-9]{1}[.\-\s]{0,1}([0-9]{2}[.\-\s]{0,1}){4}$/.test(value) || false;
};

export const frZipCode = (value) => {
  if (!value) return false;

  return value.split(' ').join('').match(/[0-9]{5}/) || false;
};

export const iban = (value) => {
  if (!value) return false;

  return isValidIBAN(value.split(' ').join(''));
};

export const bic = (value) => {
  if (!value) return false;

  return isValidBIC(value);
};

export const frAddress = async (value) => {
  if (!value) return true;

  // interceptor avoids having an infinite loop for API calls although we don't understand how it works
  axios.interceptors.request.use();
  const res = await axios.get('https://api-adresse.data.gouv.fr/search', { params: { q: value, limit: 1 } });

  return (res.data.features.length === 1 && res.data.features[0].properties.score > 0.9);
};

export const positiveNumber = (value) => {
  const floatValue = parseFloat(value);

  if (!floatValue) return true;
  if (isNaN(floatValue) || !isFinite(floatValue)) return false;

  return isGreaterThanOrEqual(value, 0);
};

export const strictPositiveNumber = (value) => {
  const floatValue = parseFloat(value);
  if (isNaN(floatValue) || !isFinite(floatValue)) return false;

  return isGreaterThan(value, 0);
};

export const integerNumber = (value) => {
  if (!value) return true;

  return Number.isInteger(Number(value));
};

export const fractionDigits = digits => value => new RegExp(`^\\d*(\\.\\d{0,${digits}})?$`).test(value);

export const validHour = value => !value || !!value.match(/^[0-1][0-9]:[0-5][0-9]$|^2[0-3]:[0-5][0-9]$/);

export const strictMinHour = min => helpers.withParams(
  { value: min },
  time => CompaniDate(min, 'HH:mm').isBefore(CompaniDate(time, 'HH:mm'), 'minute')
);

export const minDate = min => helpers.withParams(
  { value: min },
  value => !value || CompaniDate(min).isSameOrBefore(CompaniDate(value), 'day')
);

export const maxDate = max => helpers.withParams(
  { value: max },
  value => !value || CompaniDate(max).isSameOrAfter(CompaniDate(value), 'day')
);

export const validSiret = value => !value || /^\d{14}$/.test(value);

export const validYear = value => !value || /^[2]{1}[0]{1}[0-9]{2}$/.test(value);

// Quiz fill-the-gap
export const validCaracters = value => /^[a-zA-Z0-9àâçéèêëîïôûùü\040'-]*$/.test(value);

export const validTagsCount = (value) => {
  if (!value) return true;
  const tagsCount = get(value.match(/<trou>/g), 'length') || 0;

  return !!tagsCount && tagsCount < 3;
};

export const matchingTagsCount = (card, value) => {
  const tagsCount = get(value.match(/<trou>/g), 'length') || 0;

  return tagsCount === card.value.gapAnswers.filter(a => a.correct).length;
};

export const minArrayLength = minLength => value => value.filter(a => !!a).length >= minLength;

export const minOneCorrectAnswer = value => value.filter(a => a.correct).length >= 1;

export const urlAddress = (value) => {
  if (!value) return true;

  return value.match(/^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/) || false;
};
