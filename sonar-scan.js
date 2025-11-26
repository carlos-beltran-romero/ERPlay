const scanner = require('sonarqube-scanner');

scanner(
  {
    serverUrl: 'http://localhost:9000',
    token: 'sqp_5775759382f550c5e58d75caffc4d068caa5bead',
    options: {
      'sonar.projectKey': 'ERPLAY',
      'sonar.projectName': 'ERPLAY',
      'sonar.sources': '.',
    },
  },
  () => process.exit()
);
