import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { Toast } from "./components/UI";
import { useToast } from "./context/ToastContext";
import MeetingsPage from "./pages/MeetingsPage";
import MeetingDetailPage from "./pages/MeetingDetailPage";

function ToastWrapper() {
  const { toasts } = useToast();
  return <Toast toasts={toasts} />;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MeetingsPage />} />
          <Route path="/meeting/:id" element={<MeetingDetailPage />} />
        </Routes>
        <ToastWrapper />
      </BrowserRouter>
    </ToastProvider>
  );
}
