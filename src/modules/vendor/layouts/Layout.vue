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
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { TRAINER, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, VENDOR } from '@data/constants';
import SideMenuFooter from '@components/menu/SideMenuFooter';
import MenuItem from '@components/menu/MenuItem';
import { useSideMenu } from '@composables/sideMenu';
import { useLayouts } from '@composables/layouts';
import { useMenuItems } from '../composables/MenuItems';

export default {
  components: {
    'ni-side-menu-footer': SideMenuFooter,
    'ni-menu-item': MenuItem,
  },
  setup () {
    const $store = useStore();

    const interfaceType = ref(VENDOR);
    const expansionRefs = ref({});

    const loggedUser = computed(() => $store.state.main.loggedUser);
    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    const isAdmin = computed(() => [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole.value));

    const isTrainer = computed(() => vendorRole.value === TRAINER);

    const isProgramEditor = computed(() => loggedUser.value.isProgramEditor || false);

    const { routes, activeRoutes } = useMenuItems(isAdmin, isTrainer, isProgramEditor);

    const {
      userFirstname,
      companiLogo,
      collapsibleOpening,
      collapsibleClosing,
    } = useSideMenu(activeRoutes, expansionRefs);

    const {
      isMini,
      drawer,
      menuIcon,
      chevronClasses,
      chevronContainerClasses,
      toggleMenu,
    } = useLayouts(collapsibleClosing);

    onMounted(() => {
      collapsibleOpening();
    });

    return {
      // Data
      interfaceType,
      userFirstname,
      companiLogo,
      isMini,
      // Computed
      routes,
      activeRoutes,
      loggedUser,
      drawer,
      menuIcon,
      chevronClasses,
      chevronContainerClasses,
      toggleMenu,
    };
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
