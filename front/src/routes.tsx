// src/routes.tsx
import { createBrowserRouter, redirect } from 'react-router-dom';
import Login from './views/Login';
import StudentDashboard from './views/Student/Dashboard';
import SupervisorDashboard from './views/Supervisor/Dashboard';
import ForgotPassword from './views/ForgotPassword';
import ResetPassword from './views/ResetPassword';
import SupervisorBulkStudents from './views/Supervisor/BulkStudents';
import PlayMenu from './views/Student/PlayMenu';
import { getProfile } from './services/users';
import SupervisorEditStudents from './views/Supervisor/AllStudents';
import UploadDiagram from './views/Supervisor/UploadDiagram';
import EditDiagram from './views/Supervisor/EditDiagram';
import VerifyQuestions from './views/Supervisor/VerifyQuestions';
import SupervisorTests from './views/Supervisor/AllDiagrams';
import ExamMode from './views/Student/ExamMode';
import LearningMode from './views/Student/LearningMode';
import Settings from './views/Student/Settings';
import MyQuestions from './views/Student/MyQuestions';
import NewQuestion from './views/Student/NewQuestion';
import MyTests from './views/Student/MyTests';
import MyProgress from './views/Student/MyProgress';
import StudentDetail from './views/Supervisor/StudentDetail';




async function requireRole(allowed: string[]) {
  try {
    const me = await getProfile();
    if (!allowed.includes(me.role)) throw new Error();
    return null;
  } catch {
    throw redirect('/login');
  }
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> }, 

  
  {
    path: '/student/dashboard',
    element: <StudentDashboard />,
    loader: () => requireRole(['alumno']),
  },
  {
    path: '/student/play-menu',
    element: <PlayMenu />,
    loader: () => requireRole(['alumno']),
  },

  {
    path: '/student/settings',
    element: <Settings />,
    loader: () => requireRole(['alumno']),

  },

  {
    path: '/student/questions',
    element: <MyQuestions />,
    loader: () => requireRole(['alumno']),
  },

  {
    path: '/student/play-exam',
    element: <ExamMode />,
    loader: () => requireRole(['alumno']),

  },

  {
    path: '/student/play-learning',
    element: <LearningMode />,
    loader: () => requireRole(['alumno']),

  },

  {
    path: '/student/questions/new',
    element: <NewQuestion />,
    loader: () => requireRole(['alumno']),
  },

  {
    path: '/student/my-tests',
    element: <MyTests />,
    loader: () => requireRole(['alumno']),
  },

  {
    path: '/student/progress',
    element: <MyProgress />,
    loader: () => requireRole(['alumno']),
  },


  {
    path: '/supervisor/dashboard',
    element: <SupervisorDashboard />,
    loader: () => requireRole(['supervisor']),
  },

  {
    path: '/supervisor/students/:studentId',
    element: <StudentDetail  />,
    loader: () => requireRole(['supervisor']),
  },
  {
    path: '/supervisor/users/batch',
    element: <SupervisorBulkStudents  />,
    loader: () => requireRole(['supervisor']),
  },
  {
    path: '/supervisor/users',
    element: <SupervisorEditStudents  />,
    loader: () => requireRole(['supervisor']),
  },

  {
    path: '/supervisor/diagrams/new',
    element: <UploadDiagram  />,
    loader: () => requireRole(['supervisor']),
  },

  {
    path: '/supervisor/tests',
    element: <SupervisorTests  />,
    loader: () => requireRole(['supervisor']),
  },

  {
    path: '/supervisor/questions/review',
    element: <VerifyQuestions />,
    loader: () => requireRole(['supervisor']),
  },
  {
    path: '/supervisor/diagrams/:id/edit',
    element: <EditDiagram />,
    loader: () => requireRole(['supervisor']),
  },

 
  
  




  { path: '*', loader: () => redirect('/login') },
]);
