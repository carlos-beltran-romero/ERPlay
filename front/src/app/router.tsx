import type { ReactElement } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import Login from '../views/Login';
import StudentDashboard from '../views/Student/Dashboard';
import SupervisorDashboard from '../views/Supervisor/Dashboard';
import ForgotPassword from '../views/ForgotPassword';
import ResetPassword from '../views/ResetPassword';
import SupervisorBulkStudents from '../views/Supervisor/BulkStudents';
import PlayMenu from '../views/Student/PlayMenu';
import { getProfile } from '../services/users';
import SupervisorEditStudents from '../views/Supervisor/AllStudents';
import UploadDiagram from '../views/Supervisor/UploadDiagram';
import EditDiagram from '../views/Supervisor/EditDiagram';
import VerifyQuestions from '../views/Supervisor/VerifyQuestions';
import SupervisorTests from '../views/Supervisor/AllDiagrams';
import ExamMode from '../views/Student/ExamMode';
import LearningMode from '../views/Student/LearningMode';
import Settings from '../views/Student/Settings';
import MyQuestions from '../views/Student/MyQuestions';
import NewQuestion from '../views/Student/NewQuestion';
import MyTests from '../views/Student/MyTests';
import MyProgress from '../views/Student/MyProgress';
import StudentDetail from '../views/Supervisor/StudentDetail';
import DiagramStats from '../views/Supervisor/DiagramSats';
import { getCachedProfile, setCachedProfile, clearProfileCache } from '../services/authCache';
import NotFound from '../views/NotFound';

/**
 * Valida que el usuario autenticado tenga un rol permitido.
 * @param allowed - Lista de roles autorizados.
 * @returns Promesa resuelta cuando la ruta es accesible.
 * @throws Redirección a login cuando el rol no es válido.
 * @internal
 */
async function requireRole(allowed: string[]) {
  const cached = getCachedProfile();
  if (cached && allowed.includes(cached.role)) {
    return null;
  }

  try {
    const me = await getProfile();
    setCachedProfile(me);
    if (!allowed.includes(me.role)) throw new Error('Rol no autorizado');
    return null;
  } catch {
    clearProfileCache();
    throw redirect('/login');
  }
}

/**
 * Redirige a la vista correspondiente cuando ya existe sesión.
 * @returns Redirección a dashboard de alumno o supervisor.
 * @internal
 */
async function redirectIfAuthenticated() {
  const cached = getCachedProfile();
  if (cached) {
    return redirect(cached.role === 'supervisor' ? '/supervisor/dashboard' : '/student/dashboard');
  }

  try {
    const me = await getProfile();
    setCachedProfile(me);
    return redirect(me.role === 'supervisor' ? '/supervisor/dashboard' : '/student/dashboard');
  } catch {
    clearProfileCache();
    return null;
  }
}

interface ProtectedRoute {
  path: string;
  element: ReactElement;
  roles: string[];
}

/**
 * Agrega protección por rol a una ruta.
 * @param route - Configuración de ruta y roles.
 * @returns Entrada lista para el router.
 * @internal
 */
function protect(route: ProtectedRoute) {
  return {
    path: route.path,
    element: route.element,
    loader: () => requireRole(route.roles),
  };
}

/**
 * Router principal con rutas públicas y protegidas.
 * @public
 */
export const router = createBrowserRouter([
  { path: '/login', element: <Login />, loader: redirectIfAuthenticated },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  protect({ path: '/student/dashboard', element: <StudentDashboard />, roles: ['alumno'] }),
  protect({ path: '/student/play-menu', element: <PlayMenu />, roles: ['alumno'] }),
  protect({ path: '/student/settings', element: <Settings />, roles: ['alumno'] }),
  protect({ path: '/student/questions', element: <MyQuestions />, roles: ['alumno'] }),
  protect({ path: '/student/play-exam', element: <ExamMode />, roles: ['alumno'] }),
  protect({ path: '/student/play-learning', element: <LearningMode />, roles: ['alumno'] }),
  protect({ path: '/student/questions/new', element: <NewQuestion />, roles: ['alumno'] }),
  protect({ path: '/student/my-tests', element: <MyTests />, roles: ['alumno'] }),
  protect({ path: '/student/progress', element: <MyProgress />, roles: ['alumno'] }),
  protect({ path: '/supervisor/dashboard', element: <SupervisorDashboard />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/students/:studentId', element: <StudentDetail />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/users/batch', element: <SupervisorBulkStudents />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/users', element: <SupervisorEditStudents />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/diagrams/new', element: <UploadDiagram />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/tests', element: <SupervisorTests />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/questions/review', element: <VerifyQuestions />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/diagrams/:id/edit', element: <EditDiagram />, roles: ['supervisor'] }),
  protect({ path: '/supervisor/diagrams/:id/stats', element: <DiagramStats />, roles: ['supervisor'] }),
  { path: '*', element: <NotFound /> },
]);
