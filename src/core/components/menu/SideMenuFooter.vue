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
import { mapGetters } from 'vuex';
import {
  COACH_ROLES,
  AUXILIARY,
  PLANNING_REFERENT,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
  CLIENT,
} from '@data/constants';
import { sideMenuMixin } from '@mixins/sideMenuMixin';
import Button from '@components/Button';

export default {
  name: 'SideMenuFooter',
  mixins: [sideMenuMixin],
  props: {
    userId: { type: String, required: true },
    label: { type: String, default: '' },
    interfaceType: { type: String, default: CLIENT },
  },
  components: {
    'ni-button': Button,
  },
  emits: ['click'],
  data () {
    return {
      interfaceLogo: 'https://storage.googleapis.com/compani-main/icons/blue_icon_small.png',
      bulbLink: process.env.BULB_LINK,
    };
  },
  computed: {
    ...mapGetters({
      clientRole: 'main/getClientRole',
      vendorRole: 'main/getVendorRole',
    }),
    userCanFeedback () {
      return [...COACH_ROLES, AUXILIARY, PLANNING_REFERENT].includes(this.clientRole) ||
        [TRAINER, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(this.vendorRole);
    },
    accessBothInterface () {
      return this.clientRole && this.vendorRole;
    },
  },
  methods: {
    openExternalUrl (url) {
      window.open(url, '_blank');
    },
    goToProfile () {
      if (!/account/.test(this.$route.name)) {
        return /\/ad\//.test(this.$route.path)
          ? this.$router.push({ name: 'account vendor' })
          : this.$router.push({ name: 'account client' });
      }
    },
    switchInterface () {
      if (!this.accessBothInterface) return;

      if (this.interfaceType === CLIENT) this.$router.push({ path: '/ad' }).catch((e) => {});
      else this.$router.push({ path: '/ni/courses' }).catch((e) => {});
    },
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
