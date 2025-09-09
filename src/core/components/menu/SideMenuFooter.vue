<template>
  <div class="sidemenu-footer">
    <q-item class="full-width">
      <q-item-section v-if="accessBothInterface" class="footer-logo-container" @click="switchInterface">
        <img :src="interfaceLogo" alt="go to other interface">
      </q-item-section>
      <q-item-section class="sidemenu-footer-user">{{ label }}</q-item-section>
      <div class="sidemenu-footer-icons">
        <q-item-section v-if="userCanFeedback">
          <ni-button icon="mdi-lightbulb-on-outline" color="secondary" size="sm" @click="openExternalUrl(bulbLink)" />
        </q-item-section>
        <q-item-section>
          <ni-button class="person" icon="person" @click="goToProfile" size="sm" />
        </q-item-section>
      </div>
    </q-item>
  </div>
</template>

<script>
import { computed, toRefs } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import {
  COACH_ROLES,
  AUXILIARY,
  PLANNING_REFERENT,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
  CLIENT,
} from '@data/constants';
import Button from '@components/Button';

export default {
  name: 'SideMenuFooter',
  props: {
    userId: { type: String, required: true },
    label: { type: String, default: '' },
    interfaceType: { type: String, default: CLIENT },
  },
  components: {
    'ni-button': Button,
  },
  emits: ['click'],
  setup (props) {
    const $store = useStore();
    const $router = useRouter();
    const $route = useRoute();
    const { interfaceType } = toRefs(props);

    const interfaceLogo = 'https://storage.googleapis.com/compani-main/icons/blue_icon_small.png';
    const bulbLink = process.env.BULB_LINK;

    const clientRole = computed(() => $store.getters['main/getClientRole']);
    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    const userCanFeedback = computed(() => [...COACH_ROLES, AUXILIARY, PLANNING_REFERENT].includes(clientRole.value) ||
      [TRAINER, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole.value));

    const accessBothInterface = computed(() => clientRole.value && vendorRole.value);

    const openExternalUrl = (url) => { window.open(url, '_blank'); };

    const goToProfile = () => {
      if (!/account/.test($route.name)) {
        return /\/ad\//.test($route.path)
          ? $router.push({ name: 'account vendor' })
          : $router.push({ name: 'account client' });
      }
    };

    const switchInterface = () => {
      if (!accessBothInterface.value) return;

      if (interfaceType.value === CLIENT) $router.push({ path: '/ad' }).catch(() => {});
      else $router.push({ path: '/ni/courses' }).catch(() => {});
    };
    return {
      // Data
      interfaceLogo,
      bulbLink,
      // Computed
      userCanFeedback,
      accessBothInterface,
      // Methods
      openExternalUrl,
      goToProfile,
      switchInterface,
    };
  },
};
</script>

<style lang="sass" scoped>
.footer-logo-container
  width: 25px
  flex: auto
  cursor: pointer

.footer-logo-container > img
  width: 25px
  height: 25px
</style>
