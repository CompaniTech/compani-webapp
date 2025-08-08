<template>
  <q-layout view="hhh Lpr lff">
    <q-drawer :mini="isMini" :mini-width="30" :width="250" side="left" :model-value="drawer"
      @update:model-value="toggleMenu">
      <q-list v-if="!isMini" class="no-border sidemenu-alenvi sidemenu-flex">
        <div class="sidemenu-header">
          <q-item-label header class="justify-center">
            <img :src="companiLogo" alt="Compani logo">
          </q-item-label>
        </div>
        <q-separator />
        <template v-for="route of routes" :key="route.ref">
          <q-expansion-item :ref="route.ref" v-model="activeRoutes[route.ref].open" :label="route.label">
            <ni-menu-item v-for="item of route.children" :name="item.name" :icon="item.icon" :label="item.label"
              :key="item.name" :params="item.params" />
          </q-expansion-item>
          <q-separator />
        </template>
        <ni-side-menu-footer :label="userFirstname" :user-id="loggedUser._id" :interface-type="interfaceType" />
      </q-list>
      <div :class="chevronContainerClasses">
        <q-btn :class="chevronClasses" dense round unelevated :icon="menuIcon" @click="isMini = !isMini" />
      </div>
    </q-drawer>
    <q-page-container>
      <router-view :key="$route.fullPath" />
    </q-page-container>
    <q-page-sticky position="bottom-left" :offset="[18, 18]">
      <q-btn class="menu-icon" color="primary" round dense @click="toggleMenu(true)" icon="menu" />
    </q-page-sticky>
  </q-layout>
</template>

<script>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { layoutMixin } from '@mixins/layoutMixin';
import { sideMenuMixin } from '@mixins/sideMenuMixin';
import { TRAINER, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, VENDOR } from '@data/constants';
import SideMenuFooter from '@components/menu/SideMenuFooter';
import MenuItem from '@components/menu/MenuItem';
import { useMenuItems } from '../composables/MenuItems';

export default {
  components: {
    'ni-side-menu-footer': SideMenuFooter,
    'ni-menu-item': MenuItem,
  },
  mixins: [layoutMixin, sideMenuMixin],
  setup () {
    const $store = useStore();

    const interfaceType = ref(VENDOR);

    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    const isAdmin = computed(() => [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole.value));

    const isTrainer = computed(() => vendorRole.value === TRAINER);

    const { routes, activeRoutes } = useMenuItems(isAdmin, isTrainer);

    return {
      // Data
      interfaceType,
      // Computed
      routes,
      activeRoutes,
    };
  },
  mounted () {
    this.collapsibleOpening();
  },
};
</script>

<style lang="sass" scoped>
.q-page-sticky
  z-index: 10
  @media screen and (min-width: $breakpoint-md-min)
    display: none

.chevron
  background-color: white
  border: 1px solid $copper-grey-300
  top: 5px
  position: fixed
  z-index: 5000
  &-left
    left: 235px
  &-right
    left: 15px
  @media screen and (max-width: $breakpoint-sm-max)
    display: none

.q-btn
  color: $copper-grey-800
  &:hover
    color: $primary

.menu-icon
  font-size: 17px
</style>
