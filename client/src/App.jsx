import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "./context/AuthContext";

import LoginPage from "./components/loginPage/LoginPage";
import HomePage from "./components/homePage/HomePage";

import ProfilePageF from "./components/FriendsProfilePage/ProfilePageF";
import ProfilePage from "./components/ProfilePage/ProfilePage";
import LoadingPage from "./components/LoadingPage/LoadingPage";

function App() {
  const { authUser, authLoading } = useContext(AuthContext);

  if (authLoading) return <LoadingPage />;

  return (
    <div>
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={ authUser ? <HomePage /> : <LoginPage /> }
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route path="/friendprofile"
        element={authUser ? <ProfilePageF /> : <Navigate to="/login" />}/>
      </Routes>
    </div>
  );
}

export default App;
