import { computed, ref } from 'vue';

export const useMenuItems = (isAdmin, isTrainer) => {
  const adminActiveRoutes = ref({
    management: { open: true },
    users: { open: false },
    pedagogy: { open: false },
    exports: { open: false },
    facturation: { open: false },
  });

  const trainerActiveRoutes = ref({
    administrative: { open: false },
    management: { open: false },
  });

  const adminRoutes = computed(() => [
    {
      ref: 'management',
      label: 'Gestion',
      children: [
        { name: 'ni management blended courses', icon: 'mdi-teach', label: 'Formations de groupe' },
        { name: 'ni management single courses', icon: 'mdi-numeric-1-box', label: 'Formations individuelles' },
        { name: 'ni management elearning courses', icon: 'stay_primary_portrait', label: 'Formations eLearning' },
      ],
    },
    {
      ref: 'users',
      label: 'Utilisateurs',
      children: [
        { name: 'ni users holdings', icon: 'account_balance', label: 'Sociétés mères' },
        { name: 'ni users companies', icon: 'apartment', label: 'Structures' },
        { name: 'ni users trainers', icon: 'school', label: 'Formateurs' },
        { name: 'ni users learners', icon: 'contacts', label: 'Apprenants' },
      ],
    },
    {
      ref: 'pedagogy',
      label: 'Pédagogie',
      children: [
        { name: 'ni pedagogy programs', icon: 'view_headline', label: 'Catalogue' },
        { name: 'ni pedagogy categories', icon: 'category', label: 'Catégories' },
        { name: 'ni pedagogy questionnaires', icon: 'assessment', label: 'Questionnaires' },
        { name: 'ni pedagogy questionnaire answers', icon: 'question_answer', label: 'Réponses questionnaires' },
      ],
    },
    {
      ref: 'exports',
      label: 'Exports',
      children: [
        { name: 'ni exports history vendor', icon: 'history', label: 'Historique' },
      ],
    },
    {
      ref: 'facturation',
      label: 'Facturation',
      children: [
        { name: 'ni billing config', icon: 'settings', label: 'Configuration' },
        {
          name: 'ni billing completion certificates',
          icon: 'picture_as_pdf',
          label: 'Certificats réalisation mensuels',
        },
        { name: 'ni billing dashboard', icon: 'credit_card', label: 'A facturer' },
        { name: 'ni billing directory', icon: 'receipt', label: 'Factures' },
      ],
    },
  ]);

  const activeRoutes = computed(() => {
    if (isAdmin.value) return adminActiveRoutes.value;
    if (isTrainer.value) return trainerActiveRoutes.value;
    return {};
  });

  const trainerRoutes = computed(() => [
    {
      ref: 'management',
      label: 'Gestion',
      children: [{ name: 'trainers courses', icon: 'mdi-teach', label: 'Formations' }],
    },
    {
      ref: 'administrative',
      label: 'Administration',
      children: [
        { name: 'trainers info', icon: 'person', label: 'Infos personnelles' },
        { name: 'trainers contracts', icon: 'description', label: 'Ordres de mission' },
      ],
    },
  ]);

  const routes = computed(() => {
    if (isAdmin.value) return adminRoutes.value;
    if (isTrainer.value) return trainerRoutes.value;
    return [];
  });

  return {
    // Data
    adminActiveRoutes,
    trainerActiveRoutes,
    adminRoutes,
    // Computed
    routes,
    activeRoutes,
    trainerRoutes,
  };
};
