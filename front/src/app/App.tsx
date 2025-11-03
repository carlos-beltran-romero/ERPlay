import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function App() {
  return (
    <>
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
    </>
  );
}
