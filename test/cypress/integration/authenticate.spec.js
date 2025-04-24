const { AUTHENTICATION } = require('../../../src/core/data/constants');

describe('Login page tests', () => {
  beforeEach(() => {
    cy.initiateTest({ seedType: AUTHENTICATION });
    cy.visit('/login');
  });

  it('should display an error if credentials are wrong', () => {
    cy.dataCy('email').type('client-admin@alenvi.io');
    cy.dataCy('password').type('3236{enter}');
    cy.get('.q-notification__message')
      .scrollIntoView()
      .should('be.visible')
      .and('contain', 'Identifiant ou mot de passe invalide');
    cy.url().should('include', '/login');
  });

  const paramsArray = [
    { person: 'client admin', email: 'client-admin@alenvi.io', password: '123456!eR', url: 'ni/courses' },
    { person: 'coach', email: 'coach@alenvi.io', password: '123456!eR', url: 'ni/courses' },
    { person: 'auxiliary', email: 'auxiliary@alenvi.io', password: '123456!eR', url: 'account' },
    {
      person: 'auxiliary without company',
      email: 'auxiliary-without-company@alenvi.io',
      password: '123456!eR',
      url: 'account',
    },
    { person: 'planning referent', email: 'planning-referent@alenvi.io', password: '123456!eR', url: 'account' },
    { person: 'helper', email: 'helper@alenvi.io', password: '123456!eR', url: 'account' },
    {
      person: 'vendor admin',
      email: 'vendor-admin@alenvi.io',
      password: '123456!eR',
      url: 'ad/ni/management/blended-courses',
    },
    {
      person: 'training organisation manager',
      email: 'training-organisation-manager@alenvi.io',
      password: '123456!eR',
      url: 'ad/ni/management/blended-courses',
    },
    { person: 'trainer', email: 'trainer@alenvi.io', password: '123456!eR', url: 'ad/trainers/management/courses' },
  ];

  paramsArray.forEach((params) => {
    it(`should visits login page and connects ${params.person} user`, () => {
      cy.dataCy('email').type(params.email);
      cy.dataCy('password').type(params.password);
      cy.dataCy('login').click();

      cy.url().should('include', params.url);
      cy.getCookie('alenvi_token').should('exist');
      cy.getCookie('refresh_token').should('exist');
    });
  });
});
