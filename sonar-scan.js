const scanner = require('sonarqube-scanner');

const serverUrl = process.env.SONAR_HOST_URL || 'http://localhost:9000';
const token = process.env.SONARQUBE_TOKEN || 'sqp_5775759382f550c5e58d75caffc4d068caa5bead';

scanner(
  {
    serverUrl,
    token,
    options: {
      'sonar.projectKey': 'ERPLAY',
      'sonar.projectName': 'ERPLAY',
      'sonar.projectVersion': '1.0',
      'sonar.sources': 'front,back',
      'sonar.exclusions':
        '**/node_modules/**,**/dist/**,**/build/**,**/.next/**,**/coverage/**'
    }
  },
  () => process.exit()
);
