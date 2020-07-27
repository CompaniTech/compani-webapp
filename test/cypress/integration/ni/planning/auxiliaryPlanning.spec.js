import { CLIENT_ADMIN, COACH, AUXILIARY, PLANNING_REFERENT } from '../../../../../src/core/data/constants';

describe('Auxiliary planning - display', () => {
  beforeEach(() => {
    cy.request(`${Cypress.env('API_HOSTNAME')}/end-to-end/seed/planning`);
    cy.login({ email: 'auxiliary@alenvi.io', password: '123456!eR' });
    cy.visit('/ni/planning/auxiliaries');
  });

  it('should display correctly auxiliary planning', () => {
    cy.get('#q-app').click(500, 500);
    cy.get('[data-cy=planning-search]').eq(1).click();
    cy.get('[data-cy=planning-search]').eq(1).type('{backspace}Auxiliary TEST{downarrow}{enter}');
    cy.get('[data-cy=planning-row]').should('have.length', 1);
    cy.get('[data-cy=planning-event]').should('have.length', 1);
    cy.get('[data-cy=event-title]').should('have.length', 1);

    cy.get('[data-cy=event-title]').eq(0).should('contain', 'R. BARDET');
    cy.get('[data-cy=event-hours]').eq(0).should('contain', '10:00 - 12:30');

    cy.get('[data-cy=planning_before]').click();
    cy.get('[data-cy=week-number]').should('contain', Cypress.moment().subtract(1, 'week').subtract(1, 'day').week());
    cy.get('.event-intervention').should('have.length', 2);
    cy.get('[data-cy=event-title]').eq(0).should('contain', 'R. BARDET');
    cy.get('[data-cy=event-hours]').eq(0).should('contain', '11:15 - 12:30');
    cy.get('[data-cy=event-title]').eq(1).should('contain', 'R. BARDET');
    cy.get('[data-cy=event-hours]').eq(1).should('contain', '18:15 - 20:30');

    cy.get('[data-cy=planning-search]').eq(1).click();
    cy.get('[data-cy=planning-search]').eq(1).type('Customer referent{downarrow}{enter}');
    cy.get('[data-cy=planning-row]').should('have.length', 2);
  });
});

const loggedUsers = [
  { login: 'planning-referent@alenvi.io', password: '123456!eR', role: PLANNING_REFERENT },
  { login: 'auxiliary@alenvi.io', password: '123456!eR', role: AUXILIARY },
  { login: 'client-admin@alenvi.io', password: '123456!eR', role: CLIENT_ADMIN },
  { login: 'coach@alenvi.io', password: '123456!eR', role: COACH },
];

loggedUsers.forEach(user => describe(`Auxiliary planning - actions - ${user.role}`, () => {
  beforeEach(() => {
    cy.request(`${Cypress.env('API_HOSTNAME')}/end-to-end/seed/planning`);
    cy.login({ email: user.login, password: user.password });
    cy.visit('/ni/planning/auxiliaries');
  });

  it('should create event', () => {
    cy.get('#q-app').click(500, 500);
    cy.get('[data-cy=planning-search]').eq(1).click();
    cy.get('[data-cy=planning-search]').eq(1).type('{backspace}Auxiliary TEST{downarrow}{enter}');
    cy.get('[data-cy=planning-event]').should('have.length', 1);

    cy.get('[data-cy=planning-cell]').eq(0).click('bottom');
    cy.get('[data-cy=event-creation-customer]').eq(0).type('Romain{downarrow}{enter}');
    cy.get('[data-cy=event-creation-button]').click();
    cy.get('[data-cy=planning-event]').should('have.length', 2);
  });

  it('should update event', () => {
    cy.get('#q-app').click(500, 500);
    cy.get('[data-cy=planning-search]').eq(1).click();
    cy.get('[data-cy=planning-search]').eq(1).type('{backspace}Auxiliary TEST{downarrow}{enter}');
    cy.get('[data-cy=planning-event]').should('have.length', 1);
    cy.get('[data-cy=planning-event]').click();

    cy.get('[data-cy=time-input]').eq(0).clear().type('15:00');
    cy.get('[data-cy=time-input]').eq(1).clear().type('17:15');
    cy.get('[data-cy=event-edition-button]').click();

    cy.get('[data-cy=event-hours]').eq(0).should('contain', '15:00 - 17:15');
  });

  it('should delete event', () => {
    cy.get('#q-app').click(500, 500);
    cy.get('[data-cy=planning-search]').eq(1).click();
    cy.get('[data-cy=planning-search]').eq(1).type('{backspace}Auxiliary TEST{downarrow}{enter}');
    cy.get('[data-cy=planning-event]').should('have.length', 1);

    cy.get('[data-cy=planning-event]').click();
    cy.get('[data-cy=event-deletion-button]').click();
    cy.get('.q-dialog-plugin > .q-card__actions > .q-btn').eq(1).click();

    cy.get('[data-cy=planning-event]').should('have.length', 0);
  });
}));
