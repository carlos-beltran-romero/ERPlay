import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';

function AppContent() {
  const { theme } = useTheme();

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        theme={theme}
        limit={3}
      />
    </AuthProvider>
  );
}

/**
 * Punto de entrada del frontend con router y notificaciones.
 * @returns Jerarquía principal de la aplicación.
 * @public
 */
export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
