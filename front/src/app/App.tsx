import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./AuthContext";

/**
 * Punto de entrada del frontend con router y notificaciones.
 * @returns Jerarquía principal de la aplicación.
 * @public
 */
export function App() {
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
        theme="colored"
        limit={3}
      />
    </AuthProvider>
  );
}
