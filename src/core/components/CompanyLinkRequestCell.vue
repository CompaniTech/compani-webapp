<template>
  <div class="request-cell">
    <div class="avatar-container">
      <img v-if="request.user.picture" :src="request.user.picture.link" class="avatar">
      <img v-else :src="DEFAULT_AVATAR" class="default-avatar q-my-sm">
    </div>
    <p class="text-copper-grey-700 text-weight-bold q-ma-md">
      {{ formatIdentity(request.user.identity, 'FL') }}
    </p>
    <div class="column q-ma-sm">
      <ni-button class="validation-button" label="Confirmer" @click="validateLinkRequestCreation" />
      <ni-button class="delete-button" label="Supprimer" @click="validateLinkRequestDeletion" />
    </div>
  </div>
</template>

<script>
import { computed, toRefs } from 'vue';
import get from 'lodash/get';
import { useStore } from 'vuex';
import Button from '@components/Button';
import { NotifyPositive } from '@components/popup/notify';
import UserCompanies from '@api/UserCompanies';
import CompanyLinkRequests from '@api/CompanyLinkRequests';
import { DEFAULT_AVATAR } from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import { useQuasar } from 'quasar';

export default {
  name: 'CompanyLinkRequestCell',
  props: {
    request: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-button': Button,
  },
  emits: ['click'],
  setup (props, { emit }) {
    const { request } = toRefs(props);
    const $q = useQuasar();
    const $store = useStore();

    const userProfile = computed(() => $store.state.main.loggedUser);

    const getAvatar = picture => (get(picture, 'link')) || DEFAULT_AVATAR;

    const createUserCompany = async () => {
      try {
        await UserCompanies.create({ user: request.value.user._id, company: userProfile.value.company._id });
        emit('click');
      } catch (e) {
        console.error(e);
      }
    };

    const deleteLinkRequest = async () => {
      try {
        await CompanyLinkRequests.remove(request.value._id);
        emit('click');
      } catch (e) {
        console.error(e);
      }
    };

    const validateLinkRequestCreation = () => {
      $q.dialog({
        title: 'Voulez-vous vraiment rattacher ce compte&nbsp;?',
        message: `<div class="row q-my-md items-center">
            <img class="avatar q-mx-md" src="${getAvatar(request.value.user.picture)}"/>
            <div>
              <div>${formatIdentity(request.value.user.identity, 'FL')}</div>
              <div style="font-size: 14px" class="text-copper-grey-500">${request.value.user.local.email}</div>
            </div>
          </div>
        En l’ajoutant, vous confirmez que vous êtes employeur de cette personne.<br />
        Vous aurez alors accès à son historique de formation sur Compani.`,
        html: true,
        ok: 'Rattacher ce compte',
        cancel: 'Annuler',
      })
        .onOk(() => createUserCompany())
        .onCancel(() => NotifyPositive('Rattachement à la structure annulé.'));
    };

    const validateLinkRequestDeletion = () => {
      $q.dialog({
        title: 'Voulez-vous vraiment supprimer cette demande de rattachement&nbsp;?',
        message: `<div class="row q-my-md items-center">
            <img class="avatar q-mx-md" src="${getAvatar(request.value.user.picture)}"/>
            <div>
              <div>${formatIdentity(request.value.user.identity, 'FL')}</div>
              <div style="font-size: 14px" class="text-copper-grey-500">${request.value.user.local.email}</div>
            </div>
          </div>
        Vous ne pourrez pas avoir accès à son historique de formation sur Compani.`,
        html: true,
        ok: 'Supprimer la demande',
        cancel: 'Annuler',
      })
        .onOk(() => deleteLinkRequest())
        .onCancel(() => NotifyPositive('Suppression de la demande de rattachement annulée.'));
    };

    return {
      // Methods
      validateLinkRequestCreation,
      validateLinkRequestDeletion,
    };
  },
};
</script>

<style lang="sass" scoped>
.request-cell
  width: 176px
  border-radius: 8px
  box-shadow: 0 3px 5px -1px rgba(0,0,0,0.2), 0 5px 8px rgba(0,0,0,0.14), 0 1px 14px rgba(0,0,0,0.12)
  background-color: white
.avatar-container
  height: 120px
  background-color: $copper-grey-50
  display: flex
  justify-content: center
  border-radius: 8px 8px 0px 0px
.default-avatar
  width: 96px
  height: 96px
  border-radius: 50%
  box-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.14), 0 2px 1px -1px rgba(0,0,0,0.12)
  vertical-align: middle
  @media screen and (max-width: $breakpoint-sm-max)
    height: 60px
    width: 60px
.avatar
  height: 100%
  width: 100%
  object-fit: cover
  border-radius: 8px 8px 0px 0px
.validation-button
  color: white
  background: $primary
  margin: 4px
.delete-button
  color: $primary
  background: white
  border: 1px solid $primary
  margin: 4px
</style>
