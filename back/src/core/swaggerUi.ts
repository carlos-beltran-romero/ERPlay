const SWAGGER_UI_CSS = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css';
const SWAGGER_UI_BUNDLE = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js';
const SWAGGER_UI_PRESET = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js';

export function renderSwaggerUi(specUrl: string) {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>ERPlay API Docs</title>
    <link rel="stylesheet" href="${SWAGGER_UI_CSS}" />
    <style>
      html, body { margin: 0; padding: 0; background: #0f172a; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_UI_BUNDLE}"></script>
    <script src="${SWAGGER_UI_PRESET}"></script>
    <script>
      window.onload = () => {
        window.SwaggerUIBundle({
          url: '${specUrl}',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [window.SwaggerUIBundle.presets.apis, window.SwaggerUIStandalonePreset],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`;
}
