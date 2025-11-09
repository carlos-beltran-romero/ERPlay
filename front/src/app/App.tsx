import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { FloatingThemeToggle } from '../components/ThemeToggle';

/**
 * Punto de entrada del frontend con router y notificaciones.
 * @returns Jerarquía principal de la aplicación.
 * @public
 */
export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <FloatingThemeToggle />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar
          newestOnTop
          closeOnClick
          draggable
          pauseOnHover
          theme="colored"
          limit={3}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
