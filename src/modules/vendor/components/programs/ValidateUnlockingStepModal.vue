<template>
  <q-dialog :model-value="modelValue" @update:model-value="cancel" @hide="hide">
    <div class="modal-container-md">
      <div class="modal-padding">
        <div class="modal-title q-mb-lg">Confirmation</div>
        <div class="q-mb-lg">Êtes-vous sûr(e) de vouloir déverrouiller cette étape&nbsp;?</div>
        <div class="q-mb-lg" v-if="isStepPublished">
          Cette étape est publiée, vous ne pourrez pas ajouter, supprimer ou changer l'ordre des cartes.
        </div>
        <div v-if="subProgramsGroupedByProgram.length" class="q-mb-lg">
          <div>Elle est utilisée dans les sous-programmes suivants :</div>
          <q-card v-for="(group, groupIndex) in subProgramsGroupedByProgram" flat :key="groupIndex"
            class="program q-mt-sm">
            <q-card-section class="q-pa-sm">
              <div class="text-weight-bold">{{ group.programName }}</div>
              <q-card v-for="(subProgram, subProgramIndex) in group.subProgramsName" flat :key="subProgramIndex"
                class="sub-program q-mt-xs q-pa-xs">
                <div>{{ subProgram }}</div>
              </q-card>
            </q-card-section>
          </q-card>
        </div>
        <div class="q-mb-xl">
          Si vous la modifiez, les changements impacteront tous les sous-programmes où elle est utilisée.
        </div>
      </div>
      <div class="footer q-pa-xs">
        <q-btn no-caps flat class="modal-btn" label="ANNULER" @click="cancel" color="primary" />
        <q-btn no-caps flat class="modal-btn" label="OK" @click="confirm" color="primary" />
      </div>
    </div>
  </q-dialog>
</template>

<script>
export default {
  name: 'ValidateUnlockingStepModal',
  props: {
    modelValue: { type: Boolean, default: false },
    subProgramsGroupedByProgram: { type: Array, default: () => [] },
    isStepPublished: { type: Boolean, default: false },
  },
  emits: ['cancel', 'confirm', 'hide'],
  methods: {
    cancel () {
      this.$emit('cancel');
    },
    confirm () {
      this.$emit('confirm');
    },
    hide () {
      this.$emit('hide');
    },
  },
};
</script>

<style lang="sass" scoped>
.footer
  display: flex
  justify-content: flex-end

.program
  border-radius: 0
  background-color: $turquoise-10

.sub-program
  border-radius: 0
  background-color: $navy-20
</style>
