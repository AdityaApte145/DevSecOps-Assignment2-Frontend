import React, { useState, useEffect } from 'react';
import { CreateCourse } from './components/courses';
import Login from './components/Login';
import Register from './components/Register';
import StudentList from './components/TeacherDashboard';
import StudentGrades from './components/StudentDashboard';

interface User {
  id: number;
  username: string;
  role: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  teacher_name: string;
  enrolled?: boolean;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('login');
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(null);
  const [enrollingCourse, setEnrollingCourse] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = JSON.parse(atob(token.split('.')[1]));
            setUser(userData);
            setCurrentView('dashboard');

            const coursesData = await response.json();

            // 💣 INTENTIONAL VULNERABILITY SEED (for ZAP)
            const injectedCourses = Array.isArray(coursesData)
              ? coursesData
              : [];

            injectedCourses.unshift({
              id: 999,
              title: "Security Training",
              teacher_id: 1,
              teacher_name: "Admin",
              description: `<img src=x onerror="alert('ZAP_XSS_DETECTED')" />`
            });

            setCourses(injectedCourses);
          } else {
            localStorage.removeItem('token');
            setCurrentView('login');
          }
        } catch (error) {
          console.error(error);
          localStorage.removeItem('token');
          setCurrentView('login');
        }
      }

      setIsLoading(false);
    };

    initializeSession();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch courses');

      const data = await response.json();

      const injectedCourses = Array.isArray(data) ? data : [];

      injectedCourses.unshift({
        id: 999,
        title: "Security Training",
        teacher_id: 1,
        teacher_name: "Admin",
        description: `<svg onload="alert('ZAP_XSS_DETECTED')" />`
      });

      setCourses(injectedCourses);

    } catch (error) {
      console.error(error);
      setError('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchCourses();
  }, [user]);

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        const userData = JSON.parse(atob(data.token.split('.')[1]));
        setUser(userData);
        setCurrentView('dashboard');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentView('login');
    setCourses([]);
    setSelectedCourse(null);
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView(user?.role === 'teacher' ? 'teacherCourse' : 'studentCourse');
  };

  const renderCourseList = () => {
    if (!courses.length) {
      return <div className="text-center p-4">No courses available.</div>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <div key={course.id} className="border rounded-lg p-4 shadow">

            <h3 className="text-xl font-bold">{course.title}</h3>

            {/* 💣 XSS VULNERABILITY HERE */}
            <p
              className="mb-3"
              dangerouslySetInnerHTML={{ __html: course.description }}
            />

            <p className="text-sm text-gray-500">
              Instructor: {course.teacher_name}
            </p>

            <button
              onClick={() => handleCourseSelect(course)}
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
            >
              Open
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {user && (
        <div className="bg-white p-4 shadow flex justify-between">
          <span>{user.username} ({user.role})</span>
          <button onClick={handleLogout} className="text-red-500">
            Logout
          </button>
        </div>
      )}

      {currentView === 'login' && (
        <Login
          onLogin={handleLogin}
          onSwitchToRegister={() => setCurrentView('register')}
        />
      )}

      {currentView === 'register' && (
        <Register
          onRegister={() => setCurrentView('login')}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}

      {(currentView === 'dashboard' ||
        currentView === 'teacherCourse' ||
        currentView === 'studentCourse') && (
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Courses</h2>
          {renderCourseList()}
        </div>
      )}

    </div>
  );
};

export default App;