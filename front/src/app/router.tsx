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

async function requireRole(allowed: string[]) {
  try {
    const me = await getProfile();
    if (!allowed.includes(me.role)) throw new Error('Rol no autorizado');
    return null;
  } catch {
    throw redirect('/login');
  }
}

function protect(route: { path: string; element: ReactElement; roles: string[] }) {
  return {
    path: route.path,
    element: route.element,
    loader: () => requireRole(route.roles),
  };
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
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
  { path: '*', loader: () => redirect('/login') },
]);
