Cypress.Commands.overwrite('log', (subject, message) => cy.task('log', message));

Cypress.Commands.add('dataCy', value => cy.get(`[data-cy=${value}]`));
Cypress.Commands.add('initiateTest', (data) => {
  const { seedType, credentials } = data;
  cy.visit('/');
  cy.task('seedDb', seedType);

  if (credentials) {
    cy.task('login', credentials).then((resp) => {
      cy.setCookie('alenvi_token', `${resp.token}`);
      cy.setCookie('refresh_token', `${resp.refreshToken}`);
      cy.setCookie('user_id', `${resp.user._id}`);
    });
  }
});
