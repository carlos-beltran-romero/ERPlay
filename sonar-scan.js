const sonarqubeScanner = require('sonarqube-scanner');

sonarqubeScanner(
  {
    serverUrl: 'http://localhost:9000',
    token: 'sqp_5775759382f550c5e58d75caffc4d068caa5bead',
    options: {
      'sonar.projectName': 'ERPLAY',
      'sonar.projectKey': 'ERPLAY',
      'sonar.sources': 'back/src,front/src',
      'sonar.sourceEncoding': 'UTF-8',
      'sonar.exclusions': '**/node_modules/**',
    },
  },
  () => process.exit()
);
