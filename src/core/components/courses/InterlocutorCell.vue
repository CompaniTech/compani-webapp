<template>
  <div v-if="get(interlocutor, '_id')" class="cell-container">
    <p class="input-caption">{{ caption }}</p>
    <q-card class="interlocutor-cell row justify-between items-start">
      <div class="row">
        <img :src="getAvatar(interlocutor.picture)" class="avatar q-my-sm">
        <div class="q-my-sm q-ml-md">
          <div class="text-copper-grey-700">{{ formatIdentity(interlocutor.identity, 'FL') }}</div>
          <div class="text-copper-grey-500 text-14">{{ interlocutor.local.email }}</div>
          <div v-if="get(interlocutor, 'contact.phone')" class="phone">
            {{ formatPhone(interlocutor.contact.phone) }}
          </div>
          <div v-else class="row items-center text-14">
            <div class="dot dot-orange" />
            <div class="text-orange-500">numéro manquant</div>
          </div>
          <div v-if="contact._id === interlocutor._id" class="contact">
            <q-icon size="xxs" name="person" class="q-mr-xs" />
            <span>Contact donné aux stagiaires</span>
          </div>
          <div v-if="displayConnectionInfos">
            <a v-if="interlocutor.loginCode" class="text-12">
              Code de connexion à l'app : {{ interlocutor.loginCode }}
            </a>
            <connected-dot v-else-if="interlocutor.firstMobileConnectionDate" />
          </div>
        </div>
      </div>
      <div v-if="canUpdate">
        <ni-button v-if="!interlocutorIsTrainerOrTutor" icon="edit" :disable="disable" @click="openModal(EDITION)" />
        <ni-button v-if="clearable" icon="delete" :disable="disable" @click="openModal(DELETION, interlocutor._id)" />
      </div>
    </q-card>
  </div>
  <ni-secondary-button v-else-if="canUpdate && !interlocutorIsTrainerOrTutor" :label="label" :disable="disable"
    @click="openModal(CREATION)" />
</template>

<script>
import get from 'lodash/get';
import Button from '@components/Button';
import SecondaryButton from '@components/SecondaryButton';
import { DEFAULT_AVATAR, EDITION, CREATION, DELETION } from '@data/constants';
import { formatIdentity, formatPhone } from '@helpers/utils';
import ConnectedDot from './ConnectedDot';

export default {
  name: 'InterlocutorCell',
  props: {
    interlocutor: { type: Object, default: () => ({}) },
    contact: { type: Object, default: () => ({}) },
    caption: { type: String, default: '' },
    canUpdate: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    label: { type: String, default: '' },
    clearable: { type: Boolean, default: false },
    interlocutorIsTrainerOrTutor: { type: Boolean, default: false },
    displayConnectionInfos: { type: Boolean, default: false },
  },
  components: {
    'ni-button': Button,
    'ni-secondary-button': SecondaryButton,
    'connected-dot': ConnectedDot,
  },
  emits: ['open-modal'],
  setup (_, { emit }) {
    const getAvatar = picture => get(picture, 'link') || DEFAULT_AVATAR;

    const openModal = (action, interlocutorId = '') => {
      emit('open-modal', { action, ...(interlocutorId && { interlocutorId }) });
    };

    return {
      // Data
      DEFAULT_AVATAR,
      EDITION,
      CREATION,
      DELETION,
      // Methods
      formatIdentity,
      formatPhone,
      getAvatar,
      get,
      openModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.cell-container
  display: flex
  flex-direction: column
.interlocutor-cell
  border-radius: 4px
  background-color: white
  padding: 8px
  flex: 1
.avatar
  width: 40px
  height: 40px
  border-radius: 50%
  vertical-align: middle
.phone
  color: $copper-grey-500
  font-size: 14px
.contact
  color: $copper-grey-500
  font-size: 12px
  margin-top: 4px
  display: flex
  align-items: center
  margin-left: -2px
.dot-orange
  margin: 0px 4px 0px 0px
:deep(.dot-container)
  justify-content: flex-start
:deep(.q-icon)
  margin: 0px 5px 0px 0px
</style>
