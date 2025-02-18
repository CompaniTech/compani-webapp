export const TOKEN_EXPIRE_DAY = 1; // in days

export const OTHER = 'other';

// MEDIA
export const BLUE_TEXT_LOGO = 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png';
export const DOC_EXTENSIONS = 'image/jpg, image/jpeg, application/pdf';
export const IMAGE_EXTENSIONS = 'image/jpg, image/jpeg, image/png';
export const VIDEO_EXTENSIONS = 'video/*';
export const AUDIO_EXTENSIONS = 'audio/*';

// CIVILITY
export const MR = 'mr';
export const MRS = 'mrs';
export const CIVILITY_OPTIONS = [
  { label: 'Monsieur', value: MR },
  { label: 'Madame', value: MRS },
  { label: 'Monsieur / Madame', value: 'couple' },
];

// CONTRACTS
export const CONTRACT = 'contract';

// EVENTS
export const ABSENCE = 'absence';

export const EDITION = 'edition';
export const DELETION = 'deletion';
export const CREATION = 'creation';

// AVATAR
export const DEFAULT_AVATAR = 'https://storage.googleapis.com/compani-main/default_avatar.png';
export const UNKNOWN_AVATAR = 'https://storage.googleapis.com/compani-main/unknown_avatar.png';

// INTERFACE
export const VENDOR = 'vendor';
export const CLIENT = 'client';

// ROLES CLIENT
export const CLIENT_ADMIN = 'client_admin';
export const COACH = 'coach';
export const CUSTOMER = 'customer';
export const AUXILIARY = 'auxiliary';
export const HELPER = 'helper';
export const PLANNING_REFERENT = 'planning_referent';
export const AUXILIARY_WITHOUT_COMPANY = 'auxiliary_without_company';
export const TUTOR = 'tutor';

// ROLES VENDOR
export const VENDOR_ADMIN = 'vendor_admin';
export const TRAINING_ORGANISATION_MANAGER = 'training_organisation_manager';
export const TRAINER = 'trainer';

// ROLES HOLDING
export const HOLDING_ADMIN = 'holding_admin';

export const AUXILIARY_ROLES = [AUXILIARY, PLANNING_REFERENT, AUXILIARY_WITHOUT_COMPANY];
export const COACH_ROLES = [CLIENT_ADMIN, COACH];
export const ROLE_TRANSLATION = {
  [HELPER]: 'Aidant(e)',
  [AUXILIARY]: 'Auxiliaire',
  [PLANNING_REFERENT]: 'Auxiliaire',
  [AUXILIARY_WITHOUT_COMPANY]: 'Auxiliaire',
  [CLIENT_ADMIN]: 'Administrateur(rice)',
  [VENDOR_ADMIN]: 'Administrateur(rice) Vendeur',
  [COACH]: 'Coach',
  [TRAINING_ORGANISATION_MANAGER]: 'Responsable Formation',
  [TRAINER]: 'Formateur(rice)',
};

// ROLE TRANSLATION
export const ROLES_TRANSLATION = {
  [CLIENT_ADMIN]: 'Administrateur(rice)',
  [COACH]: 'Coach',
};

// SUBSCRIPTIONS
export const ERP = 'erp';

// PLANNING
export const PLANNING_VIEW_START_HOUR = 7;
export const PLANNING_VIEW_END_HOUR = 22;
export const SECTOR = 'sector';

export const REQUIRED_LABEL = 'Champ requis';
export const INVALID_NUMBER = 'Nombre invalide';

// BILLING
export const BILL = 'bill';

// PAYMENTS
export const DIRECT_DEBIT = 'direct_debit';
export const BANK_TRANSFER = 'bank_transfer';
export const CHECK = 'check';
export const CESU = 'cesu';
export const CASH = 'cash';
export const CREDIT = 'credit';
export const CREDIT_OPTION = { label: 'Crédit', value: CREDIT };
export const PAYMENT_OPTIONS = [
  { label: 'Prélèvement', value: DIRECT_DEBIT },
  { label: 'Virement', value: BANK_TRANSFER },
  { label: 'Chèque', value: CHECK },
  { label: 'CESU', value: CESU },
  { label: 'Espèces', value: CASH },
];
export const REFUND = 'refund';
export const PAYMENT = 'payment';
export const PAYMENT_NATURE_OPTIONS = [
  { label: 'Paiement', value: PAYMENT },
  { label: 'Remboursement', value: REFUND },
];

// PAY
export const PAY = 'pay';

// COMPANY
export const COMPANY = 'company';

// SMS
export const CONVOCATION = 'convocation';
export const REMINDER = 'reminder';
export const COURSE_SMS = 'Formation';

// COURSE
export const INTRA = 'intra';
export const INTER_B2B = 'inter_b2b';
export const INTRA_HOLDING = 'intra_holding';
export const SINGLE = 'single';
export const COURSE_TYPES = [
  { label: 'Intra', value: INTRA },
  { label: 'Inter B2B', value: INTER_B2B },
  { label: 'Intra société mère', value: INTRA_HOLDING },
  { label: 'Individuelle', value: SINGLE },
];
export const BLENDED = 'blended';
export const STRICTLY_E_LEARNING = 'strictly_e_learning';
export const FORTHCOMING = 'forthcoming';
export const IN_PROGRESS = 'inProgress';
export const COMPLETED = 'completed';
export const OPERATIONS = 'operations';
export const PEDAGOGY = 'pedagogy';
export const ARCHIVED_COURSES = 'archived_courses';
export const UNARCHIVED_COURSES = 'unarchived_courses';

// SUBPROGRAM
export const PUBLISHED = 'published';

// STEP
export const E_LEARNING = 'e_learning';
export const ON_SITE = 'on_site';
export const REMOTE = 'remote';
export const STEP_TYPES = [
  { label: 'eLearning', value: E_LEARNING },
  { label: 'présentiel', value: ON_SITE },
  { label: 'distanciel', value: REMOTE },
];
export const REUSE_STEP = 'reuse_step';
export const CREATE_STEP = 'create_step';
export const STEP_ATTACHEMENT_OPTIONS = [
  { label: 'Créer', value: CREATE_STEP },
  { label: 'Réutiliser', value: REUSE_STEP },
];

// ACTIVITY
export const LESSON = 'lesson';
export const QUIZ = 'quiz';
export const SHARING_EXPERIENCE = 'sharing_experience';
export const VIDEO = 'video';
export const ACTIVITY_TYPES = [
  { label: 'Cours', value: LESSON },
  { label: 'Quiz', value: QUIZ },
  { label: 'Témoignage', value: SHARING_EXPERIENCE },
  { label: 'Vidéo', value: VIDEO },
];

// QUESTIONNAIRE
export const QUESTIONNAIRE = 'questionnaire';
export const START_COURSE = 'start_course';
export const END_COURSE = 'end_course';
export const VALIDATE = 'validate';
export const ADJUST = 'adjust';

// E-LEARNING CARDS
export const TRANSITION = 'transition';
export const TITLE_TEXT_MEDIA = 'title_text_media';
export const TITLE_TEXT = 'title_text';
export const TEXT_MEDIA = 'text_media';
export const FLASHCARD = 'flashcard';
export const FILL_THE_GAPS = 'fill_the_gaps';
export const MULTIPLE_CHOICE_QUESTION = 'multiple_choice_question';
export const SINGLE_CHOICE_QUESTION = 'single_choice_question';
export const ORDER_THE_SEQUENCE = 'order_the_sequence';
export const OPEN_QUESTION = 'open_question';
export const SURVEY = 'survey';
export const QUESTION_ANSWER = 'question_answer';
export const CARD_TEMPLATES = [
  { label: 'Transition', value: TRANSITION, type: LESSON },
  { label: 'Titre Texte Média', value: TITLE_TEXT_MEDIA, type: LESSON },
  { label: 'Titre Texte', value: TITLE_TEXT, type: LESSON },
  { label: 'Texte Média', value: TEXT_MEDIA, type: LESSON },
  { label: 'Flashcard', value: FLASHCARD, type: LESSON },
  { label: 'Texte à trou', value: FILL_THE_GAPS, type: QUIZ },
  { label: 'QCM', value: MULTIPLE_CHOICE_QUESTION, type: QUIZ },
  { label: 'QCU', value: SINGLE_CHOICE_QUESTION, type: QUIZ },
  { label: 'Mettre dans l\'ordre', value: ORDER_THE_SEQUENCE, type: QUIZ },
  { label: 'Question ouverte', value: OPEN_QUESTION, type: QUESTIONNAIRE },
  { label: 'Sondage', value: SURVEY, type: QUESTIONNAIRE },
  { label: 'Question\t&\tRéponse', value: QUESTION_ANSWER, type: QUESTIONNAIRE },
];

export const CHOICE_QUESTION_MAX_ANSWERS_COUNT = 4;
export const CHOICE_QUESTION_MIN_ANSWERS_COUNT = 2;
export const FILL_THE_GAPS_MIN_ANSWERS_COUNT = 3;
export const FILL_THE_GAPS_MAX_ANSWERS_COUNT = 8;
export const FILL_THE_GAPS_MAX_GAPS_COUNT = 2;
export const QUESTION_OR_TITLE_MAX_LENGTH = 170;
export const QC_ANSWER_MAX_LENGTH = 70;
export const GAP_ANSWER_MAX_LENGTH = 15;
export const QUESTION_ANSWER_MIN_ANSWERS_COUNT = 2;
export const QUESTION_ANSWER_MAX_ANSWERS_COUNT = 4;
export const FLASHCARD_TEXT_MAX_LENGTH = 450;

// PUBLISHED_DOT
export const PUBLISHED_DOT_ACTIVE = 'active';
export const PUBLISHED_DOT_WARNING = 'warning';

// COURSE HISTORY
export const SLOT_CREATION = 'slot_creation';
export const SLOT_DELETION = 'slot_deletion';
export const SLOT_EDITION = 'slot_edition';
export const TRAINEE_ADDITION = 'trainee_addition';
export const TRAINEE_DELETION = 'trainee_deletion';
export const ESTIMATED_START_DATE_EDITION = 'estimated_start_date_edition';
export const COMPANY_ADDITION = 'company_addition';
export const COMPANY_DELETION = 'company_deletion';

// MEDIA UPLOAD
export const UPLOAD_IMAGE = 'image';
export const UPLOAD_VIDEO = 'video';
export const UPLOAD_AUDIO = 'audio';
export const UPLOAD_EXTENSION_OPTIONS = [
  { label: 'Image', value: UPLOAD_IMAGE },
  { label: 'Video', value: UPLOAD_VIDEO },
  { label: 'Audio', value: UPLOAD_AUDIO },
];

// ACCESS RULES
export const FREE_ACCESS = 'free';
export const RESTRICTED_ACCESS = 'restricted';
export const ACCESS_OPTIONS = [
  { label: 'Libre accès', value: FREE_ACCESS },
  { label: 'Choisir une structure', value: RESTRICTED_ACCESS },
];

// ORIGIN
export const WEBAPP = 'webapp';

// FORMAT
export const PDF = 'pdf';
export const ALL_PDF = 'all_pdf';
export const ALL_WORD = 'all_word';

// TYPE
export const CUSTOM = 'custom';
export const OFFICIAL = 'official';

// Email
export const TRAINEE = 'trainee';

// QUESTIONNAIRE
export const EXPECTATIONS = 'expectations';
export const END_OF_COURSE = 'end_of_course';
export const SELF_POSITIONNING = 'self_positionning';
export const DRAFT = 'draft';
export const QUESTIONNAIRE_TYPES = {
  [EXPECTATIONS]: 'Recueil des attentes',
  [END_OF_COURSE]: 'Fin de formation',
  [SELF_POSITIONNING]: 'Auto-positionnement',
};
export const REVIEW = 'review';

// EXPORTS
export const SERVICE = 'service';
export const SUBSCRIPTION = 'subscription';
export const FUNDING = 'funding';
export const RUP = 'rup';
export const REFERENT = 'referent';
export const WORKING_EVENT = 'working_event';
export const TRANSPORT = 'transport';
export const EXPORT_TYPES = [
  { label: 'Services', value: SERVICE },
  { label: 'Souscriptions', value: SUBSCRIPTION },
  { label: 'Financements', value: FUNDING },
  { label: 'Auxiliaires', value: AUXILIARY },
  { label: 'Bénéficiaires', value: CUSTOMER },
  { label: 'Aidants', value: HELPER },
  { label: 'Equipes', value: SECTOR },
  { label: 'Registre unique du personnel', value: RUP },
  { label: 'Référents bénéficiaire', value: REFERENT },
];
export const EXPORT_HISTORY_TYPES = [
  { label: 'Interventions et heures internes', value: WORKING_EVENT },
  { label: 'Factures et avoirs', value: BILL },
  { label: 'Paiements et remboursements', value: PAYMENT },
  { label: 'Absences', value: ABSENCE },
  { label: 'Paies et soldes tout compte', value: PAY },
  { label: 'Contrats', value: CONTRACT },
  { label: 'Transports', value: TRANSPORT },
];
export const COURSE = 'course';
export const COURSE_SLOT = 'course_slot';
export const COURSE_BILL = 'course_bill';
export const COURSE_PAYMENT = 'course_payment';
export const VENDOR_EXPORT_HISTORY_TYPES = [
  { label: 'Formations', value: COURSE },
  { label: 'Créneaux', value: COURSE_SLOT },
  { label: 'Questionnaires de satisfaction', value: END_OF_COURSE },
  { label: 'Factures et avoirs', value: COURSE_BILL },
  { label: 'Paiements et remboursements', value: COURSE_PAYMENT },
  { label: 'Questionnaires d\'auto-positionnement par groupe', value: SELF_POSITIONNING },

];

// COURSE_BILLS
export const LIST = 'list';
export const BALANCE = 'balance';
export const FUNDING_ORGANISATION = 'funding_organisation';
export const GROUP = 'group';
export const COUNT_UNIT = { [GROUP]: 'groupe', [TRAINEE]: 'stagiaire' };

// KANBAN COURSE FILTERS
export const WITHOUT_TRAINER = 'without_trainer';
export const WITHOUT_SALES_REPRESENTATIVE = 'without_sales_representative';

// END_TO_END TESTS
export const AUTHENTICATION = 'authentication';

// DATE AND DURATION UNITS
export const YEAR = 'year';
export const QUARTER = 'quarter';
export const MONTH = 'month';
export const WEEK = 'week';
export const DAY = 'day';
export const HOUR = 'hour';
export const MINUTE = 'minute';
export const SECOND = 'second';
export const MILLISECOND = 'millisecond';

// COMPANIDURATION
export const PT0S = 'PT0S';

// COMPANIDURATION FORMATS
export const LONG_DURATION_H_MM = 'h\'h\' mm\'min\'';
export const SHORT_DURATION_H_MM = 'h\'h\'mm';

// COMPANIDATE FORMATS
export const DD_MM_YYYY = 'dd/LL/yyyy';
export const DD_MM = 'dd/LL';
export const MM_YYYY = 'LL-yyyy';
export const HHhMM = 'HH\'h\'mm';
export const DAY_MONTH_YEAR = 'DDD';
export const HH_MM = 'T';
export const MONTH_SHORT = 'LLL';
export const MONTH_SHORT_YYYY = 'LLL yyyy';
export const DAY_OF_MONTH = 'd';
export const DAY_OF_WEEK_SHORT = 'ccc';

// LEARNERS
export const DIRECTORY = 'directory';

// BUTTONS TYPES
export const FLOATING = 'floating';
export const MODAL = 'modal';

// QUESTIONNAIRE CARD NAVIGATION
export const DECREMENT = 'decrement';
export const INCREMENT = 'increment';
export const GO_TO_CARD = 'go_to_card';
export const START_CARD_INDEX = -1;

// OPTION GROUP TYPE
export const CHECKBOX = 'checkbox';
export const RADIO = 'radio';

// TRAINER MISSION CREATION METHOD TYPES
export const UPLOAD = 'upload';
export const GENERATION = 'generation';
export const CREATION_METHOD_OPTIONS = [
  { label: 'Téléverser', value: UPLOAD },
  { label: 'Générer', value: GENERATION },
];

// Exports
export const YES = 'Oui';
export const NO = 'Non';
export const NO_DATA = 'Aucune donnée';
