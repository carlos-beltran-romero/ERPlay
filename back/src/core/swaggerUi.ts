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
      html, body { margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }
      body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
      .swagger-ui { color: inherit; }
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info h2.title { color: #f8fafc; }
      .swagger-ui .info p, .swagger-ui .info li { color: inherit; }
      .swagger-ui .scheme-container { background: #1e293b; border-color: #334155; }
      .swagger-ui .opblock { background: #0f172a; border-color: #334155; }
      .swagger-ui .opblock .opblock-summary { background: #1e293b; }
      .swagger-ui .info .title small.version-stamp { background: #1e293b; border-color: #334155; }
      .swagger-ui .btn.authorize { background-color: #22c55e; border-color: #16a34a; color: #0f172a; }
      .swagger-ui .btn.authorize:hover { background-color: #16a34a; border-color: #15803d; }
      .swagger-ui .opblock-tag { color: #f1f5f9; }
      .swagger-ui .opblock-summary-description { color: #cbd5f5; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_UI_BUNDLE}"></script>
    <script src="${SWAGGER_UI_PRESET}"></script>
    <script>
      window.onload = () => {
        const ui = window.SwaggerUIBundle({
          url: '${specUrl}',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [window.SwaggerUIBundle.presets.apis, window.SwaggerUIStandalonePreset],
          layout: 'BaseLayout'
        });

        window.ui = ui;
      };
    </script>
  </body>
</html>`;
}
